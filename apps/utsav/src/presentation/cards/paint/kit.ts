import {
  BlendMode,
  BlurStyle,
  PaintStyle,
  Skia,
  StrokeCap,
  StrokeJoin,
  TileMode,
  type SkCanvas,
  type SkColor,
  type SkPaint,
  type SkPath,
  type SkPathBuilder,
} from '@shopify/react-native-skia';
import { mix, withAlpha } from 'app-kit';
import type { Rect } from '@/application/layout';
import type { OccasionId } from '@/domain/entities/Occasion';
import type { CardPalette, LayoutKind } from '@/domain/entities/Template';

export { mix };

export interface Point {
  readonly x: number;
  readonly y: number;
}

/** Everything a design needs to paint: the canvas in 1080-wide card units. */
export interface Ctx {
  readonly c: SkCanvas;
  readonly W: number;
  readonly H: number;
  readonly pal: CardPalette;
  readonly occasion: OccasionId;
  readonly layout: LayoutKind;
  /** Where the words sit; art keeps clear of it. */
  readonly zone: Rect;
  readonly story: boolean;
  /** Seeded, so a card always paints the same. */
  readonly rnd: () => number;
  /** Points the live preview twinkles (sparkles, bulbs, bursts). */
  readonly fx: Point[];
  /** Flames and lamps the live preview makes flicker. */
  readonly lights: Point[];
}

export const TAU = Math.PI * 2;
export const RAD = Math.PI / 180;

export function col(hex: string, a = 1): SkColor {
  return Skia.Color(a >= 1 ? hex : withAlpha(hex, Math.max(0, a)));
}

export function fill(color: string, a = 1): SkPaint {
  const p = Skia.Paint();
  p.setAntiAlias(true);
  p.setColor(col(color, a));
  return p;
}

export function stroke(color: string, width: number, a = 1): SkPaint {
  const p = fill(color, a);
  p.setStyle(PaintStyle.Stroke);
  p.setStrokeWidth(width);
  p.setStrokeCap(StrokeCap.Round);
  p.setStrokeJoin(StrokeJoin.Round);
  return p;
}

export function blurred(p: SkPaint, sigma: number): SkPaint {
  p.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, sigma, true));
  return p;
}

export function radial(
  x: number,
  y: number,
  r: number,
  colors: readonly SkColor[],
  stops: number[] | null = null,
): SkPaint {
  const p = Skia.Paint();
  p.setAntiAlias(true);
  p.setShader(
    Skia.Shader.MakeRadialGradient({ x, y }, Math.max(0.01, r), [...colors], stops, TileMode.Clamp),
  );
  return p;
}

export function linear(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  colors: readonly SkColor[],
  stops: number[] | null = null,
): SkPaint {
  const p = Skia.Paint();
  p.setAntiAlias(true);
  p.setShader(
    Skia.Shader.MakeLinearGradient(
      { x: x0, y: y0 },
      { x: x1, y: y1 },
      [...colors],
      stops,
      TileMode.Clamp,
    ),
  );
  return p;
}

export function path(build: (b: SkPathBuilder) => void): SkPath {
  const b = Skia.PathBuilder.Make();
  build(b);
  return b.build();
}

/** A soft round light that fades to nothing. */
export function glow(c: SkCanvas, x: number, y: number, r: number, color: string, a: number): void {
  c.drawCircle(
    x,
    y,
    r,
    radial(x, y, r, [col(color, a), col(color, a * 0.45), col(color, 0)], [0, 0.4, 1]),
  );
}

export function inZone(ctx: Ctx, x: number, y: number, margin = 0): boolean {
  const z = ctx.zone;
  return x > z.x - margin && x < z.x + z.w + margin && y > z.y - margin && y < z.y + z.h + margin;
}

