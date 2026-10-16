import {
  BlendMode,
  BlurStyle,
  ClipOp,
  PaintStyle,
  Skia,
  StrokeCap,
  TileMode,
  type SkCanvas,
  type SkPicture,
} from '@shopify/react-native-skia';
import type { FieldPictures } from './paint';

/**
 * Everything on the board that moves, painted fresh each frame from a few
 * timestamps: tiles turning on a spring, water filling channel by channel in
 * the order it flows, shimmer running downstream, rice sprouting, spills,
 * rain, and the finale. One picture instead of hundreds of nodes, so a 9×12
 * board stays smooth. All functions here run on the UI thread.
 */

/** How long one tile takes to fill, and the step between tiles downstream (ms). */
export const FILL_MS = 170;
export const STEP_MS = 75;

/** What never changes while a level is on screen (until the layout or look does). */
export interface StaticTile {
  readonly x: number;
  readonly y: number;
  readonly base: SkPicture | null;
  readonly top: SkPicture | null;
  /** True for a bridge: two parts, never turns, its upper water runs east–west. */
  readonly bridge: boolean;
  /** Arms of part 0 in the unturned orientation: flat [dx, dy, …] from the centre, plus their sides. */
  readonly arms: readonly number[];
  readonly sides: readonly number[];
  /** A dead end ends in a little round basin. */
  readonly basin: boolean;
  readonly spring: SkPicture | null;
  /** Rain springs drip from a small cloud. */
  readonly drips: boolean;
  readonly field: FieldPictures | null;
}

/** Per tile, the numbers that change with play (flattened, DYN of them per tile). */
export const DYN = 13;
export const D = {
  turnFrom: 0,
  turnTo: 1,
  turnAt: 2,
  wet0: 3,
  since0: 4,
  /** Side water enters part 0 by, in the unturned orientation; -1 for a spring or when dry. */
  in0: 5,
  wet1: 6,
  since1: 7,
  /** Field: 0 dry, 1 green, 2 wrong water. */
  field: 8,
  greenAt: 9,
  hinted: 10,
  hintAt: 11,
  /** Side water enters a bridge's upper (east–west) channel by, or -1. */
  in1: 12,
} as const;

export interface SceneColours {
  readonly rain: string;
  readonly tank: string;
  readonly mud: string;
  readonly rainfall: string;
  readonly hint: string;
  /** Cloud banks that part on a win. */
  readonly cloud: string;
}

export interface Leak {
  readonly x: number;
  readonly y: number;
  /** Unit direction the water spills towards. */
  readonly dx: number;
  readonly dy: number;
  readonly colour: string;
}

