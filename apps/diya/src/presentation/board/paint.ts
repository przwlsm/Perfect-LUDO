import {
  BlurStyle,
  ClipOp,
  PaintStyle,
  Skia,
  StrokeCap,
  TileMode,
  type SkCanvas,
  type SkPaint,
} from '@shopify/react-native-skia';
import { mix, withAlpha } from 'app-kit';
import { BLUE, RED, WHITE, YELLOW, type Dir, type Piece } from '@/domain/entities/Board';
import { lightColour, type BoardLook, type LampStyle } from '../theme/festivals';

/**
 * Painters for everything on the board that does not move by itself:
 * the frame, floor, walls, one-way glass, pieces and lamp bodies. They draw
 * into pictures on the JS thread, made again only when the board changes.
 */

function paint(color?: string): SkPaint {
  const p = Skia.Paint();
  p.setAntiAlias(true);
  if (color) p.setColor(Skia.Color(color));
  return p;
}

function stroke(color: string, width: number): SkPaint {
  const p = paint(color);
  p.setStyle(PaintStyle.Stroke);
  p.setStrokeWidth(width);
  p.setStrokeCap(StrokeCap.Round);
  return p;
}

function linear(
  p: SkPaint,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  colors: string[],
  pos?: number[],
) {
  p.setShader(
    Skia.Shader.MakeLinearGradient(
      { x: x0, y: y0 },
      { x: x1, y: y1 },
      colors.map((c) => Skia.Color(c)),
      pos ?? null,
      TileMode.Clamp,
    ),
  );
  return p;
}

function radial(p: SkPaint, x: number, y: number, r: number, colors: string[], pos?: number[]) {
  p.setShader(
    Skia.Shader.MakeRadialGradient(
      { x, y },
      r,
      colors.map((c) => Skia.Color(c)),
      pos ?? null,
      TileMode.Clamp,
    ),
  );
  return p;
}

function blur(p: SkPaint, sigma: number) {
  p.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, sigma, true));
  return p;
}

const rrect = (x: number, y: number, w: number, h: number, r: number) =>
  Skia.RRectXY(Skia.XYWHRect(x, y, w, h), r, r);

export interface FrameGeometry {
  readonly bx: number;
  readonly by: number;
  readonly bw: number;
  readonly bh: number;
  readonly cell: number;
  readonly pad: number;
}

/** The board's frame, sky and floor tiles. */
export function drawFrame(
  canvas: SkCanvas,
  g: FrameGeometry,
  cols: number,
  rows: number,
  look: BoardLook,
  scheme: 'night' | 'dusk',
) {
  const { bx, by, bw, bh, cell, pad } = g;
  const fx = bx - pad;
  const fy = by - pad;
  const fw = bw + pad * 2;
  const fh = bh + pad * 2;
  const r = pad + cell * 0.2;
  // A warm glow around the whole board.
  const glow = blur(paint(withAlpha(look.metal[1], scheme === 'night' ? 0.35 : 0.45)), 16);
  canvas.drawRRect(rrect(fx - 2, fy + 4, fw + 4, fh + 4, r), glow);
  const sky = scheme === 'night' ? look.night : look.dusk;
  canvas.drawRRect(rrect(fx, fy, fw, fh, r), linear(paint(), 0, fy, 0, fy + fh, [...sky]));
  // A faint horizon of warm light along the bottom.
  canvas.drawRRect(
    rrect(fx, fy, fw, fh, r),
    linear(paint(), 0, fy + fh * 0.55, 0, fy + fh, [
      'rgba(0,0,0,0)',
      withAlpha(look.metal[0], 0.07),
    ]),
  );
  canvas.drawRRect(
    rrect(fx + 1, fy + 1, fw - 2, fh - 2, r - 1),
    linear(stroke('#000', 2.5), fx, fy, fx + fw, fy + fh, [
      look.metal[0],
      look.metal[1],
      look.metal[0],
    ]),
  );
  canvas.drawRRect(
    rrect(fx + 5, fy + 5, fw - 10, fh - 10, r - 5),
    stroke(withAlpha(look.metal[0], 0.22), 1),
  );

  const tile = paint(look.tile);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = cell * 0.06;
      canvas.drawRRect(
        rrect(bx + x * cell + i, by + y * cell + i, cell - i * 2, cell - i * 2, cell * 0.16),
        tile,
      );
    }
  }
  const dot = paint(look.dot);
  for (let y = 1; y < rows; y++) {
    for (let x = 1; x < cols; x++)
      canvas.drawCircle(bx + x * cell, by + y * cell, Math.max(1, cell * 0.025), dot);
  }
  drawMotif(canvas, look, fx, fy, fw, fh, cell);
}