/** Random points over the card, kept out of the words' zone. */
export function scatter(
  ctx: Ctx,
  count: number,
  margin = 30,
  area: Rect = { x: 0, y: 0, w: ctx.W, h: ctx.H },
): Point[] {
  const out: Point[] = [];
  for (let tries = 0; out.length < count && tries < count * 30; tries++) {
    const x = area.x + ctx.rnd() * area.w;
    const y = area.y + ctx.rnd() * area.h;
    if (!inZone(ctx, x, y, margin)) out.push({ x, y });
  }
  return out;
}

export function between(ctx: Ctx, lo: number, hi: number): number {
  return lo + ctx.rnd() * (hi - lo);
}

export function pick<T>(ctx: Ctx, list: readonly T[]): T {
  return list[Math.floor(ctx.rnd() * list.length) % list.length]!;
}

/** A four-pointed twinkle with a soft halo. */
export function sparkle(c: SkCanvas, x: number, y: number, r: number, color: string, a = 1): void {
  glow(c, x, y, r * 1.6, color, 0.35 * a);
  const s = r * 0.16;
  const star = path((b) => {
    b.moveTo(x, y - r);
    b.quadTo(x + s, y - s, x + r, y);
    b.quadTo(x + s, y + s, x, y + r);
    b.quadTo(x - s, y + s, x - r, y);
    b.quadTo(x - s, y - s, x, y - r);
    b.close();
  });
  c.drawPath(star, fill(color, a));
}

/** A five-pointed star. */
export function star5(
  b: SkPathBuilder,
  x: number,
  y: number,
  r: number,
  inner = 0.45,
  rot = -90,
): void {
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 === 0 ? r : r * inner;
    const a = (rot + i * 36) * RAD;
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr;
    if (i === 0) b.moveTo(px, py);
    else b.lineTo(px, py);
  }
  b.close();
}

/**
 * A teardrop petal from (x, y) pointing at `angle` (radians), `len` long
 * and `width` wide at its fullest.
 */
export function petal(
  b: SkPathBuilder,
  x: number,
  y: number,
  len: number,
  width: number,
  angle: number,
  round = 0.62,
): void {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const P = (u: number, v: number) => [x + cos * u - sin * v, y + sin * u + cos * v] as const;
  const [tx, ty] = P(len, 0);
  const near = len * 0.3;
  const far = len * (0.5 + round * 0.45);
  const [l1x, l1y] = P(near, -width * 0.5);
  const [l2x, l2y] = P(far, -width * 0.66);
  const [r1x, r1y] = P(far, width * 0.66);
  const [r2x, r2y] = P(near, width * 0.5);
  b.moveTo(x, y);
  b.cubicTo(l1x, l1y, l2x, l2y, tx, ty);
  b.cubicTo(r1x, r1y, r2x, r2y, x, y);
  b.close();
}

/** A pointed leaf (both ends sharp), centred on (x, y). */
export function leaf(
  b: SkPathBuilder,
  x: number,
  y: number,
  len: number,
  width: number,
  angle: number,
): void {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const P = (u: number, v: number) => [x + cos * u - sin * v, y + sin * u + cos * v] as const;
  const [ax, ay] = P(-len / 2, 0);
  const [bx, by] = P(len / 2, 0);
  const [c1x, c1y] = P(-len * 0.15, -width);
  const [c2x, c2y] = P(len * 0.15, width);
  b.moveTo(ax, ay);
  b.quadTo(c1x, c1y, bx, by);
  b.quadTo(c2x, c2y, ax, ay);
  b.close();
}

export function heart(b: SkPathBuilder, x: number, y: number, size: number): void {
  const s = size / 2;
  b.moveTo(x, y + s * 0.95);
  b.cubicTo(x - s * 1.3, y + s * 0.1, x - s * 1.05, y - s * 1.0, x, y - s * 0.4);
  b.cubicTo(x + s * 1.05, y - s * 1.0, x + s * 1.3, y + s * 0.1, x, y + s * 0.95);
  b.close();
}

/** Points along a hanging string (a catenary-like sag) from a to b. */
export function sagPoints(a: Point, b: Point, sag: number, count: number): Point[] {
  const out: Point[] = [];
  for (let i = 0; i <= count; i++) {
    const t = i / count;
    out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t + sag * 4 * t * (1 - t) });
  }
  return out;
}