export interface Box {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/** A damped spring from `from` to `to`, `dt` ms after it was let go. */
export function springAt(from: number, to: number, dt: number, calm: boolean): number {
  'worklet';
  if (dt <= 0) return from;
  const s = dt / 1000;
  if (s > 1.5) return to;
  if (calm) {
    const w = 26;
    return to + (from - to) * (1 + w * s) * Math.exp(-w * s);
  }
  const w = 21;
  const z = 0.48;
  const wd = w * Math.sqrt(1 - z * z);
  return (
    to + (from - to) * Math.exp(-z * w * s) * (Math.cos(wd * s) + ((z * w) / wd) * Math.sin(wd * s))
  );
}

function clamp01(v: number): number {
  'worklet';
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function colourOf(bits: number, colours: SceneColours): string {
  'worklet';
  return bits === 3 ? colours.mud : bits === 2 ? colours.tank : colours.rain;
}

/** How full a part is at `t`: filling after it got wet, draining after it went dry. */
function fillOf(wet: number, since: number, t: number): number {
  'worklet';
  if (wet) return clamp01((t - since) / FILL_MS);
  return since > 0 ? 1 - clamp01((t - since) / 140) : 0;
}

/**
 * The water in one part: in by its entry arm to the centre, then out along
 * every other arm at once. A spring's water starts at the centre.
 */
function drawWater(
  canvas: SkCanvas,
  arms: readonly number[],
  sides: readonly number[],
  entry: number,
  f: number,
  colour: string,
  c: number,
  idle: number,
  calm: boolean,
  aid: boolean,
  wetBits: number,
  basin: boolean,
) {
  'worklet';
  if (f <= 0) return;
  const p = Skia.Paint();
  p.setAntiAlias(true);
  p.setStyle(PaintStyle.Stroke);
  p.setStrokeCap(StrokeCap.Round);
  p.setStrokeWidth(c * 0.16);
  p.setColor(Skia.Color(colour));
  const n = arms.length / 2;
  let inIndex = -1;
  for (let k = 0; k < n; k++) if (sides[k] === entry) inIndex = k;
  const first = inIndex >= 0 ? clamp01(f * 2) : 1;
  const second = inIndex >= 0 ? clamp01(f * 2 - 1) : f;
  // Segments as (from x, from y, to x, to y), drawn up to how far the water has got.
  const segs: number[] = [];
  for (let k = 0; k < n; k++) {
    const ex = arms[k * 2]!;
    const ey = arms[k * 2 + 1]!;
    if (k === inIndex) segs.push(ex, ey, ex * (1 - first), ey * (1 - first));
    else if (second > 0) segs.push(0, 0, ex * second, ey * second);
  }
  for (let i = 0; i < segs.length; i += 4)
    canvas.drawLine(segs[i]!, segs[i + 1]!, segs[i + 2]!, segs[i + 3]!, p);
  if (basin && second > 0) {
    p.setStyle(PaintStyle.Fill);
    canvas.drawCircle(0, 0, c * 0.17 * second, p);
    p.setStyle(PaintStyle.Stroke);
  }
  if (f < 1) return;
  // Shimmer: light running downstream along each arm.
  const hi = Skia.Paint();
  hi.setAntiAlias(true);
  hi.setStyle(PaintStyle.Stroke);
  hi.setStrokeCap(StrokeCap.Round);
  hi.setStrokeWidth(c * 0.045);
  hi.setColor(Skia.Color('rgba(255,255,255,0.6)'));
  const half = c * 0.5;
  const speed = c * 0.9;
  const travel = calm ? half * 0.35 : (idle * speed) % half;
  for (let k = 0; k < n; k++) {
    const ex = arms[k * 2]!;
    const ey = arms[k * 2 + 1]!;
    const ux = ex / half;
    const uy = ey / half;
    const inward = k === inIndex;
    for (let j = 0; j < 2; j++) {
      const d = (travel + j * half * 0.5) % half;
      // Water flows from the edge to the centre in the entry arm, outward in the others.
      const at = inward ? half - d : d;
      const len = c * 0.07;
      const sx = ux * at;
      const sy = uy * at;
      const tx = ux * Math.max(0, Math.min(half, at + (inward ? -len : len)));
      const ty = uy * Math.max(0, Math.min(half, at + (inward ? -len : len)));
      canvas.drawLine(sx, sy, tx, ty, hi);
    }
  }
  if (!aid) return;
  // Patterns for the two waters: dots on rain, petals (short bars) on tank water.
  const mark = Skia.Paint();
  mark.setAntiAlias(true);
  mark.setColor(Skia.Color(wetBits === 2 ? 'rgba(80,10,45,0.85)' : 'rgba(5,30,70,0.85)'));
  mark.setStyle(PaintStyle.Stroke);
  mark.setStrokeCap(StrokeCap.Round);
  mark.setStrokeWidth(c * 0.045);
  for (let k = 0; k < n; k++) {
    const ex = arms[k * 2]!;
    const ey = arms[k * 2 + 1]!;
    const ux = ex / half;
    const uy = ey / half;
    for (const at of [half * 0.3, half * 0.75]) {
      const mx = ux * at;
      const my = uy * at;
      if (wetBits === 2) {
        // A petal: a short bar across the stream.
        canvas.drawLine(
          mx - uy * c * 0.065,
          my + ux * c * 0.065,
          mx + uy * c * 0.065,
          my - ux * c * 0.065,
          mark,
        );
      } else if (wetBits === 1) {
        mark.setStyle(PaintStyle.Fill);
        canvas.drawCircle(mx, my, c * 0.04, mark);
        mark.setStyle(PaintStyle.Stroke);
      }
    }
  }
}

export interface SceneInput {
  readonly tiles: readonly StaticTile[];
  readonly dyn: readonly number[];
  readonly leaks: readonly Leak[];
  readonly colours: SceneColours;
  readonly c: number;
  readonly box: Box;
  readonly aid: boolean;
  /** When the board was solved (ms), or -1. */
  readonly winAt: number;
  readonly rainSeeds: readonly number[];
  /** Fireflies over the board (x, y, phase in 0..1), for the night valley. */
  readonly fireflies: readonly number[];
}

/**
 * The win: the clouds part, sunlight washes over the hillside, a rainbow
 * rises over the terraces and birds cross the sky. Calmer motion keeps only
 * the light and the rainbow.
 */
function drawFinale(canvas: SkCanvas, s: SceneInput, dt: number, calm: boolean) {
  'worklet';
  if (dt < 0) return;
  const { x, y, w, h } = s.box;
  const cx = x + w / 2;
  const sec = dt / 1000;
  const p = Skia.Paint();
  p.setAntiAlias(true);
  // Sunlight.
  const sun = clamp01(sec / 0.8);
  p.setBlendMode(BlendMode.Plus);
  p.setShader(
    Skia.Shader.MakeRadialGradient(
      { x: cx, y: y - h * 0.05 },
      Math.max(w, h) * 0.9,
      [Skia.Color('rgba(255, 226, 150, 0.55)'), Skia.Color('rgba(255, 200, 120, 0)')],
      null,
      TileMode.Clamp,
    ),
  );
  p.setAlphaf(sun * (calm ? 0.6 : 0.5 + 0.1 * Math.sin(sec * 2)));
  // Sunlight falls on the hillside only, so it never shows an edge against the screen.
  const m = s.c * 0.25;
  canvas.save();
  canvas.clipRRect(
    Skia.RRectXY(Skia.XYWHRect(x - m, y - m, w + m * 2, h + m * 2), m * 1.6, m * 1.6),
    ClipOp.Intersect,
    true,
  );
  canvas.drawCircle(cx, y - h * 0.05, Math.max(w, h) * 0.9, p);
  canvas.restore();
  p.setShader(null);
  p.setBlendMode(BlendMode.SrcOver);
  // Sun rays.
  if (!calm) {
    canvas.save();
    canvas.clipRRect(
      Skia.RRectXY(Skia.XYWHRect(x - m, y - m, w + m * 2, h + m * 2), m * 1.6, m * 1.6),
      ClipOp.Intersect,
      true,
    );
    const ray = Skia.Paint();
    ray.setAntiAlias(true);
    ray.setBlendMode(BlendMode.Plus);
    ray.setColor(Skia.Color('rgba(255, 236, 190, 0.18)'));
    ray.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, s.c * 0.15, true));
    for (let k = 0; k < 6; k++) {
      const a = Math.PI * (0.2 + k * 0.12) + Math.sin(sec * 0.6 + k) * 0.03;
      const len = Math.max(w, h) * 1.2 * sun;
      const path = Skia.PathBuilder.Make()
        .moveTo(cx, y - h * 0.08)
        .lineTo(cx + Math.cos(a - 0.03) * len, y - h * 0.08 + Math.sin(a - 0.03) * len)
        .lineTo(cx + Math.cos(a + 0.03) * len, y - h * 0.08 + Math.sin(a + 0.03) * len)
        .close()
        .build();
      canvas.drawPath(path, ray);
    }
    canvas.restore();
  }
  // The rainbow: seven bands rising from the terraces.
  const bow = clamp01((sec - (calm ? 0.1 : 0.5)) / 1.2);
  if (bow > 0) {
    const bands = ['#ff6b6b', '#ffa94d', '#ffe066', '#8ce99a', '#66d9e8', '#748ffc', '#b197fc'];
    const r0 = Math.min(w * 0.48, h * 0.62);
    const bcx = cx;
    const bcy = y + h * 0.66;
    const bw = Math.max(2.5, r0 * 0.045);
    const rb = Skia.Paint();
    rb.setAntiAlias(true);
    rb.setStyle(PaintStyle.Stroke);
    rb.setStrokeWidth(bw * 1.15);
    rb.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, bw * 0.35, true));
    for (let k = 0; k < bands.length; k++) {
      rb.setColor(Skia.Color(bands[k]!));
      rb.setAlphaf(0.5 * bow);
      const r = r0 - k * bw;
      const sweep = 180 * clamp01(bow * 1.15);
      canvas.drawArc(Skia.XYWHRect(bcx - r, bcy - r, r * 2, r * 2), 180, sweep, false, rb);
    }
  }
  if (calm) return;
  // Clouds parting: two banks slide off either side.
  const part = clamp01(sec / 1.6);
  const ease = 1 - (1 - part) * (1 - part) * (1 - part);
  if (part < 1) {
    const cloud = Skia.Paint();
    cloud.setAntiAlias(true);
    cloud.setColor(Skia.Color(s.colours.cloud));
    const puff = Math.min(w, h) * 0.16;
    cloud.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, puff * 0.35, true));
    cloud.setAlphaf(0.95 * (1 - part * part));
    for (const side of [-1, 1]) {
      const ox = cx + side * (w * 0.2 + ease * w * 0.85);
      const oy = y + h * 0.16;
      for (let k = 0; k < 6; k++) {
        const r = puff * (0.8 + (k % 3) * 0.3);
        canvas.drawCircle(
          ox + (k - 2.5) * puff * 0.75,
          oy + Math.sin(k * 1.7) * puff * 0.35,
          r,
          cloud,
        );
      }
    }
  }
  // Birds crossing the sky.
  const bird = Skia.Paint();
  bird.setAntiAlias(true);
  bird.setStyle(PaintStyle.Stroke);
  bird.setStrokeCap(StrokeCap.Round);
  bird.setStrokeWidth(Math.max(1.5, s.c * 0.04));
  bird.setColor(Skia.Color('#22313a'));
  for (let k = 0; k < 5; k++) {
    const start = 0.9 + k * 0.22;
    const life = sec - start;
    if (life < 0 || life > 4) continue;
    const bx = x - s.c + (life / 4) * (w + s.c * 2);
    const by = y + h * (0.18 + 0.07 * k) - life * s.c * 0.4 + Math.sin(life * 3 + k) * s.c * 0.1;
    const flap = Math.sin(life * 14 + k) * 0.6;
    const span = s.c * (0.18 + 0.04 * (k % 2));
    bird.setAlphaf(Math.min(1, life * 2) * Math.min(1, (4 - life) * 2));
    const path = Skia.PathBuilder.Make()
      .moveTo(bx - span, by - span * (0.3 + flap * 0.4))
      .quadTo(bx - span * 0.4, by - span * 0.1, bx, by)
      .quadTo(bx + span * 0.4, by - span * 0.1, bx + span, by - span * (0.3 + flap * 0.4))
      .build();
    canvas.drawPath(path, bird);
  }
}

