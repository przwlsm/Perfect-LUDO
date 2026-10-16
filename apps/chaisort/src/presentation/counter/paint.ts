import {
  BlurStyle,
  ClipOp,
  PaintStyle,
  Skia,
  StrokeCap,
  StrokeJoin,
  TileMode,
  type SkCanvas,
  type SkPath,
} from '@shopify/react-native-skia';
import type { CupLook } from './looks';

/**
 * Everything drawn on the counter, as plain functions on a Skia canvas.
 * They are worklets, so the same code paints static pictures on the JS
 * thread and animated ones on the UI thread.
 */

/** What the painter needs to know about an ingredient (passed in, so worklets stay self-contained). */
export interface Ink {
  readonly colour: string;
  readonly light: string;
  readonly mark: string;
  readonly spice: boolean;
  /** A light liquid takes a dark mark, a dark one a light mark. */
  readonly markColour: string;
}

/** One cup's geometry, from its centre, the counter line, its width and layer height. */
export interface Geo {
  readonly cx: number;
  readonly by: number;
  readonly w: number;
  readonly lh: number;
  readonly cap: number;
  /** The liquid's floor and the rim. */
  readonly inBottom: number;
  readonly inTop: number;
  /** Interior half-widths at the rim and the floor. */
  readonly hT: number;
  readonly hB: number;
  /** Outer half-widths at the rim and the foot. */
  readonly oT: number;
  readonly oB: number;
  readonly rB: number;
  /** How far the walls bow out (a kulhad's belly); 0 for straight walls. */
  readonly belly: number;
}

export function cupGeo(
  look: CupLook,
  cx: number,
  by: number,
  w: number,
  lh: number,
  cap: number,
): Geo {
  'worklet';
  const foot = lh * (look.shape === 'porcelain' ? 0.42 : look.shape === 'cutting' ? 0.4 : 0.32);
  const inBottom = by - foot;
  const inTop = inBottom - (cap + 0.5) * lh;
  const oT = w / 2;
  const hT = oT * look.inner;
  const hB = hT * look.taper;
  const oB = Math.max(hB + (oT - hT) * 0.9, oT * look.taper * 0.98);
  const rB = look.shape === 'porcelain' ? hB * 0.9 : Math.min(lh * 0.45, hB * 0.45);
  const belly = look.shape === 'kulhad' ? w * 0.045 : 0;
  return { cx, by, w, lh, cap, inBottom, inTop, hT, hB, oT, oB, rB, belly };
}

/** Interior half-width at height `y`. */
export function halfAt(g: Geo, y: number): number {
  'worklet';
  const k = Math.max(0, Math.min(1, (g.inBottom - y) / (g.inBottom - g.inTop)));
  return g.hB + (g.hT - g.hB) * k + g.belly * Math.sin(Math.PI * Math.min(1, k * 1.1));
}

/** The inside of the cup: where liquid can be. */
export function interiorPath(g: Geo): SkPath {
  'worklet';
  const { cx, inTop, inBottom, hT, hB, rB, belly } = g;
  const my = inTop + (inBottom - inTop) * 0.55;
  const mx = (hT + hB) / 2 + belly;
  return Skia.PathBuilder.Make()
    .moveTo(cx - hT, inTop)
    .quadTo(cx - mx - belly, my, cx - hB, inBottom - rB)
    .quadTo(cx - hB, inBottom, cx - hB + rB, inBottom)
    .lineTo(cx + hB - rB, inBottom)
    .quadTo(cx + hB, inBottom, cx + hB, inBottom - rB)
    .quadTo(cx + mx + belly, my, cx + hT, inTop)
    .close()
    .build();
}