/** Small festival touches on the frame's corners. */
function drawMotif(
  canvas: SkCanvas,
  look: BoardLook,
  fx: number,
  fy: number,
  fw: number,
  fh: number,
  cell: number,
) {
  const s = Math.max(5, cell * 0.13);
  const corners = [
    [fx + s * 1.3, fy + s * 1.3],
    [fx + fw - s * 1.3, fy + s * 1.3],
    [fx + s * 1.3, fy + fh - s * 1.3],
    [fx + fw - s * 1.3, fy + fh - s * 1.3],
  ] as const;
  const gold = paint(withAlpha(look.metal[0], 0.85));
  const soft = paint(withAlpha(look.sparks[1] ?? look.metal[0], 0.7));
  for (const [x, y] of corners) {
    switch (look.motif) {
      case 'rangoli':
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * Math.PI * 2;
          canvas.drawCircle(
            x + Math.cos(a) * s * 0.55,
            y + Math.sin(a) * s * 0.55,
            s * 0.24,
            k % 2 ? soft : gold,
          );
        }
        canvas.drawCircle(x, y, s * 0.24, paint(look.sparks[2] ?? '#ff6b9a'));
        break;
      case 'snow':
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * Math.PI * 2;
          canvas.drawLine(
            x,
            y,
            x + Math.cos(a) * s * 0.75,
            y + Math.sin(a) * s * 0.75,
            stroke(withAlpha('#ffffff', 0.8), 1.4),
          );
        }
        break;
      case 'crescent': {
        canvas.drawCircle(x, y, s * 0.6, gold);
        canvas.drawCircle(x + s * 0.28, y - s * 0.12, s * 0.5, paint(look.night[0]));
        break;
      }
      case 'star': {
        const b = Skia.PathBuilder.Make();
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * Math.PI * 2 - Math.PI / 2;
          const px = x + Math.cos(a) * s * 0.7;
          const py = y + Math.sin(a) * s * 0.7;
          if (k % 2 === 0) b.moveTo(px, py);
          else b.lineTo(px, py);
        }
        b.close();
        const b2 = Skia.PathBuilder.Make();
        for (let k = 1; k < 6; k += 2) {
          const a = (k / 6) * Math.PI * 2 - Math.PI / 2;
          const px = x + Math.cos(a) * s * 0.7;
          const py = y + Math.sin(a) * s * 0.7;
          if (k === 1) b2.moveTo(px, py);
          else b2.lineTo(px, py);
        }
        b2.close();
        canvas.drawPath(b.build(), stroke(withAlpha(look.metal[0], 0.9), 1.3));
        canvas.drawPath(b2.build(), stroke(withAlpha(look.metal[0], 0.9), 1.3));
        break;
      }
      case 'cloud':
        canvas.drawCircle(x - s * 0.3, y, s * 0.32, stroke(withAlpha(look.metal[0], 0.85), 1.3));
        canvas.drawCircle(
          x + s * 0.25,
          y - s * 0.1,
          s * 0.4,
          stroke(withAlpha(look.metal[0], 0.85), 1.3),
        );
        break;
    }
  }
}

