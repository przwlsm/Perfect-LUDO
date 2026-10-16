import {
  BlurStyle,
  PaintStyle,
  Skia,
  StrokeCap,
  TileMode,
  createPicture,
  type SkCanvas,
  type SkPaint,
  type SkPicture,
} from '@shopify/react-native-skia';
import { mix, random, withAlpha } from 'app-kit';
import { baseMask, DX, DY, isFixed, type Level, type Tile } from '@/domain/entities/Board';
import type { BoardLook, GroundLight } from '../theme/looks';
import type { BoardLayout } from './layout';

/**
 * Painters for everything on the board that only changes when the board
 * does: the terraced hillside, the frame, rocks and their plants, and each
 * tile's stone channel in its unturned orientation (the scene turns it).
 * Recorded into pictures on the JS thread.
 */

export function paint(color?: string): SkPaint {
  const p = Skia.Paint();
  p.setAntiAlias(true);
  if (color) p.setColor(Skia.Color(color));
  return p;
}

export function stroke(color: string, width: number, cap: StrokeCap = StrokeCap.Round): SkPaint {
  const p = paint(color);
  p.setStyle(PaintStyle.Stroke);
  p.setStrokeWidth(width);
  p.setStrokeCap(cap);
  return p;
}

function linear(p: SkPaint, x0: number, y0: number, x1: number, y1: number, colors: string[]) {
  p.setShader(
    Skia.Shader.MakeLinearGradient(
      { x: x0, y: y0 },
      { x: x1, y: y1 },
      colors.map((c) => Skia.Color(c)),
      null,
      TileMode.Clamp,
    ),
  );
  return p;
}