/** The cup's outline. */
export function outerPath(g: Geo, look: CupLook): SkPath {
  'worklet';
  const { cx, inTop, by, oT, oB, lh, belly } = g;
  const top = inTop - lh * 0.04;
  const r =
    look.shape === 'porcelain' ? oB * 0.85 : look.shape === 'copper' ? lh * 0.12 : lh * 0.32;
  const my = top + (by - top) * 0.55;
  const mx = (oT + oB) / 2 + belly;
  return Skia.PathBuilder.Make()
    .moveTo(cx - oT, top)
    .quadTo(cx - mx - belly, my, cx - oB, by - r)
    .quadTo(cx - oB, by, cx - oB + r, by)
    .lineTo(cx + oB - r, by)
    .quadTo(cx + oB, by, cx + oB, by - r)
    .quadTo(cx + mx + belly, my, cx + oT, top)
    .close()
    .build();
}

function paint(colour: string, alpha = 1) {
  'worklet';
  const p = Skia.Paint();
  p.setAntiAlias(true);
  p.setColor(Skia.Color(colour));
  if (alpha < 1) p.setAlphaf(alpha);
  return p;
}

function stroke(colour: string, width: number, alpha = 1) {
  'worklet';
  const p = paint(colour, alpha);
  p.setStyle(PaintStyle.Stroke);
  p.setStrokeWidth(width);
  p.setStrokeCap(StrokeCap.Round);
  p.setStrokeJoin(StrokeJoin.Round);
  return p;
}

function hLinear(x0: number, x1: number, colours: string[], positions: number[] | null = null) {
  'worklet';
  const p = Skia.Paint();
  p.setAntiAlias(true);
  p.setShader(
    Skia.Shader.MakeLinearGradient(
      { x: x0, y: 0 },
      { x: x1, y: 0 },
      colours.map((c) => Skia.Color(c)),
      positions,
      TileMode.Clamp,
    ),
  );
  return p;
}

// ------------------------------------------------------------------ marks