export function drawWall(canvas: SkCanvas, cx: number, cy: number, c: number, look: BoardLook) {
  const i = c * 0.07;
  const x = cx - c / 2 + i;
  const y = cy - c / 2 + i;
  const s = c - i * 2;
  canvas.drawRRect(rrect(x, y + 2, s, s, c * 0.16), blur(paint('rgba(0,0,0,0.45)'), 3));
  canvas.drawRRect(
    rrect(x, y, s, s, c * 0.16),
    linear(paint(), 0, y, 0, y + s, [look.wall[0], look.wall[1]]),
  );
  canvas.drawRRect(rrect(x + 1, y + 1, s - 2, s - 2, c * 0.15), stroke(look.wallEdge, 1));
  // Mortar lines: three courses of stone.
  const mortar = stroke(withAlpha('#000000', 0.28), 1);
  for (const k of [1 / 3, 2 / 3]) canvas.drawLine(x + 2, y + s * k, x + s - 2, y + s * k, mortar);
  canvas.drawLine(x + s * 0.5, y + 2, x + s * 0.5, y + s / 3, mortar);
  canvas.drawLine(x + s * 0.28, y + s / 3, x + s * 0.28, y + (2 * s) / 3, mortar);
  canvas.drawLine(x + s * 0.72, y + s / 3, x + s * 0.72, y + (2 * s) / 3, mortar);
  canvas.drawLine(x + s * 0.5, y + (2 * s) / 3, x + s * 0.5, y + s - 2, mortar);
  canvas.drawLine(x + 2, y + 1.5, x + s - 2, y + 1.5, stroke(withAlpha(look.wallEdge, 1), 1.5));
  // A carved lozenge, like a temple step.
  const d = s * 0.14;
  const b = Skia.PathBuilder.Make()
    .moveTo(cx, cy - d)
    .lineTo(cx + d, cy)
    .lineTo(cx, cy + d)
    .lineTo(cx - d, cy)
    .close();
  canvas.drawPath(b.build(), stroke(withAlpha(look.wallEdge, 0.8), 1));
  if (look.motif === 'snow') {
    // Fresh snow on top.
    const snow = Skia.PathBuilder.Make()
      .moveTo(x - 1, y + s * 0.18)
      .cubicTo(x, y - s * 0.08, x + s, y - s * 0.08, x + s + 1, y + s * 0.18)
      .cubicTo(x + s * 0.8, y + s * 0.26, x + s * 0.7, y + s * 0.12, x + s * 0.55, y + s * 0.22)
      .cubicTo(x + s * 0.35, y + s * 0.3, x + s * 0.2, y + s * 0.14, x - 1, y + s * 0.18)
      .close();
    canvas.drawPath(snow.build(), paint('#f3fbff'));
  }
}

export function drawOneway(canvas: SkCanvas, cx: number, cy: number, c: number, dir: Dir) {
  canvas.save();
  canvas.rotate(dir * 90, cx, cy);
  const i = c * 0.15;
  canvas.drawRRect(
    rrect(cx - c / 2 + i, cy - c / 2 + i, c - i * 2, c - i * 2, c * 0.12),
    paint('rgba(130, 205, 255, 0.13)'),
  );
  canvas.drawRRect(
    rrect(cx - c / 2 + i, cy - c / 2 + i, c - i * 2, c - i * 2, c * 0.12),
    stroke('rgba(170, 225, 255, 0.55)', 1.2),
  );
  const chevron = stroke('#cdeeff', Math.max(1.6, c * 0.055));
  for (const dy of [-0.1, 0.12]) {
    const y = cy + dy * c;
    const b = Skia.PathBuilder.Make()
      .moveTo(cx - c * 0.16, y + c * 0.08)
      .lineTo(cx, y - c * 0.08)
      .lineTo(cx + c * 0.16, y + c * 0.08);
    canvas.drawPath(b.build(), chevron);
  }
  canvas.restore();
}

export type PieceMode = 'free' | 'fixed' | 'pivot' | 'hinted';

