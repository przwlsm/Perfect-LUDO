import {
  ClipOp,
  FilterMode,
  MipmapMode,
  Skia,
  TextAlign,
  TextDirection,
  type SkCanvas,
  type SkImage,
  type SkParagraph,
  type SkPath,
  type SkTypefaceFontProvider,
} from '@shopify/react-native-skia';
import { random } from 'app-kit';
import { effectiveType, paletteIndex } from '@/application/card';
import {
  cardSize,
  fitStack,
  photoCover,
  photoHeight,
  textZone,
  type Rect,
  type StackItem,
} from '@/application/layout';
import { signOff } from '@/application/messages';
import type { CardSpec } from '@/domain/entities/Card';
import { LANGUAGE_INFO } from '@/domain/entities/Language';
import type { CardPalette, Template } from '@/domain/entities/Template';
import { FAMILY, fontFor, type FontChoice } from '../fonts';
import { DESIGNS } from './designs';
import { archPath, blurred, col, fill, glow, mix, path, stroke, type Ctx, type Point } from './kit';

export interface PaintInput {
  readonly spec: CardSpec;
  readonly template: Template;
  /** Plus decides whether the sender's lettering choice applies. */
  readonly plus: boolean;
  readonly fonts: SkTypefaceFontProvider;
  /** The sender's photo, decoded; null while loading or when there is none. */
  readonly photo: SkImage | null;
}

export function paletteOf(input: Pick<PaintInput, 'spec' | 'template'>): CardPalette {
  return input.template.palettes[paletteIndex(input.template, input.spec.palette)]!;
}