/** The mark drawn on every layer of an ingredient, centred at (x, y) with radius r. */
export function drawMark(
  canvas: SkCanvas,
  mark: string,
  x: number,
  y: number,
  r: number,
  colour: string,
) {
  'worklet';
  const fill = paint(colour);
  const line = stroke(colour, Math.max(1.2, r * 0.22));
  const b = Skia.PathBuilder.Make();
  switch (mark) {
    case 'star': {
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const rr = i % 2 === 0 ? r : r * 0.45;
        if (i === 0) b.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
        else b.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      b.close();
      canvas.drawPath(b.build(), fill);
      return;
    }
    case 'drop':
      b.moveTo(x, y - r)
        .cubicTo(x + r * 0.2, y - r * 0.5, x + r * 0.75, y - r * 0.05, x + r * 0.75, y + r * 0.3)
        .cubicTo(x + r * 0.75, y + r * 0.75, x + r * 0.4, y + r, x, y + r)
        .cubicTo(x - r * 0.4, y + r, x - r * 0.75, y + r * 0.75, x - r * 0.75, y + r * 0.3)
        .cubicTo(x - r * 0.75, y - r * 0.05, x - r * 0.2, y - r * 0.5, x, y - r)
        .close();
      canvas.drawPath(b.build(), fill);
      return;
    case 'zigzag':
      b.moveTo(x - r, y + r * 0.35)
        .lineTo(x - r * 0.5, y - r * 0.35)
        .lineTo(x, y + r * 0.35)
        .lineTo(x + r * 0.5, y - r * 0.35)
        .lineTo(x + r, y + r * 0.35);
      canvas.drawPath(b.build(), line);
      return;
    case 'pod':
      b.addOval(Skia.XYWHRect(x - r, y - r * 0.5, r * 2, r));
      canvas.drawPath(b.build(), line);
      canvas.drawLine(x - r * 0.55, y, x + r * 0.55, y, line);
      return;
    case 'threads':
      for (const dx of [-0.55, 0, 0.55]) {
        const t = Skia.PathBuilder.Make()
          .moveTo(x + dx * r - r * 0.15, y + r * 0.85)
          .quadTo(x + dx * r + r * 0.35, y, x + dx * r - r * 0.05, y - r * 0.85)
          .build();
        canvas.drawPath(t, line);
      }
      return;
    case 'flower':
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
        canvas.drawCircle(x + Math.cos(a) * r * 0.52, y + Math.sin(a) * r * 0.52, r * 0.42, fill);
      }
      return;
    case 'leaf':
      b.moveTo(x - r, y + r * 0.6)
        .quadTo(x - r * 0.6, y - r * 0.9, x + r, y - r * 0.6)
        .quadTo(x + r * 0.6, y + r * 0.9, x - r, y + r * 0.6)
        .close();
      canvas.drawPath(b.build(), fill);
      return;
    case 'slice': {
      canvas.drawCircle(x, y, r * 0.9, line);
      for (let i = 0; i < 3; i++) {
        const a = (i * Math.PI) / 3;
        canvas.drawLine(
          x + Math.cos(a) * r * 0.75,
          y + Math.sin(a) * r * 0.75,
          x - Math.cos(a) * r * 0.75,
          y - Math.sin(a) * r * 0.75,
          stroke(colour, Math.max(1, r * 0.14)),
        );
      }
      return;
    }
    case 'bean':
      b.addOval(Skia.XYWHRect(x - r * 0.68, y - r, r * 1.36, r * 2));
      canvas.drawPath(b.build(), fill);
      canvas.drawPath(
        Skia.PathBuilder.Make()
          .moveTo(x, y - r * 0.8)
          .cubicTo(x - r * 0.4, y - r * 0.2, x + r * 0.4, y + r * 0.2, x, y + r * 0.8)
          .build(),
        stroke('rgba(0,0,0,0.55)', Math.max(1, r * 0.2)),
      );
      return;
    case 'petal':
      for (let i = 0; i < 4; i++) {
        const a = Math.PI / 4 + (i * Math.PI) / 2;
        const px = x + Math.cos(a) * r * 0.5;
        const py = y + Math.sin(a) * r * 0.5;
        canvas.save();
        canvas.rotate((a * 180) / Math.PI, px, py);
        canvas.drawOval(Skia.XYWHRect(px - r * 0.5, py - r * 0.28, r, r * 0.56), fill);
        canvas.restore();
      }
      return;
    case 'heart':
      b.moveTo(x, y + r * 0.85)
        .cubicTo(x - r * 1.1, y + r * 0.05, x - r * 0.75, y - r * 0.95, x, y - r * 0.4)
        .cubicTo(x + r * 0.75, y - r * 0.95, x + r * 1.1, y + r * 0.05, x, y + r * 0.85)
        .close();
      canvas.drawPath(b.build(), fill);
      return;
    case 'peppercorns':
      canvas.drawCircle(x - r * 0.5, y + r * 0.35, r * 0.38, fill);
      canvas.drawCircle(x + r * 0.5, y + r * 0.35, r * 0.38, fill);
      canvas.drawCircle(x, y - r * 0.45, r * 0.38, fill);
      return;
    case 'crescent':
      b.moveTo(x + r * 0.3, y - r)
        .cubicTo(x - r * 1.2, y - r * 0.8, x - r * 1.2, y + r * 0.8, x + r * 0.3, y + r)
        .cubicTo(x - r * 0.45, y + r * 0.5, x - r * 0.45, y - r * 0.5, x + r * 0.3, y - r)
        .close();
      canvas.drawPath(b.build(), fill);
      return;
    case 'question':
      canvas.drawPath(
        Skia.PathBuilder.Make()
          .moveTo(x - r * 0.5, y - r * 0.35)
          .cubicTo(x - r * 0.5, y - r * 1.05, x + r * 0.55, y - r * 1.05, x + r * 0.55, y - r * 0.4)
          .cubicTo(x + r * 0.55, y + r * 0.05, x, y + r * 0.05, x, y + r * 0.35)
          .build(),
        line,
      );
      canvas.drawCircle(x, y + r * 0.85, Math.max(1.2, r * 0.16), fill);
      return;
  }
}

// ------------------------------------------------------------------ liquid

/** Froth: what a hidden layer looks like (the same for every ingredient). */
const FROTH = '#7b6a5e';
const FROTH_LIGHT = '#a8978a';

