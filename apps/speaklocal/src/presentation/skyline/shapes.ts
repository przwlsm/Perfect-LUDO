import { PathOp, Skia, type SkPath, type SkPathBuilder } from '@shopify/react-native-skia';
import { random } from 'app-kit';
import type { Skyline } from '@/domain/content/languages';

/**
 * Each city's skyline as stylised silhouettes: shapes that suggest a
 * landmark (a domed assembly hall, a temple gateway tower, four minarets,
 * a fort gate, a seafront arch, a cantilever bridge, fishing nets, a war
 * memorial arch) without copying any building or logo.
 *
 * Coordinates: `cx` is the landmark's centre, `g` the ground line, `u` one
 * unit (a hundredth of the scene height).
 */
export interface Landmark {
  /** Filled silhouette, with arches and colonnades cut through. */
  readonly fill: SkPath;
  /** Stroked lines (bridge trusses, fishing-net poles). */
  readonly stroke: SkPath | null;
  readonly strokeWidth: number;
  /** Draw water in front instead of a road. */
  readonly water: boolean;
}

type B = SkPathBuilder;

const rect = (b: B, x0: number, y0: number, x1: number, y1: number) =>
  b.addRect(
    Skia.XYWHRect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0)),
  );

/** A dome sitting on y, half-width rx, height ry. */
function dome(b: B, cx: number, y: number, rx: number, ry: number) {
  b.moveTo(cx - rx, y);
  b.cubicTo(cx - rx, y - ry * 1.1, cx - rx * 0.25, y - ry, cx, y - ry * 1.05);
  b.cubicTo(cx + rx * 0.25, y - ry, cx + rx, y - ry * 1.1, cx + rx, y);
  b.close();
}

/** A round-topped arch opening from ground y, width w, total height h. */
function archHole(b: B, cx: number, y: number, w: number, h: number, pointed = false) {
  const r = w / 2;
  b.moveTo(cx - r, y);
  b.lineTo(cx - r, y - h + r);
  if (pointed) {
    b.quadTo(cx - r, y - h, cx, y - h - r * 0.25);
    b.quadTo(cx + r, y - h, cx + r, y - h + r);
  } else {
    b.cubicTo(cx - r, y - h + r * 0.45, cx - r * 0.55, y - h, cx, y - h);
    b.cubicTo(cx + r * 0.55, y - h, cx + r, y - h + r * 0.45, cx + r, y - h + r);
  }
  b.lineTo(cx + r, y);
  b.close();
}

function finial(b: B, cx: number, y: number, u: number, h = 4) {
  rect(b, cx - 0.35 * u, y, cx + 0.35 * u, y - h * u);
  b.addCircle(cx, y - h * u - 0.6 * u, 0.9 * u);
}

function crenels(b: B, x0: number, x1: number, y: number, u: number) {
  for (let x = x0; x + 2 * u <= x1; x += 4.2 * u) rect(b, x, y, x + 2.2 * u, y - 2.2 * u);
}

function assemblyDome(b: B, o: B, cx: number, g: number, u: number) {
  rect(b, cx - 36 * u, g - 17 * u, cx + 36 * u, g);
  rect(b, cx - 13 * u, g - 24 * u, cx + 13 * u, g);
  b.moveTo(cx - 14 * u, g - 24 * u);
  b.lineTo(cx, g - 30 * u);
  b.lineTo(cx + 14 * u, g - 24 * u);
  b.close();
  rect(b, cx - 7.5 * u, g - 37 * u, cx + 7.5 * u, g - 26 * u);
  dome(b, cx, g - 37 * u, 9 * u, 11 * u);
  finial(b, cx, g - 48 * u, u, 4);
  for (const s of [-1, 1]) {
    const x = cx + s * 27 * u;
    rect(b, x - 3.4 * u, g - 23 * u, x + 3.4 * u, g - 17 * u);
    dome(b, x, g - 23 * u, 4 * u, 4.6 * u);
    finial(b, x, g - 27.8 * u, u, 2);
  }
  // Colonnade: tall see-through gaps between the portico's columns.
  for (let i = -4; i <= 4; i++) {
    if (i === 0) continue;
    const x = cx + i * 2.6 * u;
    rect(o, x - 0.7 * u, g - 2 * u, x + 0.7 * u, g - 19 * u);
  }
}