export function polyline(points: readonly Point[]): SkPath {
  return path((b) => {
    points.forEach((p, i) => (i === 0 ? b.moveTo(p.x, p.y) : b.lineTo(p.x, p.y)));
  });
}

/** Paints `fn` rotated by `deg` around (x, y). */
export function rotated(c: SkCanvas, x: number, y: number, deg: number, fn: () => void): void {
  c.save();
  c.rotate(deg, x, y);
  fn();
  c.restore();
}

/** An arch window: straight sides and a round top. */
export function archPath(r: Rect): SkPath {
  return path((b) => {
    b.moveTo(r.x, r.y + r.h);
    b.lineTo(r.x, r.y + r.w / 2);
    b.arcToOval(Skia.XYWHRect(r.x, r.y, r.w, r.w), 180, 180, false);
    b.lineTo(r.x + r.w, r.y + r.h);
    b.close();
  });
}

/** A Mughal (ogee) arch: straight sides, shoulders, and a pointed top. */
export function ogeePath(r: Rect, shoulder = 0.32): SkPath {
  const top = r.y;
  const sh = r.y + r.w * shoulder;
  const cx = r.x + r.w / 2;
  return path((b) => {
    b.moveTo(r.x, r.y + r.h);
    b.lineTo(r.x, sh + r.w * 0.12);
    b.cubicTo(
      r.x,
      sh - r.w * 0.08,
      cx - r.w * 0.3,
      sh - r.w * 0.06,
      cx - r.w * 0.12,
      top + r.w * 0.12,
    );
    b.quadTo(cx - r.w * 0.04, top + r.w * 0.04, cx, top);
    b.quadTo(cx + r.w * 0.04, top + r.w * 0.04, cx + r.w * 0.12, top + r.w * 0.12);
    b.cubicTo(
      cx + r.w * 0.3,
      sh - r.w * 0.06,
      r.x + r.w,
      sh - r.w * 0.08,
      r.x + r.w,
      sh + r.w * 0.12,
    );
    b.lineTo(r.x + r.w, r.y + r.h);
    b.close();
  });
}

/**
 * The card's ground: the palette gradient, a soft light, a vignette, and a
 * fine grain (paper by day, dust by night) so flat colour never looks cheap.
 */
export function background(
  ctx: Ctx,
  light: { x: number; y: number; r: number; a?: number } = { x: 0.5, y: 0.35, r: 0.8 },
): void {
  const { c, W, H, pal } = ctx;
  c.drawRect(
    Skia.XYWHRect(0, 0, W, H),
    linear(0, 0, W * 0.25, H, [col(pal.bg[0]), col(pal.bg[1])]),
  );
  const lx = light.x * W;
  const ly = light.y * H;
  const lr = light.r * Math.max(W, H);
  c.drawRect(
    Skia.XYWHRect(0, 0, W, H),
    radial(lx, ly, lr, [col(pal.glow, light.a ?? (pal.dark ? 0.16 : 0.32)), col(pal.glow, 0)]),
  );
  const edge = pal.dark ? '#000000' : mix(pal.bg[1], pal.accent, 0.25);
  c.drawRect(
    Skia.XYWHRect(0, 0, W, H),
    radial(
      W / 2,
      H / 2,
      Math.hypot(W, H) * 0.62,
      [col(edge, 0), col(edge, 0), col(edge, pal.dark ? 0.45 : 0.18)],
      [0, 0.55, 1],
    ),
  );
  const grain = Skia.Paint();
  grain.setAntiAlias(false);
  const n = Math.round((W * H) / 900);
  for (let i = 0; i < n; i++) {
    const x = ctx.rnd() * W;
    const y = ctx.rnd() * H;
    grain.setColor(col(pal.dark ? '#ffffff' : '#5a3a20', 0.018 + ctx.rnd() * 0.03));
    c.drawRect(Skia.XYWHRect(x, y, 1.6, 1.6), grain);
  }
}