/** The ingredient index of a layer and whether froth hides it (mirrors the domain's encoding). */
function decode(layer: number): { ing: number; hidden: boolean } {
  'worklet';
  return { ing: layer & 31, hidden: (layer & 32) !== 0 };
}

/** A single layer band from `y0` (top) to `y1` (bottom), clipped by the caller. */
function drawBand(
  canvas: SkCanvas,
  g: Geo,
  layer: number,
  y0: number,
  y1: number,
  inks: readonly Ink[],
  symbols: boolean,
  markIt: boolean,
  seed: number,
) {
  'worklet';
  const { ing, hidden } = decode(layer);
  const ink = inks[ing] ?? inks[0]!;
  const x = g.cx - g.hT - 2;
  const w = g.hT * 2 + 4;
  const h = y1 - y0;
  if (h <= 0.2) return;
  canvas.drawRect(Skia.XYWHRect(x, y0, w, h + 0.6), paint(hidden ? FROTH : ink.colour));
  // A lighter seam where one layer meets the next.
  canvas.drawRect(
    Skia.XYWHRect(x, y0, w, Math.min(h, g.lh * 0.12)),
    paint(hidden ? FROTH_LIGHT : ink.light, 0.55),
  );
  const cy = (y0 + y1) / 2;
  const half = halfAt(g, cy);
  if (hidden) {
    // Bubbles and a question mark: something is under here.
    for (let i = 0; i < 7; i++) {
      const a = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453;
      const f = a - Math.floor(a);
      const b2 = Math.sin(seed * 4.1 + i * 19.19) * 9631.17;
      const f2 = b2 - Math.floor(b2);
      canvas.drawCircle(
        g.cx + (f * 2 - 1) * half * 0.8,
        y0 + h * (0.2 + 0.6 * f2),
        g.lh * (0.05 + 0.05 * f),
        stroke('#d7cbc0', 1, 0.6),
      );
    }
    if (markIt && h > g.lh * 0.6)
      drawMark(canvas, 'question', g.cx, cy, Math.min(g.lh * 0.3, half * 0.5), '#f4ece4');
    return;
  }
  if (ink.spice) {
    // Ground spice: a fine speckle on every spice layer.
    for (let i = 0; i < 14; i++) {
      const a = Math.sin(seed * 7.13 + i * 31.7) * 24634.6345;
      const f = a - Math.floor(a);
      const b2 = Math.sin(seed * 3.7 + i * 11.3) * 5137.77;
      const f2 = b2 - Math.floor(b2);
      canvas.drawCircle(
        g.cx + (f * 2 - 1) * half * 0.85,
        y0 + h * (0.15 + 0.7 * f2),
        Math.max(0.8, g.lh * 0.035),
        paint('#111111', 0.35),
      );
    }
  }
  if (symbols && markIt && h > g.lh * 0.6) {
    drawMark(canvas, ink.mark, g.cx, cy, Math.min(g.lh * 0.3, half * 0.55), ink.markColour);
  }
}

/**
 * The layers in a cup, bottom first, plus an optional part-layer on top
 * (a pour in progress): `extra` layers of `extraLayer`, `extraFill` of the
 * way in. Clipped to the cup's interior, shaded like a round vessel.
 */