/** Draws a piece centred on (0, 0). Mirrors are drawn as `/`; turn the canvas for `\`. */
export function drawPiece(
  canvas: SkCanvas,
  piece: Piece,
  c: number,
  look: BoardLook,
  mode: PieceMode,
  colourAid: boolean,
) {
  const iron = mode === 'fixed';
  const metal = iron ? (['#a9adb8', '#4f5361'] as const) : look.metal;
  if (mode === 'hinted') {
    canvas.drawCircle(0, 0, c * 0.47, blur(paint(withAlpha('#ffd36b', 0.55)), 5));
    canvas.drawCircle(0, 0, c * 0.45, stroke('#ffd36b', 1.6));
  }
  if (piece.type === 'mirror') {
    if (mode === 'pivot') {
      // The hub it turns on, and a faint turning arrow.
      const ring = stroke(withAlpha(look.metal[0], 0.4), 1.4);
      canvas.drawArc(Skia.XYWHRect(-c * 0.42, -c * 0.42, c * 0.84, c * 0.84), 200, 50, false, ring);
      canvas.drawArc(Skia.XYWHRect(-c * 0.42, -c * 0.42, c * 0.84, c * 0.84), 20, 50, false, ring);
    }
    canvas.save();
    canvas.rotate(-45, 0, 0);
    const L = c * 1.0;
    const T = c * 0.17;
    canvas.drawRRect(rrect(-L / 2, -T / 2 + 2, L, T, T / 2), blur(paint('rgba(0,0,0,0.5)'), 2.5));
    canvas.drawRRect(
      rrect(-L / 2, -T / 2, L, T, T / 2),
      linear(paint(), 0, -T / 2, 0, T / 2, [metal[1], metal[0], metal[1]]),
    );
    const g = T * 0.24;
    canvas.drawRRect(
      rrect(-L / 2 + g * 1.6, -T / 2 + g, L - g * 3.2, T - g * 2, (T - g * 2) / 2),
      linear(paint(), 0, -T / 2, 0, T / 2, ['#f7fbff', '#a9bad6', '#eef4ff']),
    );
    canvas.drawLine(
      -L / 2 + T,
      -T * 0.12,
      L / 2 - T,
      -T * 0.12,
      stroke('rgba(255,255,255,0.85)', Math.max(1, T * 0.12)),
    );
    if (iron) {
      for (const x of [-L / 2 + T * 0.55, L / 2 - T * 0.55]) {
        canvas.drawCircle(x, 0, T * 0.26, paint('#3a3d47'));
        canvas.drawCircle(x - T * 0.06, -T * 0.06, T * 0.1, paint('#e8eaf0'));
      }
    }
    canvas.restore();
    if (mode === 'pivot') {
      canvas.drawCircle(
        0,
        0,
        c * 0.1,
        linear(paint(), 0, -c * 0.1, 0, c * 0.1, [look.metal[0], look.metal[1]]),
      );
      canvas.drawCircle(0, 0, c * 0.04, paint('#2a1a10'));
    }
    return;
  }
  if (piece.type === 'prism') {
    const r = c * 0.31;
    const b = Skia.PathBuilder.Make()
      .moveTo(0, -r)
      .lineTo(r, 0)
      .lineTo(0, r)
      .lineTo(-r, 0)
      .close()
      .build();
    canvas.drawPath(b, blur(paint('rgba(0,0,0,0.45)'), 3));
    canvas.drawPath(b, linear(paint(), -r, -r, r, r, ['#fff4ff', '#c3a8ff', '#86e6ff', '#e8dbff']));
    const facet = stroke('rgba(255,255,255,0.65)', 1);
    canvas.drawLine(0, -r, 0, r, facet);
    canvas.drawLine(-r, 0, r, 0, facet);
    canvas.drawPath(b, stroke(iron ? '#5a5f6e' : 'rgba(255,255,255,0.9)', iron ? 2.2 : 1.4));
    if (iron) {
      for (const [x, y] of [
        [0, -r * 0.62],
        [r * 0.62, 0],
        [0, r * 0.62],
        [-r * 0.62, 0],
      ] as const) {
        canvas.drawCircle(x, y, c * 0.03, paint('#3a3d47'));
      }
    }
    return;
  }
  // Coloured glass.
  const hue = lightColour(piece.hue, look);
  const s = c * 0.6;
  canvas.drawRRect(rrect(-s / 2, -s / 2 + 2, s, s, c * 0.12), blur(paint('rgba(0,0,0,0.45)'), 3));
  canvas.drawRRect(
    rrect(-s / 2, -s / 2, s, s, c * 0.12),
    linear(paint(), -s / 2, -s / 2, s / 2, s / 2, [
      withAlpha(mix(hue, '#ffffff', 0.35), 0.8),
      withAlpha(hue, 0.55),
    ]),
  );
  canvas.drawRRect(
    rrect(-s / 2, -s / 2, s, s, c * 0.12),
    stroke(iron ? '#5a5f6e' : mix(hue, '#ffffff', 0.45), iron ? 2.6 : 1.8),
  );
  canvas.drawLine(
    -s * 0.28,
    s * 0.05,
    s * 0.05,
    -s * 0.28,
    stroke('rgba(255,255,255,0.55)', Math.max(1.2, c * 0.04)),
  );
  if (colourAid) drawSymbols(canvas, piece.hue, 0, s * 0.12, c * 0.16);
}