function radial(p: SkPaint, x: number, y: number, r: number, colors: string[]) {
  p.setShader(
    Skia.Shader.MakeRadialGradient(
      { x, y },
      r,
      colors.map((c) => Skia.Color(c)),
      null,
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

/** Channel proportions, as shares of a cell. */
export const CHANNEL = {
  wall: 0.46,
  stone: 0.4,
  bed: 0.22,
  water: 0.16,
  basin: 0.2,
} as const;

// ---------------------------------------------------------------- the hillside

/**
 * The frame and the terraced hillside: each row is a terrace step with a
 * wavy darker lip at its foot, and rocks sit where no channel runs.
 */
export function drawGround(
  canvas: SkCanvas,
  l: BoardLayout,
  level: Level,
  look: BoardLook,
  ground: GroundLight,
) {
  const { bx, by, bw, bh, cell: c, pad } = l;
  const fx = bx - pad;
  const fy = by - pad;
  const fw = bw + pad * 2;
  const fh = bh + pad * 2;
  const r = pad + c * 0.18;
  // Soft shadow under the whole hillside.
  canvas.drawRRect(rrect(fx + 2, fy + 3, fw - 4, fh - 2, r), blur(paint('rgba(0,0,0,0.3)'), 2.5));
  // The earthen frame.
  canvas.drawRRect(
    rrect(fx, fy, fw, fh, r),
    linear(paint(), fx, fy, fx, fy + fh, [...ground.frame]),
  );
  canvas.drawRRect(
    rrect(fx + 1, fy + 1, fw - 2, fh - 2, r - 1),
    stroke(withAlpha('#ffffff', 0.14), 1.5),
  );
  // Terraces.
  canvas.save();
  canvas.clipRRect(rrect(bx, by, bw, bh, c * 0.16), 1, true);
  canvas.drawRect(
    Skia.XYWHRect(bx, by, bw, bh),
    linear(paint(), 0, by, 0, by + bh, [...ground.hill]),
  );
  const wave = random(level.w * 31 + level.h * 7);
  for (let y = 0; y < level.h; y++) {
    const top = by + y * c;
    const tint = ground.terrace[y % 2]!;
    canvas.drawRect(
      Skia.XYWHRect(bx, top, bw, c),
      linear(paint(), 0, top, 0, top + c, [mix(tint, '#ffffff', 0.04), tint]),
    );
    // The lip: a gently wavy band at the foot of the step, with light catching its top edge.
    const lip = Skia.PathBuilder.Make();
    const base = top + c;
    const amp = c * 0.035;
    const phase = wave() * 6;
    lip.moveTo(bx, base);
    const steps = level.w * 4;
    for (let k = 0; k <= steps; k++) {
      const x = bx + (bw * k) / steps;
      lip.lineTo(x, base - c * 0.07 + Math.sin(k * 0.9 + phase) * amp);
    }
    lip.lineTo(bx + bw, base);
    lip.close();
    canvas.drawPath(lip.build(), paint(withAlpha(ground.lip, 0.75)));
    const edge = Skia.PathBuilder.Make();
    for (let k = 0; k <= steps; k++) {
      const x = bx + (bw * k) / steps;
      const yy = base - c * 0.07 + Math.sin(k * 0.9 + phase) * amp;
      if (k === 0) edge.moveTo(x, yy);
      else edge.lineTo(x, yy);
    }
    canvas.drawPath(edge.build(), stroke(withAlpha('#ffffff', 0.12), Math.max(1, c * 0.02)));
  }
  // Grass texture: tiny strokes scattered over every step.
  const g = random(level.w * 977 + level.h);
  const blade = stroke(
    withAlpha(mix(ground.terrace[0], '#ffffff', 0.25), 0.35),
    Math.max(1, c * 0.015),
  );
  for (let k = 0; k < level.w * level.h * 3; k++) {
    const x = bx + g() * bw;
    const y = by + g() * bh;
    canvas.drawLine(x, y, x + (g() - 0.5) * c * 0.05, y - c * 0.06, blade);
  }
  canvas.restore();

  level.tiles.forEach((tile, at) => {
    const x = bx + ((at % level.w) + 0.5) * c;
    const y = by + (Math.floor(at / level.w) + 0.5) * c;
    if (tile.kind === 'rock') drawRock(canvas, x, y, c, look, at);
    else if (isFixed(tile)) drawPins(canvas, x, y, c);
  });
}

/** A boulder with moss, or whatever grows in this valley. */
function drawRock(
  canvas: SkCanvas,
  x: number,
  y: number,
  c: number,
  look: BoardLook,
  seed: number,
) {
  const r = random(seed * 7919 + 13);
  const plant = r() < 0.4;
  if (plant && look.flora !== 'grass' && look.flora !== 'firefly') {
    drawFlora(canvas, x, y, c, look, r);
    return;
  }
  // Two or three stones, the largest at the back.
  const stones = 1 + Math.floor(r() * 2.4);
  for (let s = 0; s < stones; s++) {
    const sx = x + (r() - 0.5) * c * 0.3;
    const sy = y + (r() - 0.5) * c * 0.25 + s * c * 0.06;
    const rad = c * (0.3 - s * 0.07) * (0.85 + r() * 0.3);
    const path = Skia.PathBuilder.Make();
    const points = 9;
    for (let k = 0; k <= points; k++) {
      const a = (k / points) * Math.PI * 2;
      const wob = 0.82 + r() * 0.22;
      const px = sx + Math.cos(a) * rad * wob * 1.12;
      const py = sy + Math.sin(a) * rad * wob * 0.86;
      if (k === 0) path.moveTo(px, py);
      else path.lineTo(px, py);
    }
    path.close();
    const shape = path.build();
    canvas.drawOval(
      Skia.XYWHRect(sx - rad * 1.05, sy + rad * 0.45, rad * 2.1, rad * 0.6),
      blur(paint('rgba(0,0,0,0.3)'), c * 0.04),
    );
    canvas.drawPath(
      shape,
      linear(paint(), sx - rad, sy - rad, sx + rad * 0.6, sy + rad, [look.rock[0], look.rock[1]]),
    );
    canvas.drawPath(shape, stroke(withAlpha('#000000', 0.25), Math.max(1, c * 0.015)));
    // Light on top, moss on the shaded side.
    canvas.drawOval(
      Skia.XYWHRect(sx - rad * 0.55, sy - rad * 0.7, rad * 0.8, rad * 0.35),
      paint(withAlpha('#ffffff', 0.22)),
    );
    if (r() < 0.7)
      canvas.drawOval(
        Skia.XYWHRect(sx - rad * 0.2, sy + rad * 0.15, rad * 1.0, rad * 0.45),
        paint(withAlpha(look.moss, 0.75)),
      );
  }
  if (look.flora === 'grass' || look.flora === 'firefly') {
    const tuft = stroke(look.flora === 'grass' ? '#7fbf4f' : '#5d8fa0', Math.max(1, c * 0.025));
    for (let k = 0; k < 4; k++) {
      const gx = x + (r() - 0.5) * c * 0.8;
      const gy = y + c * 0.32;
      canvas.drawLine(gx, gy, gx + (r() - 0.5) * c * 0.08, gy - c * (0.08 + r() * 0.06), tuft);
    }
  }
}

/** Palms by the backwaters, tea bushes on the slope, cactus by the stepwell. */
function drawFlora(
  canvas: SkCanvas,
  x: number,
  y: number,
  c: number,
  look: BoardLook,
  r: () => number,
) {
  canvas.drawOval(
    Skia.XYWHRect(x - c * 0.28, y + c * 0.2, c * 0.56, c * 0.16),
    blur(paint('rgba(0,0,0,0.3)'), c * 0.03),
  );
  if (look.flora === 'tea') {
    // A round, clipped tea bush with lighter new leaves.
    canvas.drawCircle(
      x,
      y + c * 0.04,
      c * 0.34,
      linear(paint(), x, y - c * 0.3, x, y + c * 0.35, ['#4e9a4a', '#22552a']),
    );
    for (let k = 0; k < 9; k++) {
      const a = r() * Math.PI * 2;
      const d = r() * c * 0.24;
      canvas.drawCircle(
        x + Math.cos(a) * d,
        y + Math.sin(a) * d - c * 0.04,
        c * 0.045,
        paint('#8fd36a'),
      );
    }
    return;
  }
  if (look.flora === 'palm') {
    // A coconut palm leaning over the water.
    const trunk = Skia.PathBuilder.Make()
      .moveTo(x - c * 0.04, y + c * 0.32)
      .quadTo(x - c * 0.02, y, x + c * 0.08, y - c * 0.22)
      .build();
    canvas.drawPath(trunk, stroke('#8a6440', c * 0.07));
    const leaf = stroke('#3f9a52', c * 0.06);
    for (const a of [-2.6, -1.9, -1.2, -0.5, 0.2]) {
      const lx = x + c * 0.08 + Math.cos(a) * c * 0.3;
      const ly = y - c * 0.22 + Math.sin(a) * c * 0.18 + c * 0.08;
      const p = Skia.PathBuilder.Make()
        .moveTo(x + c * 0.08, y - c * 0.22)
        .quadTo((x + c * 0.08 + lx) / 2, y - c * 0.36, lx, ly)
        .build();
      canvas.drawPath(p, leaf);
    }
    canvas.drawCircle(x + c * 0.07, y - c * 0.17, c * 0.04, paint('#6b4a2a'));
    return;
  }
  // A small cactus with arms.
  const green = stroke('#5c9e4f', c * 0.13);
  canvas.drawLine(x, y + c * 0.3, x, y - c * 0.22, green);
  const arm = stroke('#5c9e4f', c * 0.09);
  canvas.drawPath(
    Skia.PathBuilder.Make()
      .moveTo(x, y + c * 0.06)
      .lineTo(x - c * 0.16, y + c * 0.06)
      .lineTo(x - c * 0.16, y - c * 0.1)
      .build(),
    arm,
  );
  canvas.drawPath(
    Skia.PathBuilder.Make()
      .moveTo(x, y - c * 0.02)
      .lineTo(x + c * 0.15, y - c * 0.02)
      .lineTo(x + c * 0.15, y - c * 0.16)
      .build(),
    arm,
  );
  canvas.drawCircle(x, y - c * 0.26, c * 0.04, paint('#ff8fb0'));
}

/** Iron pins at the corners and a dark iron frame: this tile is fixed. */
function drawPins(canvas: SkCanvas, x: number, y: number, c: number) {
  canvas.drawRRect(
    rrect(x - c * 0.47, y - c * 0.47, c * 0.94, c * 0.94, c * 0.12),
    paint('rgba(0,0,0,0.22)'),
  );
  canvas.drawRRect(
    rrect(x - c * 0.45, y - c * 0.45, c * 0.9, c * 0.9, c * 0.11),
    stroke('rgba(40, 44, 52, 0.75)', Math.max(1.5, c * 0.035)),
  );
  for (const [dx, dy] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ] as const) {
    const px = x + dx * c * 0.36;
    const py = y + dy * c * 0.36;
    canvas.drawCircle(
      px,
      py,
      c * 0.075,
      radial(paint(), px - c * 0.02, py - c * 0.02, c * 0.09, ['#e2e5ea', '#5a5f69', '#2a2d33']),
    );
    canvas.drawCircle(px, py, c * 0.075, stroke('rgba(0,0,0,0.55)', Math.max(1, c * 0.014)));
  }
}

// ---------------------------------------------------------------- channels

/** Ends of the arms a tile opens in its unturned orientation, relative to its centre. */
export function arms(mask: number, c: number): [number, number][] {
  const out: [number, number][] = [];
  for (let d = 0; d < 4; d++) if (mask & (1 << d)) out.push([DX[d]! * c * 0.5, DY[d]! * c * 0.5]);
  return out;
}

/** Stone walls and the dry bed of a channel, arms from the centre to each open side. */
function drawChannel(canvas: SkCanvas, mask: number, c: number, look: BoardLook, basin: boolean) {
  const ends = arms(mask, c);
  const butt = StrokeCap.Butt;
  const layer = (color: string, width: number, extra = 0) => {
    const p = stroke(color, width, butt);
    for (const [ex, ey] of ends) canvas.drawLine(0, 0, ex, ey, p);
    canvas.drawCircle(0, 0, width / 2 + extra, paint(color));
  };
  // Shadow, outline, stone, bed.
  const shade = stroke('rgba(0,0,0,0.28)', c * CHANNEL.wall, butt);
  blur(shade, c * 0.03);
  for (const [ex, ey] of ends) canvas.drawLine(0, c * 0.03, ex, ey + c * 0.03, shade);
  layer(look.stone[1], c * CHANNEL.wall, basin ? c * 0.06 : 0);
  layer(look.stone[0], c * CHANNEL.stone, basin ? c * 0.06 : 0);
  // A little texture: joints between stone blocks.
  const joint = stroke(withAlpha(look.stone[1], 0.6), Math.max(1, c * 0.012), butt);
  for (const [ex, ey] of ends) {
    const nx = ey === 0 ? 0 : 1;
    const ny = ex === 0 ? 0 : 1;
    const jx = ex * 0.62;
    const jy = ey * 0.62;
    const w = c * CHANNEL.stone * 0.5;
    canvas.drawLine(jx - nx * w, jy - ny * w, jx - nx * w * 0.55, jy - ny * w * 0.55, joint);
    canvas.drawLine(jx + nx * w * 0.55, jy + ny * w * 0.55, jx + nx * w, jy + ny * w, joint);
  }
  layer(look.bed, c * CHANNEL.bed, basin ? c * 0.07 : 0);
}

/** The stone channel of a tile, unturned, centred on (0, 0). Null for tiles drawn otherwise. */
export function channelPicture(tile: Tile, c: number, look: BoardLook): SkPicture | null {
  if (tile.kind === 'rock') return null;
  const bounds = Skia.XYWHRect(-c, -c, c * 2, c * 2);
  if (tile.kind === 'bridge') {
    // The lower channel runs north–south; the arch is drawn above the water.
    return createPicture((canvas) => drawChannel(canvas, 0b0101, c, look, false), bounds);
  }
  const mask = baseMask(tile);
  const deadEnd = tile.kind === 'pipe' && (mask & (mask - 1)) === 0;
  return createPicture((canvas) => drawChannel(canvas, mask, c, look, deadEnd), bounds);
}

/** What sits above a tile's water and turns with it: a dam's gate and arrow, a bridge's arch. */
export function topPicture(tile: Tile, c: number, look: BoardLook): SkPicture | null {
  const bounds = Skia.XYWHRect(-c, -c, c * 2, c * 2);
  if (tile.kind === 'dam') {
    return createPicture((canvas) => {
      // Unturned, water leaves by `out`. Draw facing east, then turn to it.
      canvas.save();
      canvas.rotate((tile.out - 1) * 90, 0, 0);
      const post = paint('#7a5232');
      const wood = linear(paint(), 0, -c * 0.3, 0, c * 0.3, ['#b8834f', '#6e4626']);
      canvas.drawRRect(rrect(-c * 0.07, -c * 0.27, c * 0.14, c * 0.54, c * 0.04), wood);
      canvas.drawRRect(
        rrect(-c * 0.07, -c * 0.27, c * 0.14, c * 0.54, c * 0.04),
        stroke('rgba(0,0,0,0.4)', Math.max(1, c * 0.015)),
      );
      canvas.drawCircle(0, -c * 0.27, c * 0.05, post);
      canvas.drawCircle(0, c * 0.27, c * 0.05, post);
      // The arrow: which way the water may go.
      const arrow = Skia.PathBuilder.Make()
        .moveTo(c * 0.16, -c * 0.1)
        .lineTo(c * 0.3, 0)
        .lineTo(c * 0.16, c * 0.1)
        .build();
      const ink = stroke('#fff4d8', c * 0.06);
      ink.setStrokeJoin(1);
      canvas.drawPath(arrow, stroke('rgba(0,0,0,0.45)', c * 0.1));
      canvas.drawPath(arrow, ink);
      canvas.restore();
    }, bounds);
  }
  if (tile.kind === 'bridge') {
    return createPicture((canvas) => {
      // A stone arch carrying the east–west channel over the north–south one.
      const w = c * CHANNEL.wall + c * 0.08;
      canvas.drawRRect(
        rrect(-c * 0.5, -w / 2 + c * 0.05, c, w, c * 0.06),
        blur(paint('rgba(0,0,0,0.4)'), c * 0.05),
      );
      canvas.drawRRect(
        rrect(-c * 0.5, -w / 2, c, w, c * 0.06),
        linear(paint(), 0, -w / 2, 0, w / 2, [mix(look.stone[0], '#ffffff', 0.15), look.stone[1]]),
      );
      const rail = stroke(withAlpha('#000000', 0.25), Math.max(1, c * 0.015), StrokeCap.Butt);
      canvas.drawLine(-c * 0.5, -w / 2, c * 0.5, -w / 2, rail);
      canvas.drawLine(-c * 0.5, w / 2, c * 0.5, w / 2, rail);
      canvas.drawRect(
        Skia.XYWHRect(-c * 0.5, (-c * CHANNEL.bed) / 2, c, c * CHANNEL.bed),
        paint(look.bed),
      );
      // Keystones at either side of the arch.
      for (const sx of [-1, 1]) {
        canvas.drawRRect(
          rrect(sx * c * 0.36 - c * 0.04, -w / 2 - c * 0.03, c * 0.08, w + c * 0.06, c * 0.02),
          paint(look.stone[1]),
        );
      }
    }, bounds);
  }
  return null;
}

// ---------------------------------------------------------------- springs and fields

/** A spring basin under its rain cloud, or the stepped temple tank. Drawn upright. */
export function springPicture(water: 0 | 1, c: number, look: BoardLook): SkPicture {
  return createPicture(
    (canvas) => {
      if (water === 0) {
        const r = c * 0.25;
        canvas.drawCircle(0, c * 0.03, r + c * 0.03, blur(paint('rgba(0,0,0,0.35)'), c * 0.04));
        canvas.drawCircle(0, 0, r, linear(paint(), 0, -r, 0, r, [look.stone[0], look.stone[1]]));
        canvas.drawCircle(
          0,
          0,
          r * 0.72,
          radial(paint(), -r * 0.2, -r * 0.2, r, [
            mix(look.rainWater, '#ffffff', 0.5),
            look.rainWater,
            mix(look.rainWater, '#003050', 0.35),
          ]),
        );
        canvas.drawCircle(0, 0, r * 0.72, stroke('rgba(0,0,0,0.3)', Math.max(1, c * 0.015)));
        // The rain cloud that feeds it.
        const cloud = Skia.PathBuilder.Make()
          .addCircle(-c * 0.13, -c * 0.33, c * 0.1)
          .addCircle(0, -c * 0.39, c * 0.13)
          .addCircle(c * 0.14, -c * 0.33, c * 0.1)
          .addRRect(rrect(-c * 0.24, -c * 0.35, c * 0.48, c * 0.12, c * 0.06))
          .build();
        canvas.save();
        canvas.translate(0, c * 0.03);
        canvas.drawPath(cloud, blur(paint('rgba(0,0,0,0.3)'), c * 0.03));
        canvas.restore();
        canvas.drawPath(cloud, linear(paint(), 0, -c * 0.52, 0, -c * 0.23, ['#ffffff', '#c9d9e3']));
      } else {
        // Three stone steps down to the water.
        const steps = [0.3, 0.24, 0.18];
        canvas.drawRRect(
          rrect(-c * 0.31, -c * 0.28, c * 0.62, c * 0.62, c * 0.06),
          blur(paint('rgba(0,0,0,0.35)'), c * 0.04),
        );
        steps.forEach((s, k) => {
          canvas.drawRRect(
            rrect(-c * s, -c * s, c * s * 2, c * s * 2, c * 0.04),
            paint(mix(look.stone[0], look.stone[1], k * 0.3)),
          );
          canvas.drawRRect(
            rrect(-c * s, -c * s, c * s * 2, c * s * 2, c * 0.04),
            stroke('rgba(0,0,0,0.25)', Math.max(1, c * 0.012)),
          );
        });
        canvas.drawRRect(
          rrect(-c * 0.12, -c * 0.12, c * 0.24, c * 0.24, c * 0.03),
          linear(paint(), 0, -c * 0.12, 0, c * 0.12, [
            mix(look.tankWater, '#ffffff', 0.4),
            look.tankWater,
          ]),
        );
        // Stone posts at the corners of the tank.
        for (const [px, py] of [
          [-1, -1],
          [1, -1],
          [-1, 1],
          [1, 1],
        ] as const) {
          canvas.drawCircle(px * c * 0.27, py * c * 0.27, c * 0.055, paint(look.stone[1]));
          canvas.drawCircle(
            px * c * 0.27 - c * 0.012,
            py * c * 0.27 - c * 0.012,
            c * 0.035,
            paint(look.stone[0]),
          );
        }
      }
    },
    Skia.XYWHRect(-c, -c, c * 2, c * 2),
  );
}

export interface FieldPictures {
  /** The dyke and dry soil. */
  readonly plot: SkPicture;
  /** The water surface, faded in as the field fills. */
  readonly flooded: SkPicture;
  /** Rice shoots or lily pads and a lotus, scaled in as they sprout. */
  readonly crop: SkPicture;
  /** Murky water when the wrong water arrives. */
  readonly murky: SkPicture;
}

/** A rice paddy (rain) or a lotus pond (temple tank), upright, centred on (0, 0). */
export function fieldPictures(water: 0 | 1, c: number, look: BoardLook): FieldPictures {
  const bounds = Skia.XYWHRect(-c, -c, c * 2, c * 2);
  const s = c * 0.33;
  const shape = (canvas: SkCanvas, p: SkPaint, inset = 0) => {
    if (water === 0)
      canvas.drawRRect(
        rrect(-s + inset, -s + inset, (s - inset) * 2, (s - inset) * 2, c * 0.08),
        p,
      );
    else canvas.drawCircle(0, 0, s - inset, p);
  };
  const plot = createPicture((canvas) => {
    canvas.save();
    canvas.translate(0, c * 0.03);
    shape(canvas, blur(paint('rgba(0,0,0,0.35)'), c * 0.04));
    canvas.restore();
    shape(canvas, paint(mix(look.soil, '#000000', 0.15)));
    shape(
      canvas,
      linear(paint(), 0, -s, 0, s, [mix(look.soil, '#ffffff', 0.12), look.soil]),
      c * 0.05,
    );
    // Dry cracks.
    const crack = stroke(withAlpha('#000000', 0.25), Math.max(1, c * 0.012));
    canvas.drawLine(-s * 0.5, -s * 0.2, -s * 0.05, s * 0.05, crack);
    canvas.drawLine(-s * 0.05, s * 0.05, s * 0.4, -s * 0.25, crack);
    canvas.drawLine(-s * 0.05, s * 0.05, s * 0.1, s * 0.5, crack);
    // The dyke rim.
    shape(canvas, stroke(mix(look.soil, '#ffffff', 0.25), Math.max(1.5, c * 0.04)), c * 0.02);
  }, bounds);
  const waterColour = water === 0 ? look.rainWater : look.tankWater;
  const flooded = createPicture((canvas) => {
    shape(
      canvas,
      linear(paint(), 0, -s, 0, s, [
        mix(waterColour, '#ffffff', 0.35),
        waterColour,
        mix(waterColour, '#002040', 0.2),
      ]),
      c * 0.05,
    );
    const glint = stroke(withAlpha('#ffffff', 0.6), Math.max(1, c * 0.02));
    canvas.drawLine(-s * 0.5, -s * 0.45, -s * 0.15, -s * 0.45, glint);
    canvas.drawLine(s * 0.1, s * 0.4, s * 0.4, s * 0.4, glint);
  }, bounds);
  const murky = createPicture((canvas) => {
    shape(canvas, paint(withAlpha(look.mud, 0.95)), c * 0.05);
    const swirl = stroke(withAlpha('#000000', 0.25), Math.max(1, c * 0.02));
    canvas.drawCircle(0, 0, s * 0.35, swirl);
  }, bounds);
  const crop = createPicture((canvas) => {
    if (water === 0) {
      const leaf = stroke(look.rice[0], Math.max(1.2, c * 0.028));
      const dark = stroke(look.rice[1], Math.max(1.2, c * 0.028));
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          const x = -s * 0.56 + i * s * 0.56;
          const y = -s * 0.42 + j * s * 0.56;
          canvas.drawLine(x, y + c * 0.06, x - c * 0.045, y - c * 0.04, dark);
          canvas.drawLine(x, y + c * 0.06, x + c * 0.045, y - c * 0.035, dark);
          canvas.drawLine(x, y + c * 0.06, x, y - c * 0.07, leaf);
        }
      }
    } else {
      // Lily pads and one lotus.
      const pad = paint('#3f9a52');
      for (const [x, y, r] of [
        [-s * 0.4, s * 0.3, s * 0.3],
        [s * 0.42, s * 0.2, s * 0.26],
        [s * 0.1, -s * 0.45, s * 0.22],
      ] as const) {
        canvas.drawCircle(x, y, r, pad);
        canvas.drawLine(
          x,
          y,
          x + r,
          y - r * 0.2,
          stroke(mix('#3f9a52', '#000000', 0.3), Math.max(1, c * 0.015)),
        );
      }
      const petal = paint(look.lotus);
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        canvas.save();
        canvas.rotate((a * 180) / Math.PI, 0, 0);
        canvas.drawOval(Skia.XYWHRect(-s * 0.1, -s * 0.42, s * 0.2, s * 0.36), petal);
        canvas.restore();
      }
      canvas.drawCircle(0, 0, s * 0.12, paint('#ffd76a'));
    }
  }, bounds);
  return { plot, flooded, crop, murky };
}