export function drawLiquid(
  canvas: SkCanvas,
  g: Geo,
  layers: readonly number[],
  inks: readonly Ink[],
  symbols: boolean,
  extraLayer = -1,
  extraAmount = 0,
  wobble = 0,
) {
  'worklet';
  canvas.save();
  canvas.clipPath(interiorPath(g), ClipOp.Intersect, true);
  for (let i = 0; i < layers.length; i++) {
    const y1 = g.inBottom - i * g.lh;
    drawBand(canvas, g, layers[i]!, y1 - g.lh, y1, inks, symbols, true, i * 3 + layers[i]! + g.cx);
  }
  let top = g.inBottom - layers.length * g.lh;
  let topLayer = layers[layers.length - 1] ?? -1;
  if (extraLayer >= 0 && extraAmount > 0.001) {
    const h = extraAmount * g.lh;
    drawBand(canvas, g, extraLayer, top - h, top, inks, symbols, false, 99);
    top -= h;
    topLayer = extraLayer;
  }
  if (topLayer >= 0) {
    // The surface, seen a little from above, tilting as it sloshes.
    const { ing, hidden } = decode(topLayer);
    const ink = inks[ing] ?? inks[0]!;
    const half = halfAt(g, top);
    const sh = g.lh * 0.14;
    const surface = Skia.PathBuilder.Make()
      .addOval(Skia.XYWHRect(g.cx - half, top - sh, half * 2, sh * 2))
      .build();
    canvas.save();
    if (wobble !== 0) canvas.rotate(wobble, g.cx, top);
    canvas.drawPath(surface, paint(hidden ? FROTH_LIGHT : ink.light, 0.95));
    canvas.restore();
  }
  // Round-vessel shading: light from the left, shadow to the right.
  const fillTop = Math.min(top - g.lh * 0.2, g.inBottom);
  if (layers.length > 0 || extraAmount > 0) {
    const shade = hLinear(
      g.cx - g.hT,
      g.cx + g.hT,
      ['rgba(255,255,255,0.22)', 'rgba(255,255,255,0)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.22)'],
      [0, 0.35, 0.6, 1],
    );
    canvas.drawRect(
      Skia.XYWHRect(g.cx - g.hT - 2, fillTop, g.hT * 2 + 4, g.inBottom - fillTop + 2),
      shade,
    );
  }
  canvas.restore();
}

// ------------------------------------------------------------------ cups

/** Shadow, saucer, handle, body and the inside wall: everything behind the liquid. */
export function drawCupBack(canvas: SkCanvas, g: Geo, look: CupLook, evening: boolean) {
  'worklet';
  const { cx, by, oT, oB, lh, inTop, inBottom } = g;
  // A soft shadow on the counter.
  const shadow = paint('#000000', evening ? 0.4 : 0.22);
  shadow.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, lh * 0.18, true));
  canvas.drawOval(Skia.XYWHRect(cx - oB * 1.25, by - lh * 0.16, oB * 2.5, lh * 0.32), shadow);

  if (look.shape === 'porcelain') {
    // Saucer.
    const sw = oT * 1.22;
    const saucer = hLinear(cx - sw, cx + sw, ['#ffffff', '#e8e1d6', '#c9c0b3']);
    canvas.drawOval(Skia.XYWHRect(cx - sw, by - lh * 0.34, sw * 2, lh * 0.5), saucer);
    canvas.drawOval(
      Skia.XYWHRect(cx - sw * 0.98, by - lh * 0.34, sw * 1.96, lh * 0.42),
      stroke(look.trim, Math.max(1, lh * 0.05), 0.8),
    );
    // Handle.
    const handle = Skia.PathBuilder.Make()
      .moveTo(cx + oT * 0.9, inTop + lh * 0.8)
      .cubicTo(
        cx + oT + lh * 0.75,
        inTop + lh * 0.7,
        cx + oT + lh * 0.6,
        inBottom - lh * 0.7,
        cx + oB * 1.02,
        inBottom - lh * 0.75,
      )
      .build();
    canvas.drawPath(handle, stroke('#b9b0a4', lh * 0.24));
    canvas.drawPath(handle, stroke('#ffffff', lh * 0.15));
  }

  const outer = outerPath(g, look);
  if (look.shape === 'cutting' || look.shape === 'neon') {
    canvas.drawPath(outer, hLinear(cx - oT, cx + oT, [look.body[0], look.body[1]]));
  } else {
    const body =
      look.shape === 'copper'
        ? hLinear(
            cx - oT,
            cx + oT,
            [look.body[1], look.body[0], look.rim, look.body[0], look.body[1]],
            [0, 0.25, 0.38, 0.6, 1],
          )
        : hLinear(cx - oT, cx + oT, [look.body[0], look.body[0], look.body[1]], [0, 0.35, 1]);
    canvas.drawPath(outer, body);
  }
  canvas.drawPath(interiorPath(g), paint(look.inside));
  if (look.shape === 'kulhad') {
    // Throwing rings on the clay walls, where the potter's fingers ran.
    const ring = stroke(look.trim, Math.max(0.8, lh * 0.04), 0.35);
    for (let k = 1; k <= 3; k++) {
      const y = inTop + (inBottom - inTop) * (k / 4);
      const hw = halfAt(g, y);
      const ow = hw + (oT - g.hT) * 0.95;
      canvas.drawLine(cx - ow, y, cx - hw, y, ring);
      canvas.drawLine(cx + hw, y, cx + ow, y, ring);
    }
  }
}