/** Shapes for colour: triangle red, circle yellow, square blue. Mixes show both. */
export function drawSymbols(canvas: SkCanvas, mask: number, cx: number, cy: number, size: number) {
  const marks = [RED, YELLOW, BLUE].filter((m) => (mask & m) !== 0);
  if (marks.length === 0 || mask === WHITE) return;
  const gap = size * 1.25;
  const x0 = cx - (gap * (marks.length - 1)) / 2;
  const ink = paint('#1a0e24');
  const fill = paint('#ffffff');
  marks.forEach((m, i) => {
    const x = x0 + i * gap;
    const r = size / 2;
    if (m === RED) {
      const t = Skia.PathBuilder.Make()
        .moveTo(x, cy - r)
        .lineTo(x + r, cy + r * 0.8)
        .lineTo(x - r, cy + r * 0.8)
        .close()
        .build();
      canvas.drawPath(t, stroke('#1a0e24', 3));
      canvas.drawPath(t, fill);
    } else if (m === YELLOW) {
      canvas.drawCircle(x, cy, r * 0.9 + 1.2, ink);
      canvas.drawCircle(x, cy, r * 0.9, fill);
    } else {
      canvas.drawRect(
        Skia.XYWHRect(x - r * 0.8 - 1.2, cy - r * 0.8 - 1.2, r * 1.6 + 2.4, r * 1.6 + 2.4),
        ink,
      );
      canvas.drawRect(Skia.XYWHRect(x - r * 0.8, cy - r * 0.8, r * 1.6, r * 1.6), fill);
    }
  });
}

/** Where a lamp's flame (or glow) sits, relative to its cell centre. */
export function lampAnchor(style: LampStyle, c: number): { x: number; y: number; glow: boolean } {
  switch (style) {
    case 'diya':
      return { x: c * 0.27, y: -c * 0.12, glow: false };
    case 'candle':
      return { x: 0, y: -c * 0.3, glow: false };
    case 'lantern':
      return { x: 0, y: c * 0.04, glow: false };
    case 'bulb':
      return { x: 0, y: c * 0.06, glow: true };
    case 'paper':
      return { x: 0, y: 0, glow: true };
  }
}