function gopuram(b: B, o: B, cx: number, g: number, u: number) {
  rect(b, cx - 17 * u, g - 9 * u, cx + 17 * u, g);
  let w = 15.5 * u;
  let y = g - 9 * u;
  for (let i = 0; i < 6; i++) {
    const top = w - 1.7 * u;
    b.moveTo(cx - w, y);
    b.lineTo(cx - top, y - 7 * u);
    b.lineTo(cx + top, y - 7 * u);
    b.lineTo(cx + w, y);
    b.close();
    // A ledge between tiers.
    rect(b, cx - top - 0.9 * u, y - 7 * u, cx + top + 0.9 * u, y - 7.9 * u);
    w = top;
    y -= 7.9 * u;
  }
  // Barrel roof with its row of pot finials.
  b.addRRect(Skia.RRectXY(Skia.XYWHRect(cx - 8 * u, y - 5 * u, 16 * u, 5.5 * u), 2.7 * u, 2.7 * u));
  for (const dx of [-5, -2.5, 0, 2.5, 5]) finial(b, cx + dx * u, y - 4.6 * u, u, 1.8);
  archHole(o, cx, g, 6 * u, 8 * u);
}

function minarets(b: B, o: B, cx: number, g: number, u: number) {
  rect(b, cx - 15 * u, g - 27 * u, cx + 15 * u, g);
  rect(b, cx - 16.5 * u, g - 30 * u, cx + 16.5 * u, g - 27 * u);
  rect(b, cx - 14 * u, g - 38 * u, cx + 14 * u, g - 30 * u);
  dome(b, cx, g - 38 * u, 5 * u, 4.5 * u);
  archHole(o, cx, g, 14 * u, 21 * u, true);
  for (const s of [-1, 1]) {
    const x = cx + s * 16.5 * u;
    rect(b, x - 2.1 * u, g, x + 2.1 * u, g - 54 * u);
    for (const h of [30, 41, 50]) rect(b, x - 3.2 * u, g - h * u, x + 3.2 * u, g - (h + 1.3) * u);
    dome(b, x, g - 54 * u, 2.6 * u, 3.4 * u);
    finial(b, x, g - 57.2 * u, u, 2);
    // Small arched windows up the second storey.
    archHole(o, cx + s * 8 * u, g - 30.5 * u, 3 * u, 6 * u, true);
  }
}

function fortGate(b: B, o: B, cx: number, g: number, u: number) {
  rect(b, cx - 44 * u, g - 15 * u, cx + 44 * u, g);
  crenels(b, cx - 44 * u, cx + 44 * u, g - 15 * u, u);
  for (const s of [-1, 1]) {
    const x = cx + s * 20 * u;
    b.addRRect(Skia.RRectXY(Skia.XYWHRect(x - 6.5 * u, g - 25 * u, 13 * u, 25 * u), 3 * u, 3 * u));
    crenels(b, x - 6.5 * u, x + 6.5 * u, g - 25 * u, u);
  }
  rect(b, cx - 11 * u, g - 31 * u, cx + 11 * u, g);
  crenels(b, cx - 11 * u, cx + 11 * u, g - 31 * u, u);
  // A pavilion over the gate.
  rect(b, cx - 5 * u, g - 38 * u, cx + 5 * u, g - 33 * u);
  dome(b, cx, g - 38 * u, 6 * u, 4 * u);
  finial(b, cx, g - 42 * u, u, 2);
  archHole(o, cx, g, 9 * u, 15 * u, true);
}

function seaArch(b: B, o: B, cx: number, g: number, u: number) {
  rect(b, cx - 23 * u, g - 30 * u, cx + 23 * u, g);
  rect(b, cx - 24 * u, g - 32 * u, cx + 24 * u, g - 30 * u);
  for (const dx of [-20, -8, 8, 20]) {
    const x = cx + dx * u;
    rect(b, x - 2 * u, g - 32 * u, x + 2 * u, g - 40 * u);
    dome(b, x, g - 40 * u, 2.4 * u, 3 * u);
    finial(b, x, g - 43 * u, u, 1.6);
  }
  archHole(o, cx, g, 13 * u, 24 * u, true);
  for (const s of [-1, 1]) archHole(o, cx + s * 15 * u, g, 4.5 * u, 12 * u, true);
}