/** Rim, trim, glass, highlights: everything in front of the liquid. */
export function drawCupFront(
  canvas: SkCanvas,
  g: Geo,
  look: CupLook,
  index: number,
  evening = true,
) {
  'worklet';
  const { cx, by, oT, oB, hT, lh, inTop, inBottom } = g;
  const rimRy = lh * 0.16;
  switch (look.shape) {
    case 'kulhad': {
      const wall = oT - hT;
      canvas.drawOval(
        Skia.XYWHRect(cx - oT + wall / 2, inTop - rimRy, (oT - wall / 2) * 2, rimRy * 2),
        stroke(look.rim, wall * 0.9),
      );
      canvas.drawOval(
        Skia.XYWHRect(cx - hT, inTop - rimRy * 0.8, hT * 2, rimRy * 1.6),
        stroke(look.trim, Math.max(1, lh * 0.04), 0.6),
      );
      // A lit edge on the left wall.
      canvas.drawLine(
        cx - oT + wall * 0.45,
        inTop + lh * 0.3,
        cx - oB + wall * 0.45,
        inBottom - lh * 0.2,
        stroke('#ffd2ad', Math.max(1, wall * 0.25), 0.45),
      );
      break;
    }
    case 'cutting': {
      // The thick glass base.
      canvas.drawRect(
        Skia.XYWHRect(cx - oB + 1, inBottom, (oB - 1) * 2, by - inBottom - 1),
        paint('#ffffff', 0.28),
      );
      // Ribs on the lower glass.
      const rib = stroke('#ffffff', Math.max(1, lh * 0.06), 0.22);
      const y0 = inBottom - (inBottom - inTop) * 0.62;
      for (const f of [-0.7, -0.35, 0, 0.35, 0.7]) {
        canvas.drawLine(cx + f * halfAt(g, y0), y0, cx + f * g.hB, inBottom - lh * 0.1, rib);
      }
      const edge = evening ? look.rim : 'rgba(110, 70, 45, 0.75)';
      canvas.drawPath(
        outerPath(g, look),
        stroke(edge, Math.max(1.2, lh * 0.06), evening ? 0.55 : 0.8),
      );
      canvas.drawOval(
        Skia.XYWHRect(cx - oT, inTop - rimRy, oT * 2, rimRy * 2),
        stroke(edge, Math.max(1.2, lh * 0.06), evening ? 0.7 : 0.85),
      );
      canvas.drawRect(
        Skia.XYWHRect(cx - hT * 0.72, inTop + lh * 0.4, hT * 0.16, (inBottom - inTop) * 0.7),
        paint('#ffffff', 0.18),
      );
      break;
    }
    case 'copper': {
      const band = (y: number, h: number) => {
        const half = oT + 1;
        canvas.drawRect(
          Skia.XYWHRect(cx - half, y, half * 2, h),
          hLinear(
            cx - half,
            cx + half,
            [look.body[1], look.rim, look.body[0], look.body[1]],
            [0, 0.3, 0.55, 1],
          ),
        );
        for (let i = 0; i < 7; i++) {
          canvas.drawCircle(
            cx - half * 0.8 + (i * half * 1.6) / 6,
            y + h / 2,
            Math.max(0.8, h * 0.13),
            paint('#ffe0c0', 0.45),
          );
        }
      };
      band(inTop - lh * 0.12, lh * 0.38);
      canvas.drawOval(
        Skia.XYWHRect(cx - oT, inTop - rimRy - lh * 0.12, oT * 2, rimRy * 2),
        stroke(look.rim, Math.max(1, lh * 0.07), 0.9),
      );
      band(inBottom - lh * 0.02, by - inBottom);
      canvas.drawLine(
        cx - oT * 0.88,
        inTop + lh * 0.5,
        cx - oB * 0.9,
        inBottom - lh * 0.2,
        stroke('#ffe2c4', Math.max(1, lh * 0.06), 0.5),
      );
      break;
    }
    case 'porcelain': {
      canvas.drawOval(
        Skia.XYWHRect(cx - oT, inTop - rimRy, oT * 2, rimRy * 2),
        stroke('#ffffff', Math.max(1.5, lh * 0.1)),
      );
      canvas.drawOval(
        Skia.XYWHRect(cx - oT, inTop - rimRy, oT * 2, rimRy * 2),
        stroke('#b5ab9e', Math.max(0.8, lh * 0.03), 0.8),
      );
      // A blue band and dots on the walls.
      canvas.drawPath(outerPath(g, look), stroke(look.trim, Math.max(1, lh * 0.06), 0.85));
      for (let k = 0; k < 4; k++) {
        const y = inTop + lh * (0.9 + k * 0.9);
        if (y > inBottom - lh * 0.3) break;
        const hw = halfAt(g, y);
        const mid = (hw + (oT - hT) * 0.5 + hw) / 2 + (oT - hT) * 0.25;
        canvas.drawCircle(cx - mid, y, Math.max(0.8, lh * 0.05), paint(look.trim));
        canvas.drawCircle(cx + mid, y, Math.max(0.8, lh * 0.05), paint(look.trim));
      }
      break;
    }
    case 'neon': {
      const colours = look.neon ?? [look.trim];
      const neon = colours[index % colours.length]!;
      const glow = stroke(neon, Math.max(2, lh * 0.16), 0.75);
      glow.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, lh * 0.14, true));
      const outline = outerPath(g, look);
      canvas.drawPath(outline, glow);
      canvas.drawPath(outline, stroke(neon, Math.max(1.2, lh * 0.06)));
      canvas.drawPath(outline, stroke('#ffffff', Math.max(0.6, lh * 0.025), 0.8));
      canvas.drawOval(
        Skia.XYWHRect(cx - oT, inTop - rimRy, oT * 2, rimRy * 2),
        stroke(neon, Math.max(1.2, lh * 0.06)),
      );
      break;
    }
  }
}