/** Paints the moving board at time `t` (ms); `idle` drives decoration and stops under calmer motion. */
export function drawScene(canvas: SkCanvas, s: SceneInput, t: number, idle: number, calm: boolean) {
  'worklet';
  const { tiles, dyn, c } = s;
  for (let i = 0; i < tiles.length; i++) {
    const tile = tiles[i]!;
    const o = i * DYN;
    const angle = tile.bridge
      ? 0
      : springAt(dyn[o + D.turnFrom]!, dyn[o + D.turnTo]!, t - dyn[o + D.turnAt]!, calm);
    canvas.save();
    canvas.translate(tile.x, tile.y);
    canvas.rotate(angle * 90, 0, 0);
    if (tile.base) canvas.drawPicture(tile.base);
    const wet0 = dyn[o + D.wet0]!;
    const f0 = fillOf(wet0, dyn[o + D.since0]!, t);
    drawWater(
      canvas,
      tile.arms,
      tile.sides,
      dyn[o + D.in0]!,
      f0,
      colourOf(wet0 || 1, s.colours),
      c,
      idle,
      calm,
      s.aid,
      wet0,
      tile.basin,
    );
    if (tile.top) canvas.drawPicture(tile.top);
    if (tile.bridge) {
      const wet1 = dyn[o + D.wet1]!;
      const f1 = fillOf(wet1, dyn[o + D.since1]!, t);
      const arch = [-c * 0.5, 0, c * 0.5, 0];
      const archSides = [3, 1];
      drawWater(
        canvas,
        arch,
        archSides,
        dyn[o + D.in1]!,
        f1,
        colourOf(wet1 || 1, s.colours),
        c,
        idle,
        calm,
        s.aid,
        wet1,
        false,
      );
    }
    canvas.restore();

    if (tile.spring || tile.field) {
      canvas.save();
      canvas.translate(tile.x, tile.y);
      if (tile.spring) {
        canvas.drawPicture(tile.spring);
        if (tile.drips && !calm) {
          const drop = Skia.Paint();
          drop.setAntiAlias(true);
          drop.setColor(Skia.Color(s.colours.rain));
          for (let k = 0; k < 3; k++) {
            const ph = (((idle / 900 + k / 3 + (i % 7) * 0.13) % 1) + 1) % 1;
            drop.setAlphaf(0.9 * (1 - ph));
            canvas.drawCircle((k - 1) * c * 0.09, -c * 0.26 + ph * c * 0.24, c * 0.022, drop);
          }
        }
      }
      if (tile.field) {
        const state = dyn[o + D.field]!;
        canvas.drawPicture(tile.field.plot);
        const flood = state === 0 ? 0 : clamp01((t - dyn[o + D.since0]! - FILL_MS * 0.6) / 260);
        if (flood > 0) {
          const layer = Skia.Paint();
          layer.setAlphaf(flood);
          canvas.saveLayer(layer);
          canvas.drawPicture(state === 2 ? tile.field.murky : tile.field.flooded);
          canvas.restore();
        }
        if (state === 1) {
          const grow = springAt(0, 1, t - dyn[o + D.greenAt]!, calm);
          if (grow > 0.01) {
            canvas.save();
            canvas.scale(grow, grow);
            canvas.drawPicture(tile.field.crop);
            canvas.restore();
          }
        }
      }
      canvas.restore();
    }

    if (dyn[o + D.hinted]) {
      const since = t - dyn[o + D.hintAt]!;
      const rim = Skia.Paint();
      rim.setAntiAlias(true);
      rim.setStyle(PaintStyle.Stroke);
      rim.setStrokeWidth(Math.max(2, c * 0.05));
      rim.setColor(Skia.Color(s.colours.hint));
      const pop = since < 600 ? 1 + 0.25 * (1 - since / 600) : 1;
      const h = c * 0.46 * pop;
      canvas.drawRRect(
        Skia.RRectXY(Skia.XYWHRect(tile.x - h, tile.y - h, h * 2, h * 2), c * 0.14, c * 0.14),
        rim,
      );
    }
  }

  // Spills: water running out over the edge of an open end.
  if (s.leaks.length) {
    const p = Skia.Paint();
    p.setAntiAlias(true);
    for (let k = 0; k < s.leaks.length; k++) {
      const l = s.leaks[k]!;
      p.setColor(Skia.Color(l.colour));
      const px = l.x;
      const py = l.y;
      const pulse = calm ? 0.5 : (idle / 700 + k * 0.31) % 1;
      p.setStyle(PaintStyle.Stroke);
      p.setStrokeWidth(Math.max(1.5, c * 0.03));
      p.setAlphaf(0.85 * (1 - pulse));
      canvas.drawCircle(px + l.dx * c * 0.08, py + l.dy * c * 0.08, c * (0.08 + 0.16 * pulse), p);
      p.setStyle(PaintStyle.Fill);
      p.setAlphaf(0.9);
      canvas.drawCircle(px + l.dx * c * 0.06, py + l.dy * c * 0.06, c * 0.07, p);
      for (let j = 0; j < 3; j++) {
        const ph = calm ? 0.4 + j * 0.15 : (idle / 520 + j / 3 + k * 0.17) % 1;
        const side = (j - 1) * 0.6;
        const dx = l.dx + l.dy * side;
        const dy = l.dy - l.dx * side;
        p.setAlphaf(1 - ph);
        canvas.drawCircle(
          px + dx * c * (0.08 + ph * 0.22),
          py + dy * c * (0.08 + ph * 0.22) + ph * ph * c * 0.08,
          c * 0.035,
          p,
        );
      }
    }
  }

  // Rain over the hillside.
  if (!calm && s.rainSeeds.length) {
    const rp = Skia.Paint();
    rp.setAntiAlias(true);
    rp.setStyle(PaintStyle.Stroke);
    rp.setStrokeCap(StrokeCap.Round);
    rp.setStrokeWidth(Math.max(1, c * 0.018));
    rp.setColor(Skia.Color(s.colours.rainfall));
    const win = s.winAt >= 0 ? clamp01((t - s.winAt) / 900) : 0;
    const { x, y, w, h } = s.box;
    const seeds = s.rainSeeds;
    for (let k = 0; k < seeds.length; k += 3) {
      const speed = 0.5 + seeds[k + 2]! * 0.35;
      const fall = ((idle / 1000) * speed + seeds[k + 1]!) % 1;
      const rx = x + seeds[k]! * w - fall * h * 0.12;
      const ry = y - h * 0.05 + fall * h * 1.1;
      rp.setAlphaf((1 - win) * (0.4 + 0.6 * seeds[k + 2]!));
      canvas.drawLine(rx, ry, rx - c * 0.06, ry + c * 0.28, rp);
    }
  }

  // Fireflies wander and blink over the night valley.
  if (s.fireflies.length) {
    const ff = Skia.Paint();
    ff.setAntiAlias(true);
    ff.setColor(Skia.Color('#e9ff8a'));
    ff.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Solid, c * 0.07, false));
    const { x, y, w, h } = s.box;
    for (let k = 0; k < s.fireflies.length; k += 3) {
      const ph = s.fireflies[k + 2]! * 6.28;
      const sec = idle / 1000;
      const fx = x + s.fireflies[k]! * w + Math.sin(sec * 0.4 + ph) * c * 0.5;
      const fy = y + s.fireflies[k + 1]! * h + Math.cos(sec * 0.33 + ph * 1.3) * c * 0.35;
      const blink = calm ? 0.8 : Math.max(0, Math.sin(sec * 1.7 + ph * 2));
      ff.setAlphaf(0.25 + 0.75 * blink);
      canvas.drawCircle(fx, fy, c * 0.085, ff);
    }
  }

  if (s.winAt >= 0) drawFinale(canvas, s, t - s.winAt, calm);
}