/** Little lights scattered outside the words. */
export function starDust(ctx: Ctx, count: number, color: string, area?: Rect, maxR = 16): void {
  for (const p of scatter(ctx, count, 40, area)) {
    const r = 4 + ctx.rnd() * maxR;
    if (ctx.rnd() < 0.45) sparkle(ctx.c, p.x, p.y, r, color, 0.5 + ctx.rnd() * 0.5);
    else ctx.c.drawCircle(p.x, p.y, r * 0.22, fill(color, 0.35 + ctx.rnd() * 0.5));
    if (ctx.rnd() < 0.5) ctx.fx.push(p);
  }
}

/** A thin double gold frame with small diamond corners. */
export function goldFrame(ctx: Ctx, inset = 38, a = 0.85): void {
  const { c, W, H, pal } = ctx;
  c.drawRect(Skia.XYWHRect(inset, inset, W - inset * 2, H - inset * 2), stroke(pal.gold, 3, a));
  const i2 = inset + 12;
  c.drawRect(Skia.XYWHRect(i2, i2, W - i2 * 2, H - i2 * 2), stroke(pal.gold, 1.4, a * 0.7));
  for (const [x, y] of [
    [inset, inset],
    [W - inset, inset],
    [inset, H - inset],
    [W - inset, H - inset],
  ] as const) {
    const d = path((b) => {
      b.moveTo(x, y - 14);
      b.lineTo(x + 14, y);
      b.lineTo(x, y + 14);
      b.lineTo(x - 14, y);
      b.close();
    });
    c.drawPath(d, fill(pal.gold, a));
    c.drawCircle(x, y, 4, fill(pal.bg[0]));
  }
}

/** Clears pixels under `fn`'s shapes (to cut a crescent from a disc, say). */
export function cutOut(c: SkCanvas, fn: (eraser: SkPaint) => void): void {
  const eraser = Skia.Paint();
  eraser.setAntiAlias(true);
  eraser.setBlendMode(BlendMode.Clear);
  fn(eraser);
}

/** Marigold: a ruffled orange or yellow ball. */
export function marigold(
  c: SkCanvas,
  x: number,
  y: number,
  r: number,
  hue: 'orange' | 'yellow',
  rnd: () => number,
): void {
  const base = hue === 'orange' ? '#f57c00' : '#ffb300';
  const light = hue === 'orange' ? '#ffb04a' : '#ffe082';
  const dark = hue === 'orange' ? '#c75400' : '#e08e00';
  c.drawCircle(x, y + r * 0.12, r * 1.02, fill('#000000', 0.12));
  c.drawCircle(
    x,
    y,
    r,
    radial(x - r * 0.3, y - r * 0.35, r * 1.4, [col(light), col(base), col(dark)], [0, 0.55, 1]),
  );
  const ruffle = stroke(dark, r * 0.12, 0.55);
  for (let i = 0; i < 9; i++) {
    const a = rnd() * TAU;
    const rr = r * (0.3 + rnd() * 0.55);
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr;
    c.drawArc(
      Skia.XYWHRect(px - r * 0.2, py - r * 0.2, r * 0.4, r * 0.4),
      a / RAD - 60,
      120,
      false,
      ruffle,
    );
  }
  c.drawCircle(x - r * 0.3, y - r * 0.35, r * 0.22, fill('#ffffff', 0.22));
}