/** A brass lid over the rim, with a little knob. */
export function drawLid(canvas: SkCanvas, g: Geo) {
  'worklet';
  const { cx, oT, lh, inTop } = g;
  const w = oT * 1.06;
  const brass = hLinear(
    cx - w,
    cx + w,
    ['#8c6420', '#f3cf7a', '#d4a24c', '#7a5418'],
    [0, 0.35, 0.6, 1],
  );
  const dome = Skia.PathBuilder.Make()
    .moveTo(cx - w, inTop)
    .cubicTo(cx - w * 0.9, inTop - lh * 0.75, cx + w * 0.9, inTop - lh * 0.75, cx + w, inTop)
    .close()
    .build();
  canvas.drawPath(dome, brass);
  canvas.drawOval(Skia.XYWHRect(cx - w, inTop - lh * 0.13, w * 2, lh * 0.26), brass);
  canvas.drawOval(
    Skia.XYWHRect(cx - w, inTop - lh * 0.13, w * 2, lh * 0.26),
    stroke('#6b4710', Math.max(1, lh * 0.04)),
  );
  canvas.drawCircle(cx, inTop - lh * 0.62, lh * 0.16, brass);
  canvas.drawCircle(cx, inTop - lh * 0.62, lh * 0.16, stroke('#6b4710', Math.max(1, lh * 0.04)));
}