/** A lamp's body, wearing the colour it wants. Sleeping lamps are grey-blue with a moon. */
export function drawLampBody(
  canvas: SkCanvas,
  style: LampStyle,
  need: number,
  cx: number,
  cy: number,
  c: number,
  look: BoardLook,
  colourAid: boolean,
  sleeper: boolean,
) {
  const want = sleeper ? '#9aa3c6' : need === WHITE ? '#fff1cf' : lightColour(need, look);
  const body = sleeper ? '#59607a' : look.body;
  canvas.save();
  canvas.translate(cx, cy);
  canvas.drawOval(
    Skia.XYWHRect(-c * 0.36, c * 0.26, c * 0.72, c * 0.12),
    blur(paint('rgba(0,0,0,0.5)'), 3),
  );
  switch (style) {
    case 'diya': {
      const bowl = Skia.PathBuilder.Make()
        .moveTo(-c * 0.38, -c * 0.04)
        .cubicTo(-c * 0.36, c * 0.36, c * 0.3, c * 0.36, c * 0.33, -c * 0.04)
        .lineTo(c * 0.44, -c * 0.13)
        .lineTo(c * 0.2, -c * 0.06)
        .close()
        .build();
      canvas.drawPath(
        bowl,
        linear(paint(), 0, -c * 0.1, 0, c * 0.3, [
          mix(body, '#ffffff', 0.25),
          body,
          mix(body, '#000000', 0.45),
        ]),
      );
      // The painted band in the lamp's colour.
      const band = Skia.PathBuilder.Make()
        .moveTo(-c * 0.33, c * 0.07)
        .cubicTo(-c * 0.22, c * 0.24, c * 0.18, c * 0.24, c * 0.29, c * 0.07)
        .build();
      canvas.save();
      canvas.clipPath(bowl, ClipOp.Intersect, true);
      canvas.drawPath(band, stroke(want, c * 0.1));
      for (let k = 0; k < 5; k++) {
        const t = (k + 0.5) / 5;
        canvas.drawCircle(
          -c * 0.28 + t * c * 0.52,
          c * 0.14 + Math.sin(t * Math.PI) * c * 0.05,
          c * 0.016,
          paint(withAlpha('#ffffff', 0.85)),
        );
      }
      canvas.restore();
      canvas.drawOval(
        Skia.XYWHRect(-c * 0.38, -c * 0.1, c * 0.71, c * 0.13),
        paint(mix(body, '#000000', 0.15)),
      );
      canvas.drawOval(Skia.XYWHRect(-c * 0.32, -c * 0.075, c * 0.58, c * 0.08), paint('#3a1a0e'));
      canvas.drawLine(
        c * 0.24,
        -c * 0.07,
        c * 0.3,
        -c * 0.12,
        stroke('#2a120a', Math.max(1.2, c * 0.03)),
      );
      if (colourAid) drawSymbols(canvas, need, -c * 0.04, c * 0.2, c * 0.13);
      break;
    }
    case 'candle': {
      canvas.drawRRect(
        rrect(-c * 0.3, c * 0.22, c * 0.6, c * 0.1, c * 0.05),
        linear(paint(), 0, c * 0.22, 0, c * 0.32, [look.metal[0], look.metal[1]]),
      );
      canvas.drawRRect(
        rrect(-c * 0.12, -c * 0.27, c * 0.24, c * 0.5, c * 0.04),
        linear(paint(), -c * 0.12, 0, c * 0.12, 0, [
          mix(want, '#000000', 0.25),
          mix(want, '#ffffff', 0.35),
          mix(want, '#000000', 0.15),
        ]),
      );
      canvas.drawRRect(
        rrect(-c * 0.12, -c * 0.27, c * 0.08, c * 0.14, c * 0.04),
        paint(withAlpha('#ffffff', 0.35)),
      );
      canvas.drawLine(0, -c * 0.27, 0, -c * 0.33, stroke('#2a1a10', Math.max(1.2, c * 0.025)));
      if (colourAid) drawSymbols(canvas, need, 0, c * 0.05, c * 0.13);
      break;
    }
    case 'bulb': {
      canvas.drawRRect(
        rrect(-c * 0.1, -c * 0.38, c * 0.2, c * 0.15, c * 0.03),
        linear(paint(), -c * 0.1, 0, c * 0.1, 0, [look.metal[1], look.metal[0], look.metal[1]]),
      );
      const bulb = Skia.PathBuilder.Make()
        .moveTo(-c * 0.08, -c * 0.24)
        .cubicTo(-c * 0.36, c * 0.0, -c * 0.3, c * 0.36, 0, c * 0.36)
        .cubicTo(c * 0.3, c * 0.36, c * 0.36, c * 0.0, c * 0.08, -c * 0.24)
        .close()
        .build();
      canvas.drawPath(
        bulb,
        radial(paint(), -c * 0.08, c * 0.02, c * 0.4, [
          withAlpha(mix(want, '#ffffff', 0.4), 0.85),
          withAlpha(want, 0.6),
        ]),
      );
      canvas.drawPath(bulb, stroke(withAlpha(mix(want, '#ffffff', 0.3), 0.9), 1.2));
      canvas.drawOval(
        Skia.XYWHRect(-c * 0.17, -c * 0.06, c * 0.07, c * 0.18),
        paint(withAlpha('#ffffff', 0.55)),
      );
      if (colourAid) drawSymbols(canvas, need, 0, c * 0.14, c * 0.13);
      break;
    }
    case 'lantern': {
      canvas.drawCircle(0, -c * 0.4, c * 0.045, stroke(look.metal[0], 1.4));
      const dome = Skia.PathBuilder.Make()
        .moveTo(-c * 0.2, -c * 0.2)
        .quadTo(0, -c * 0.46, c * 0.2, -c * 0.2)
        .close()
        .build();
      canvas.drawPath(
        dome,
        linear(paint(), 0, -c * 0.4, 0, -c * 0.2, [look.metal[0], look.metal[1]]),
      );
      const panel = Skia.PathBuilder.Make()
        .moveTo(-c * 0.22, -c * 0.2)
        .lineTo(c * 0.22, -c * 0.2)
        .lineTo(c * 0.2, c * 0.2)
        .lineTo(0, c * 0.32)
        .lineTo(-c * 0.2, c * 0.2)
        .close()
        .build();
      canvas.drawPath(
        panel,
        linear(paint(), 0, -c * 0.2, 0, c * 0.3, [
          withAlpha(mix(want, '#ffffff', 0.3), 0.75),
          withAlpha(want, 0.55),
        ]),
      );
      const frame = stroke(look.metal[0], Math.max(1.2, c * 0.03));
      canvas.drawPath(panel, frame);
      canvas.drawLine(0, -c * 0.2, 0, c * 0.32, stroke(withAlpha(look.metal[0], 0.7), 1));
      canvas.drawLine(
        -c * 0.21,
        c * 0.0,
        c * 0.21,
        c * 0.0,
        stroke(withAlpha(look.metal[0], 0.7), 1),
      );
      if (colourAid) drawSymbols(canvas, need, 0, c * 0.12, c * 0.12);
      break;
    }
    case 'paper': {
      canvas.drawRRect(
        rrect(-c * 0.13, -c * 0.37, c * 0.26, c * 0.07, c * 0.02),
        paint(look.metal[1]),
      );
      canvas.drawRRect(
        rrect(-c * 0.13, c * 0.27, c * 0.26, c * 0.07, c * 0.02),
        paint(look.metal[1]),
      );
      const paper = sleeper ? '#6a7090' : need === WHITE ? '#ffe9c4' : want;
      canvas.drawOval(
        Skia.XYWHRect(-c * 0.36, -c * 0.3, c * 0.72, c * 0.58),
        radial(paint(), -c * 0.08, -c * 0.06, c * 0.42, [
          mix(paper, '#ffffff', 0.35),
          paper,
          mix(paper, '#000000', 0.3),
        ]),
      );
      const rib = stroke(withAlpha(mix(paper, '#000000', 0.5), 0.45), 1);
      for (const rx of [0.12, 0.24])
        canvas.drawOval(Skia.XYWHRect(-c * rx, -c * 0.3, c * rx * 2, c * 0.58), rib);
      canvas.drawLine(0, c * 0.34, 0, c * 0.44, stroke(look.metal[0], 1.4));
      if (colourAid) drawSymbols(canvas, need, 0, c * 0.02, c * 0.13);
      break;
    }
  }
  if (sleeper) {
    // A moon and a little "z": this lamp is asleep.
    canvas.drawCircle(c * 0.26, -c * 0.3, c * 0.1, paint('#dfe6ff'));
    canvas.drawCircle(c * 0.3, -c * 0.33, c * 0.085, paint(look.night[1]));
    const z = Skia.PathBuilder.Make()
      .moveTo(-c * 0.34, -c * 0.4)
      .lineTo(-c * 0.24, -c * 0.4)
      .lineTo(-c * 0.34, -c * 0.3)
      .lineTo(-c * 0.24, -c * 0.3)
      .build();
    canvas.drawPath(z, stroke('#dfe6ff', Math.max(1.2, c * 0.03)));
  }
  canvas.restore();
}