/** A stable seed per template, palette and size, so a card always paints the same. */
function seedOf(spec: CardSpec): number {
  let h = 2166136261;
  for (const ch of `${spec.templateId}|${spec.palette}|${spec.format}`) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Paints the background art. Returns the points the live preview animates. */
export function paintBack(c: SkCanvas, input: PaintInput): { fx: Point[]; lights: Point[] } {
  const { spec, template } = input;
  const { w, h } = cardSize(spec.format);
  const ctx: Ctx = {
    c,
    W: w,
    H: h,
    pal: paletteOf(input),
    occasion: template.occasion,
    layout: template.layout,
    zone: textZone(template.layout, spec.format),
    story: spec.format === 'story',
    rnd: random(seedOf(spec)),
    fx: [],
    lights: [],
  };
  c.save();
  c.clipRect(Skia.XYWHRect(0, 0, w, h), ClipOp.Intersect, true);
  DESIGNS[template.design].paint(ctx);
  c.restore();
  return { fx: ctx.fx, lights: ctx.lights };
}

interface Block {
  readonly kind: 'photo' | 'headline' | 'divider' | 'message' | 'sign';
  readonly y: number;
  readonly height: number;
  readonly paragraph?: SkParagraph;
}

export interface CardLayout {
  readonly blocks: readonly Block[];
  /** The photo frame, in card units. */
  readonly photo: Rect | null;
  readonly zone: Rect;
  /** Left edge and width the paragraphs were laid out at. */
  readonly x: number;
  readonly width: number;
  readonly W: number;
  readonly H: number;
}

function paragraph(
  fonts: SkTypefaceFontProvider,
  text: string,
  font: FontChoice,
  size: number,
  color: string,
  rtl: boolean,
  width: number,
  shadows: { color: string; a: number; blur: number; dy?: number }[],
  letterSpacing = 0,
): SkParagraph {
  const builder = Skia.ParagraphBuilder.Make(
    {
      textAlign: TextAlign.Center,
      textDirection: rtl ? TextDirection.RTL : TextDirection.LTR,
    },
    fonts,
  );
  builder.pushStyle({
    color: Skia.Color(color),
    fontFamilies: font.families,
    fontSize: size * font.scale,
    heightMultiplier: font.height,
    letterSpacing,
    wordSpacing: (font.wordSpacing ?? 0) * size * font.scale,
    shadows: shadows.map((s) => ({
      color: col(s.color, s.a),
      blurRadius: s.blur,
      offset: { x: 0, y: s.dy ?? 0 },
    })),
  });
  builder.addText(text);
  builder.pop();
  const p = builder.build();
  p.layout(width);
  return p;
}

/** Characters a line may break after or before: spaces, hyphens and dashes, slashes. */
const BREAKABLE = /[\s\-‐-—/]/;

/** True when a line ends inside a word (the word was too long for the width). */
function breaksWord(lines: readonly { endIndex: number }[], text: string): boolean {
  for (let i = 0; i < lines.length - 1; i++) {
    const end = lines[i]!.endIndex;
    if (end <= 0 || end >= text.length) continue;
    if (!BREAKABLE.test(text[end - 1]!) && !BREAKABLE.test(text[end]!)) return true;
  }
  return false;
}

/**
 * Sizes and places the card's words (and photo frame) inside the
 * template's zone. Everything shrinks together until it fits.
 */
export function layoutCard(input: PaintInput): CardLayout {
  const { spec, template, fonts } = input;
  const pal = paletteOf(input);
  const { w: W, h: H } = cardSize(spec.format);
  const zone = textZone(template.layout, spec.format);
  const story = spec.format === 'story';
  const style = effectiveType(spec, template, input.plus);
  const info = LANGUAGE_INFO[spec.language];
  const width = zone.w;
  const x = zone.x;
  const glowShadow = pal.dark
    ? [{ color: pal.glow, a: 0.35, blur: 16 }]
    : [{ color: '#ffffff', a: 0.75, blur: 10 }];
  const softShadow = pal.dark
    ? [{ color: '#000000', a: 0.5, blur: 8, dy: 2 }]
    : [{ color: '#ffffff', a: 0.85, blur: 8 }];

  const headlineFont = fontFor(spec.language, style, 'headline');
  const bodyFont = fontFor(spec.language, style, 'body');
  const signFont = fontFor(spec.language, style, 'sign');
  const sign = signOff(spec.language, spec.from);
  const headline = spec.headline.trim();
  const message = spec.message.trim();

  const made = new Map<string, SkParagraph>();
  const text = (
    key: string,
    content: string,
    font: FontChoice,
    color: string,
    shadows: typeof glowShadow,
    maxLines: number,
    w = width,
    spacing = 0,
  ) => {
    return (size: number) => {
      const p = paragraph(fonts, content, font, size, color, info.rtl, w, shadows, spacing);
      made.set(`${key}@${size}`, p);
      const lines = p.getLineMetrics();
      const fits =
        lines.length <= maxLines &&
        p.getMinIntrinsicWidth() <= w + 0.5 &&
        !breaksWord(lines, content) &&
        lines.every((l) => l.width <= w + 1);
      return { height: p.getHeight(), fits };
    };
  };

  const items: StackItem[] = [];
  const shape = spec.photo?.shape ?? 'circle';
  if (spec.photo) {
    const max = Math.min(width * (story ? 0.52 : 0.44), zone.h * 0.48);
    items.push({
      key: 'photo',
      min: Math.min(width * 0.24, max),
      max,
      gap: story ? 40 : 28,
      measure: (size) => ({ height: photoHeight(shape, size), fits: true }),
    });
  }
  if (headline) {
    items.push({
      key: 'headline',
      min: 50,
      max: story ? 136 : 118,
      gap: message ? 10 : 18,
      measure: text(
        'headline',
        headline,
        headlineFont,
        pal.ink,
        glowShadow,
        style === 'script' && info.script === 'latin' ? 2 : 3,
        width,
        headlineFont.families[0] === FAMILY.yatra ? 0.5 : 0,
      ),
    });
  }
  if (headline && message) {
    items.push({
      key: 'divider',
      min: 30,
      max: 30,
      gap: 14,
      measure: () => ({ height: 30, fits: true }),
    });
  }
  if (message) {
    items.push({
      key: 'message',
      min: 27,
      max: story ? 58 : 48,
      gap: 26,
      measure: text(
        'message',
        message,
        bodyFont,
        pal.text,
        softShadow,
        story ? 11 : 8,
        width * 0.94,
      ),
    });
  }
  if (sign) {
    items.push({
      key: 'sign',
      min: 28,
      max: story ? 50 : 42,
      gap: 0,
      measure: text('sign', sign, signFont, pal.dark ? pal.gold : pal.ink, softShadow, 2),
    });
  }
  const placed = fitStack(items, zone);
  let photo: Rect | null = null;
  const blocks: Block[] = placed.map((p) => {
    const kind = p.key as Block['kind'];
    if (kind === 'photo') {
      photo = { x: W / 2 - p.size / 2, y: p.y, w: p.size, h: p.height };
      return { kind, y: p.y, height: p.height };
    }
    const para = made.get(`${p.key}@${p.size}`);
    return { kind, y: p.y, height: p.height, paragraph: para };
  });
  return { blocks, photo, zone, x, width, W, H };
}

export function photoClip(frame: Rect, shape: 'circle' | 'arch'): SkPath {
  return shape === 'arch'
    ? archPath(frame)
    : path((b) => b.addCircle(frame.x + frame.w / 2, frame.y + frame.h / 2, frame.w / 2));
}

/** The sender's photo, clipped to its frame. */
export function paintPhoto(c: SkCanvas, input: PaintInput, layout: CardLayout): void {
  const frame = layout.photo;
  const spec = input.spec.photo;
  if (!frame || !spec) return;
  const clip = photoClip(frame, spec.shape);
  c.save();
  c.clipPath(clip, ClipOp.Intersect, true);
  const pal = paletteOf(input);
  c.drawRect(
    Skia.XYWHRect(frame.x, frame.y, frame.w, frame.h),
    fill(mix(pal.bg[0], pal.gold, 0.25)),
  );
  if (input.photo) {
    const img = input.photo;
    const dest = photoCover(img.width(), img.height(), frame, spec.zoom, spec.x, spec.y);
    const p = Skia.Paint();
    p.setAntiAlias(true);
    c.drawImageRectOptions(
      img,
      Skia.XYWHRect(0, 0, img.width(), img.height()),
      Skia.XYWHRect(dest.x, dest.y, dest.w, dest.h),
      FilterMode.Linear,
      MipmapMode.Linear,
      p,
    );
  }
  c.restore();
}

/** The frame ring, the halo and the words. Drawn over the art and the photo. */
export function paintFront(c: SkCanvas, input: PaintInput, layout: CardLayout): void {
  const pal = paletteOf(input);
  const design = DESIGNS[input.template.design];
  const words = layout.blocks.filter((b) => b.kind !== 'photo');
  if (design.halo > 0 && words.length > 0) {
    const top = words[0]!.y;
    const last = words[words.length - 1]!;
    const bottom = last.y + last.height;
    const cx = layout.W / 2;
    const cy = (top + bottom) / 2;
    const rx = layout.width * 0.62;
    const ry = (bottom - top) * 0.75 + 40;
    const tone = pal.dark ? pal.bg[1] : pal.bg[0];
    c.save();
    c.translate(cx, cy);
    c.scale(1, ry / rx);
    c.drawCircle(0, 0, rx, glowPaint(tone, design.halo, rx));
    c.restore();
  }
  if (layout.photo && input.spec.photo) {
    const frame = layout.photo;
    const clip = photoClip(frame, input.spec.photo.shape);
    c.drawPath(clip, stroke(pal.gold, Math.max(5, frame.w * 0.028)));
    const outer =
      input.spec.photo.shape === 'arch'
        ? archPath({ x: frame.x - 14, y: frame.y - 14, w: frame.w + 28, h: frame.h + 14 })
        : path((b) => b.addCircle(frame.x + frame.w / 2, frame.y + frame.h / 2, frame.w / 2 + 14));
    c.drawPath(outer, stroke(pal.gold, 2, 0.6));
  }
  for (const block of layout.blocks) {
    if (block.kind === 'divider') {
      const y = block.y + block.height / 2;
      const cx = layout.W / 2;
      const line = stroke(pal.gold, 2.4, 0.9);
      c.drawLine(cx - 96, y, cx - 22, y, line);
      c.drawLine(cx + 22, y, cx + 96, y, line);
      c.drawPath(
        path((b) => {
          b.moveTo(cx, y - 10);
          b.lineTo(cx + 10, y);
          b.lineTo(cx, y + 10);
          b.lineTo(cx - 10, y);
          b.close();
        }),
        fill(pal.gold),
      );
      c.drawCircle(cx - 104, y, 3.5, fill(pal.gold));
      c.drawCircle(cx + 104, y, 3.5, fill(pal.gold));
    } else if (block.paragraph) {
      const w = block.paragraph.getMaxWidth();
      block.paragraph.paint(c, layout.W / 2 - w / 2, block.y);
    }
  }
}

function glowPaint(color: string, a: number, r: number) {
  const p = Skia.Paint();
  p.setAntiAlias(true);
  p.setShader(
    Skia.Shader.MakeRadialGradient(
      { x: 0, y: 0 },
      r,
      [col(color, a), col(color, a * 0.85), col(color, 0)],
      [0, 0.55, 1],
      0,
    ),
  );
  return p;
}

/** The small "Utsav" mark on cards shared without Plus: how friends find the app. */
export function paintWatermark(c: SkCanvas, input: PaintInput, label: string): void {
  const pal = paletteOf(input);
  const { w: W, h: H } = cardSize(input.spec.format);
  const color = pal.dark ? '#fff6e4' : pal.ink;
  const p = paragraph(
    input.fonts,
    label,
    { families: [FAMILY.yatra], scale: 1, height: 1 },
    30,
    color,
    false,
    400,
    pal.dark ? [{ color: '#000000', a: 0.5, blur: 6 }] : [{ color: '#ffffff', a: 0.8, blur: 6 }],
    0.5,
  );
  const tw = p.getLongestLine();
  const x = W - 34 - tw;
  const y = H - 30 - p.getHeight();
  // A soft clearing in the card's own colour, so the mark stays legible over busy borders.
  const ph = p.getHeight();
  c.drawRRect(
    Skia.RRectXY(Skia.XYWHRect(x - 56, y - 6, tw + 72, ph + 12), (ph + 12) / 2, (ph + 12) / 2),
    blurred(fill(pal.bg[1], 0.9), 9),
  );
  c.save();
  c.translate(x - 30, y + ph / 2);
  glow(c, 0, 0, 20, pal.glow, 0.5);
  c.drawPath(
    path((b) => {
      b.moveTo(0, -14);
      b.cubicTo(7, -6, 9, 4, 0, 10);
      b.cubicTo(-9, 4, -7, -6, 0, -14);
      b.close();
    }),
    fill(pal.dark ? '#ffd36b' : pal.accent, 0.9),
  );
  c.restore();
  // Paragraphs paint fully opaque; the mark should be quiet, so draw it on a faded layer.
  const layer = Skia.Paint();
  layer.setAlphaf(0.72);
  c.saveLayer(layer);
  p.paint(c, x - (p.getMaxWidth() - tw) / 2, y);
  c.restore();
}

/** The whole card, as it is exported: art, photo, words, and the mark if any. */
export function paintCard(c: SkCanvas, input: PaintInput, watermark: string | null): void {
  paintBack(c, input);
  const layout = layoutCard(input);
  paintPhoto(c, input, layout);
  paintFront(c, input, layout);
  if (watermark) paintWatermark(c, input, watermark);
}