/** Steam curling up from a finished cup. `t` is seconds; calm draws it still and faint. */
export function drawSteam(canvas: SkCanvas, g: Geo, t: number, colour: string, calm: boolean) {
  'worklet';
  const { cx, lh, inTop, hT } = g;
  for (let k = 0; k < 3; k++) {
    const phase = calm ? 0.45 + k * 0.1 : (t * 0.42 + k * 0.33) % 1;
    const rise = phase * lh * 1.1;
    const alpha = calm ? 0.35 : Math.sin(Math.PI * phase) * 0.7;
    if (alpha <= 0.02) continue;
    const x0 = cx + (k - 1) * hT * 0.5;
    const y0 = inTop - lh * 0.15 - rise;
    const len = lh * 1.3;
    const sway = Math.sin(t * 1.7 + k * 2) * lh * 0.12;
    const p = Skia.PathBuilder.Make()
      .moveTo(x0, y0)
      .cubicTo(
        x0 + lh * 0.35 + sway,
        y0 - len * 0.33,
        x0 - lh * 0.35 + sway,
        y0 - len * 0.66,
        x0 + sway,
        y0 - len,
      )
      .build();
    const s = stroke(colour, Math.max(1.5, lh * 0.13), alpha);
    s.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, lh * 0.05, true));
    canvas.drawPath(p, s);
  }
}

/** The pour: a stream from the lip into the cup below, narrowing as it falls. */
export function drawStream(
  canvas: SkCanvas,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  width: number,
  ink: Ink,
) {
  'worklet';
  if (y1 <= y0) return;
  const p = Skia.PathBuilder.Make()
    .moveTo(x0, y0)
    .cubicTo(x0 + (x1 - x0) * 0.9, y0, x1, y0 + (y1 - y0) * 0.3, x1, y1)
    .build();
  canvas.drawPath(p, stroke(ink.colour, width));
  canvas.drawPath(p, stroke(ink.light, width * 0.35, 0.6));
}

/** A glow under a cup (picked up, or pointed to by a hint). */
export function drawGlow(canvas: SkCanvas, g: Geo, colour: string, alpha: number) {
  'worklet';
  const p = paint(colour, alpha);
  p.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, g.lh * 0.45, true));
  canvas.drawRRect(
    Skia.RRectXY(
      Skia.XYWHRect(
        g.cx - g.oT - g.lh * 0.2,
        g.inTop - g.lh * 0.4,
        (g.oT + g.lh * 0.2) * 2,
        g.by - g.inTop + g.lh * 0.6,
      ),
      g.lh * 0.6,
      g.lh * 0.6,
    ),
    p,
  );
}

/** A little bouncing arrow over a cup (where a hint says to pour). */
export function drawArrow(canvas: SkCanvas, x: number, y: number, size: number, colour: string) {
  'worklet';
  const p = Skia.PathBuilder.Make()
    .moveTo(x - size * 0.5, y - size)
    .lineTo(x + size * 0.5, y - size)
    .lineTo(x + size * 0.5, y - size * 0.4)
    .lineTo(x + size * 0.9, y - size * 0.4)
    .lineTo(x, y + size * 0.3)
    .lineTo(x - size * 0.9, y - size * 0.4)
    .lineTo(x - size * 0.5, y - size * 0.4)
    .close()
    .build();
  canvas.drawPath(p, paint(colour));
  canvas.drawPath(p, stroke('#ffffff', Math.max(1, size * 0.1), 0.8));
}

/** A burst of steam-puff rings and sparks when a cup is finished. `k` runs 0 → 1. */
export function drawBurst(canvas: SkCanvas, g: Geo, k: number, colour: string) {
  'worklet';
  if (k <= 0 || k >= 1) return;
  const cy = g.inTop - g.lh * 0.2;
  const r = g.lh * (0.6 + 1.8 * k);
  canvas.drawCircle(g.cx, cy, r, stroke(colour, Math.max(1, g.lh * 0.12 * (1 - k)), (1 - k) * 0.8));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.3;
    const d = g.lh * (0.8 + 2.2 * k);
    canvas.drawCircle(
      g.cx + Math.cos(a) * d,
      cy + Math.sin(a) * d * 0.7,
      g.lh * 0.09 * (1 - k),
      paint(colour, 1 - k),
    );
  }
}