/** The flame's brass holder, with a spout pointing the way the light goes. */
export function drawFlameBase(
  canvas: SkCanvas,
  cx: number,
  cy: number,
  c: number,
  dir: Dir,
  look: BoardLook,
) {
  const r = c * 0.36;
  canvas.save();
  canvas.rotate(dir * 90, cx, cy);
  const spout = Skia.PathBuilder.Make()
    .moveTo(cx - r * 0.5, cy - r * 0.7)
    .lineTo(cx, cy - c * 0.52)
    .lineTo(cx + r * 0.5, cy - r * 0.7)
    .close()
    .build();
  canvas.drawPath(
    spout,
    linear(paint(), cx - r, 0, cx + r, 0, [look.metal[1], look.metal[0], look.metal[1]]),
  );
  canvas.restore();
  canvas.drawCircle(cx, cy + 2, r, blur(paint('rgba(0,0,0,0.5)'), 3));
  canvas.drawCircle(
    cx,
    cy,
    r,
    radial(
      paint(),
      cx,
      cy,
      r,
      ['#3a1c08', '#5c3412', mix(look.metal[1], '#000000', 0.2)],
      [0, 0.7, 1],
    ),
  );
  canvas.drawCircle(
    cx,
    cy,
    r,
    linear(stroke('#000', c * 0.06), cx - r, cy - r, cx + r, cy + r, [
      look.metal[0],
      look.metal[1],
      look.metal[0],
    ]),
  );
  const studs = paint(withAlpha(look.metal[0], 0.9));
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    canvas.drawCircle(cx + Math.cos(a) * r * 0.78, cy + Math.sin(a) * r * 0.78, c * 0.018, studs);
  }
}