/** A clay diya with its flame; returns the flame's centre. */
export function diya(
  c: SkCanvas,
  cx: number,
  baseY: number,
  w: number,
  pal: CardPalette,
  tone: 'clay' | 'brass' = 'clay',
): Point {
  const h = w * 0.36;
  const top = baseY - h;
  const flame = { x: cx + w * 0.36, y: top - w * 0.3 };
  glow(c, flame.x, flame.y, w * 1.25, pal.glow, pal.dark ? 0.55 : 0.4);
  glow(c, cx, baseY + h * 0.2, w * 0.9, pal.glow, 0.18);
  // Shadow on the ground.
  c.drawOval(
    Skia.XYWHRect(cx - w * 0.5, baseY - h * 0.08, w, h * 0.3),
    blurred(fill('#000000', 0.25), 6),
  );
  const [light, mid, dark] =
    tone === 'brass' ? ['#ffe08a', '#d79b2b', '#7a4a08'] : ['#e8945a', '#b4522a', '#5e2410'];
  const bowl = path((b) => {
    b.moveTo(cx - w * 0.5, top);
    b.cubicTo(cx - w * 0.48, top + h * 0.9, cx - w * 0.2, baseY, cx, baseY);
    b.cubicTo(cx + w * 0.25, baseY, cx + w * 0.45, top + h * 0.7, cx + w * 0.62, top - h * 0.18);
    b.quadTo(cx + w * 0.42, top + h * 0.12, cx + w * 0.3, top + h * 0.05);
    b.lineTo(cx - w * 0.5, top);
    b.close();
  });
  c.drawPath(bowl, linear(cx, top, cx, baseY, [col(light), col(mid), col(dark)], [0, 0.45, 1]));
  // Painted band and dots.
  const band = stroke(pal.gold, w * 0.025, 0.9);
  c.drawArc(Skia.XYWHRect(cx - w * 0.44, top - h * 0.9, w * 0.88, h * 1.6), 35, 110, false, band);
  for (let i = 0; i < 7; i++) {
    const a = (50 + i * 13) * RAD;
    c.drawCircle(
      cx + Math.cos(a) * w * 0.36,
      top - h * 0.1 + Math.sin(a) * h * 0.95,
      w * 0.018,
      fill(pal.gold, 0.95),
    );
  }
  // Rim with oil.
  c.drawOval(Skia.XYWHRect(cx - w * 0.5, top - h * 0.16, w * 0.86, h * 0.34), fill(dark));
  c.drawOval(
    Skia.XYWHRect(cx - w * 0.44, top - h * 0.1, w * 0.74, h * 0.22),
    linear(cx, top - h * 0.1, cx, top + h * 0.1, [col('#ffd27a'), col('#a8661a')]),
  );
  // Wick and flame.
  c.drawLine(
    flame.x - w * 0.04,
    top + h * 0.02,
    flame.x,
    flame.y + w * 0.16,
    stroke('#3a2410', w * 0.022),
  );
  flameShape(c, flame.x, flame.y + w * 0.17, w * 0.5, w * 0.17);
  return flame;
}

/** A teardrop flame standing on (x, y), `h` tall. */
export function flameShape(c: SkCanvas, x: number, y: number, h: number, w: number): void {
  const outer = path((b) => {
    b.moveTo(x, y - h);
    b.cubicTo(x + w * 0.35, y - h * 0.62, x + w * 0.7, y - h * 0.28, x + w * 0.5, y - h * 0.08);
    b.cubicTo(x + w * 0.32, y + h * 0.06, x - w * 0.32, y + h * 0.06, x - w * 0.5, y - h * 0.08);
    b.cubicTo(x - w * 0.7, y - h * 0.28, x - w * 0.35, y - h * 0.62, x, y - h);
    b.close();
  });
  c.drawPath(
    outer,
    blurred(
      linear(
        x,
        y,
        x,
        y - h,
        [col('#ff5a00'), col('#ff9d1c'), col('#ffd85a'), col('#fff3c0', 0.9)],
        [0, 0.25, 0.6, 1],
      ),
      w * 0.06,
    ),
  );
  const inner = path((b) => {
    b.moveTo(x, y - h * 0.62);
    b.cubicTo(x + w * 0.22, y - h * 0.4, x + w * 0.32, y - h * 0.16, x, y - h * 0.06);
    b.cubicTo(x - w * 0.32, y - h * 0.16, x - w * 0.22, y - h * 0.4, x, y - h * 0.62);
    b.close();
  });
  c.drawPath(inner, fill('#fffbe6', 0.92));
}