function memorialArch(b: B, o: B, cx: number, g: number, u: number) {
  rect(b, cx - 19 * u, g - 2.5 * u, cx + 19 * u, g);
  rect(b, cx - 14 * u, g - 40 * u, cx + 14 * u, g - 2.5 * u);
  rect(b, cx - 15.5 * u, g - 42.5 * u, cx + 15.5 * u, g - 40 * u);
  rect(b, cx - 11 * u, g - 49 * u, cx + 11 * u, g - 42.5 * u);
  rect(b, cx - 7 * u, g - 52 * u, cx + 7 * u, g - 49 * u);
  b.moveTo(cx - 4 * u, g - 52 * u);
  b.quadTo(cx, g - 57 * u, cx + 4 * u, g - 52 * u);
  b.close();
  archHole(o, cx, g - 2.5 * u, 12 * u, 26 * u);
}

/** Two cantilever towers and a truss deck: drawn with lines. */
function bridge(fill: B, line: B, cx: number, g: number, u: number, W: number) {
  const deck = g - 9 * u;
  rect(fill, 0, deck, W, deck + 2.2 * u);
  for (const s of [-1, 1]) {
    const x = cx + s * 24 * u;
    const top = g - 50 * u;
    rect(fill, x - 2.2 * u, top, x - 0.6 * u, g);
    rect(fill, x + 0.6 * u, top, x + 2.2 * u, g);
    // Cantilever arms: to the middle and to the shore.
    const reach = s > 0 ? W + 10 : -10;
    line.moveTo(x, top);
    line.lineTo(cx, deck - 8 * u);
    line.moveTo(x, top);
    line.lineTo(reach, deck - 6 * u);
    line.moveTo(x, top + 12 * u);
    line.lineTo(cx, deck);
    line.moveTo(x, top + 12 * u);
    line.lineTo(reach, deck);
    // Zigzag trusses on both arms.
    for (const end of [cx, reach]) {
      const n = 7;
      for (let i = 0; i < n; i++) {
        const t0 = i / n;
        const t1 = (i + 1) / n;
        const xa = x + (end - x) * t0;
        const xb = x + (end - x) * t1;
        const ya = top + (deck - 7 * u - top) * t0;
        line.moveTo(xa, ya);
        line.lineTo(xb, deck);
      }
    }
  }
}

/** Cantilevered fishing nets on the water, and a palm. */
function nets(fill: B, line: B, cx: number, g: number, u: number) {
  for (const [dx, scale] of [
    [-14, 1],
    [16, 0.8],
  ] as const) {
    const x = cx + dx * u;
    const s = scale * u;
    const tip = { x: x + 20 * s, y: g - 36 * s };
    line.moveTo(x - 4 * s, g);
    line.lineTo(tip.x, tip.y);
    line.moveTo(x + 4 * s, g);
    line.lineTo(tip.x, tip.y);
    line.moveTo(x, g);
    line.lineTo(x - 10 * s, g - 22 * s);
    // Ropes and the hanging net.
    const a = { x: tip.x - 8 * s, y: g - 10 * s };
    const c = { x: tip.x + 8 * s, y: g - 10 * s };
    line.moveTo(tip.x, tip.y);
    line.lineTo(a.x, a.y);
    line.moveTo(tip.x, tip.y);
    line.lineTo(c.x, c.y);
    line.moveTo(a.x, a.y);
    line.quadTo(tip.x, g - 2 * s, c.x, c.y);
    // Weights on the counter end.
    fill.addCircle(x - 10 * s, g - 22 * s, 1.4 * s);
    fill.addCircle(x - 8.5 * s, g - 19 * s, 1.1 * s);
  }
  // A small boat.
  const bx = cx - 34 * u;
  fill.moveTo(bx - 7 * u, g - 2.5 * u);
  fill.quadTo(bx, g + 1.5 * u, bx + 7 * u, g - 2.5 * u);
  fill.close();
  // A coconut palm on the shore.
  const px = cx + 38 * u;
  line.moveTo(px, g);
  line.quadTo(px - 2 * u, g - 16 * u, px + 3 * u, g - 30 * u);
  const top = { x: px + 3 * u, y: g - 30 * u };
  for (const [ex, ey] of [
    [-11, 4],
    [-8, -3],
    [10, 5],
    [8, -3],
    [1, -8],
  ] as const) {
    fill.moveTo(top.x, top.y);
    fill.quadTo(top.x + ex * u * 0.5, top.y + ey * u * 0.5 - 3 * u, top.x + ex * u, top.y + ey * u);
    fill.quadTo(top.x + ex * u * 0.5, top.y + ey * u * 0.5 - 1 * u, top.x, top.y + 0.8 * u);
    fill.close();
  }
}

export function landmark(kind: Skyline, W: number, H: number): Landmark {
  const u = H / 100;
  const g = H * 0.84;
  const cx = W * 0.58;
  const fill = Skia.PathBuilder.Make();
  const holes = Skia.PathBuilder.Make();
  const line = Skia.PathBuilder.Make();
  let stroke = false;
  let water = false;
  switch (kind) {
    case 'dome':
      assemblyDome(fill, holes, cx, g, u);
      break;
    case 'gopuram':
      gopuram(fill, holes, cx, g, u);
      break;
    case 'minarets':
      minarets(fill, holes, cx, g, u);
      break;
    case 'fort':
      fortGate(fill, holes, cx, g, u);
      break;
    case 'gateway':
      seaArch(fill, holes, cx, g, u);
      water = true;
      break;
    case 'bridge':
      bridge(fill, line, cx, g, u, W);
      stroke = true;
      water = true;
      break;
    case 'boats':
      nets(fill, line, cx, g, u);
      stroke = true;
      water = true;
      break;
    case 'arch':
      memorialArch(fill, holes, cx, g, u);
      break;
  }
  const solid = fill.build();
  const cut = holes.isEmpty()
    ? solid
    : (Skia.Path.MakeFromOp(solid, holes.build(), PathOp.Difference) ?? solid);
  return { fill: cut, stroke: stroke ? line.build() : null, strokeWidth: 0.9 * u, water };
}

/** Distant blocks, near buildings (kept clear of the landmark) and their lit windows. */
export function city(kind: Skyline, W: number, H: number) {
  const u = H / 100;
  const g = H * 0.84;
  const cx = W * 0.58;
  const rnd = random(kind.length * 977 + Math.round(W));
  const far = Skia.PathBuilder.Make();
  for (let x = -4; x < W;) {
    const w = (5 + rnd() * 9) * u;
    const h = (14 + rnd() * 26) * u;
    rect(far, x, g - h, x + w, g);
    x += w + rnd() * 2 * u;
  }
  const near = Skia.PathBuilder.Make();
  const lit = Skia.PathBuilder.Make();
  const clear = kind === 'bridge' || kind === 'boats' ? 0 : 30 * u;
  for (let x = -2; x < W;) {
    const w = (7 + rnd() * 9) * u;
    const h = (10 + rnd() * 20) * u;
    const mid = x + w / 2;
    const hidden = Math.abs(mid - cx) < clear + w / 2;
    const short = kind === 'bridge' || kind === 'boats';
    if (!hidden && !(short && Math.abs(mid - cx) < 46 * u)) {
      rect(near, x, g - h * (short ? 0.6 : 1), x + w, g);
      const top = g - h * (short ? 0.6 : 1);
      for (let wy = top + 2.5 * u; wy < g - 3 * u; wy += 3.6 * u) {
        for (let wx = x + 1.6 * u; wx < x + w - 2 * u; wx += 3 * u) {
          if (rnd() < 0.42) rect(lit, wx, wy, wx + 1.3 * u, wy + 1.6 * u);
        }
      }
    }
    x += w + (1 + rnd() * 3) * u;
  }
  return { far: far.build(), near: near.build(), lit: lit.build(), ground: g };
}

/** An auto-rickshaw, facing right, its rear wheel at (0, 0) on the road. */
export function autoRickshaw(u: number) {
  const body = Skia.PathBuilder.Make();
  body.moveTo(-2 * u, -1.6 * u);
  body.lineTo(-2.4 * u, -5.5 * u);
  body.quadTo(-2.2 * u, -6.6 * u, -0.8 * u, -6.6 * u);
  body.lineTo(6.2 * u, -6.6 * u);
  body.quadTo(8.4 * u, -6.4 * u, 9.6 * u, -3.4 * u);
  body.lineTo(10.2 * u, -1.6 * u);
  body.close();
  const canopy = Skia.PathBuilder.Make();
  canopy.moveTo(-2.3 * u, -6.4 * u);
  canopy.quadTo(-2.4 * u, -11 * u, 1.5 * u, -11 * u);
  canopy.lineTo(6.5 * u, -11 * u);
  canopy.quadTo(8.6 * u, -10.8 * u, 8.6 * u, -6.4 * u);
  canopy.close();
  const glass = Skia.PathBuilder.Make();
  glass.moveTo(6.6 * u, -6.5 * u);
  glass.lineTo(8.3 * u, -6.5 * u);
  glass.lineTo(8.3 * u, -10.2 * u);
  glass.close();
  return { body: body.build(), canopy: canopy.build(), glass: glass.build() };
}
