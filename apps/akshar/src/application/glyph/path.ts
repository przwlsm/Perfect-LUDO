/**
 * Glyph outlines as plain path commands, in the same shape Skia's
 * `SkPath.toCmds()` uses, so outlines from Skia (on phones) and from the
 * TrueType reader (on the web, in tests) are handled by one set of pure
 * functions: flattening, bounds, fitting, hit-testing and SVG export.
 */
export const MOVE = 0;
export const LINE = 1;
export const QUAD = 2;
export const CONIC = 3;
export const CUBIC = 4;
export const CLOSE = 5;

/** `[verb, ...points]`, exactly like Skia's PathCommand. */
export type Cmd = readonly number[];

export interface Pt {
  readonly x: number;
  readonly y: number;
}

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** A closed polygon as flat x,y pairs. */
export type Polygon = readonly number[];

/** Turns curves into short straight segments (`steps` per curve). */
export function flatten(cmds: readonly Cmd[], steps = 8): Polygon[] {
  const out: number[][] = [];
  let poly: number[] = [];
  let cx = 0;
  let cy = 0;
  const finish = () => {
    if (poly.length >= 6) out.push(poly);
    poly = [];
  };
  for (const c of cmds) {
    switch (c[0]) {
      case MOVE:
        finish();
        cx = c[1]!;
        cy = c[2]!;
        poly.push(cx, cy);
        break;
      case LINE:
        cx = c[1]!;
        cy = c[2]!;
        poly.push(cx, cy);
        break;
      case QUAD:
      case CONIC: {
        const [x1, y1, x2, y2] = [c[1]!, c[2]!, c[3]!, c[4]!];
        const w = c[0] === CONIC ? c[5]! : 1;
        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          const a = (1 - t) * (1 - t);
          const b = 2 * t * (1 - t) * w;
          const d = t * t;
          const den = a + b + d;
          poly.push((a * cx + b * x1 + d * x2) / den, (a * cy + b * y1 + d * y2) / den);
        }
        cx = x2;
        cy = y2;
        break;
      }
      case CUBIC: {
        const [x1, y1, x2, y2, x3, y3] = [c[1]!, c[2]!, c[3]!, c[4]!, c[5]!, c[6]!];
        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          const u = 1 - t;
          poly.push(
            u * u * u * cx + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3,
            u * u * u * cy + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3,
          );
        }
        cx = x3;
        cy = y3;
        break;
      }
      case CLOSE:
        finish();
        break;
    }
  }
  finish();
  return out;
}

export function boundsOf(polys: readonly Polygon[]): Rect {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const p of polys) {
    for (let i = 0; i < p.length; i += 2) {
      x0 = Math.min(x0, p[i]!);
      x1 = Math.max(x1, p[i]!);
      y0 = Math.min(y0, p[i + 1]!);
      y1 = Math.max(y1, p[i + 1]!);
    }
  }
  if (!Number.isFinite(x0)) return { x: 0, y: 0, width: 0, height: 0 };
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
}

/**
 * A point-in-glyph test with the non-zero winding rule TrueType outlines
 * use (so a counter, like the hole in ক, is outside).
 */
export function makeContains(polys: readonly Polygon[]): (x: number, y: number) => boolean {
  // Edges as flat [x1, y1, x2, y2] runs, built once.
  const edges: number[] = [];
  for (const p of polys) {
    const n = p.length / 2;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      edges.push(p[2 * i]!, p[2 * i + 1]!, p[2 * j]!, p[2 * j + 1]!);
    }
  }
  const b = boundsOf(polys);
  return (x, y) => {
    if (x < b.x || y < b.y || x > b.x + b.width || y > b.y + b.height) return false;
    let winding = 0;
    for (let k = 0; k < edges.length; k += 4) {
      const x1 = edges[k]!;
      const y1 = edges[k + 1]!;
      const x2 = edges[k + 2]!;
      const y2 = edges[k + 3]!;
      if (y1 <= y) {
        if (y2 > y && (x2 - x1) * (y - y1) - (x - x1) * (y2 - y1) > 0) winding++;
      } else if (y2 <= y && (x2 - x1) * (y - y1) - (x - x1) * (y2 - y1) < 0) {
        winding--;
      }
    }
    return winding !== 0;
  };
}

/** Scales by `s` about the origin, then moves by (dx, dy). */
export function transformCmds(cmds: readonly Cmd[], s: number, dx: number, dy: number): Cmd[] {
  return cmds.map((c) =>
    c.map((v, i) => {
      if (i === 0) return v;
      // A conic's last number is its weight, not a coordinate.
      if (c[0] === CONIC && i === 5) return v;
      return i % 2 === 1 ? v * s + dx : v * s + dy;
    }),
  );
}

/** How to scale and move a glyph so it sits centred in a `box`-sized square. */
export interface Fit {
  readonly scale: number;
  readonly dx: number;
  readonly dy: number;
}

/**
 * Fits `bounds` into a square of side `box`, filling `fill` of it, but
 * never magnifying beyond `maxScale` (so a tiny mark like the Tamil āytam
 * stays a small mark, not a giant one).
 */
export function fitToBox(bounds: Rect, box: number, fill = 0.72, maxScale = Infinity): Fit {
  const size = Math.max(bounds.width, bounds.height, 1e-6);
  const scale = Math.min((box * fill) / size, maxScale);
  return {
    scale,
    dx: (box - bounds.width * scale) / 2 - bounds.x * scale,
    dy: (box - bounds.height * scale) / 2 - bounds.y * scale,
  };
}

const r = (v: number) => Math.round(v * 100) / 100;

/** SVG path data, which Skia reads with `Skia.Path.MakeFromSVGString`. */
export function toSvg(cmds: readonly Cmd[]): string {
  const parts: string[] = [];
  for (const c of cmds) {
    switch (c[0]) {
      case MOVE:
        parts.push(`M${r(c[1]!)} ${r(c[2]!)}`);
        break;
      case LINE:
        parts.push(`L${r(c[1]!)} ${r(c[2]!)}`);
        break;
      case QUAD:
        parts.push(`Q${r(c[1]!)} ${r(c[2]!)} ${r(c[3]!)} ${r(c[4]!)}`);
        break;
      case CONIC:
        // SVG has no conics; a quad through the same control point is close enough for a guide.
        parts.push(`Q${r(c[1]!)} ${r(c[2]!)} ${r(c[3]!)} ${r(c[4]!)}`);
        break;
      case CUBIC:
        parts.push(`C${r(c[1]!)} ${r(c[2]!)} ${r(c[3]!)} ${r(c[4]!)} ${r(c[5]!)} ${r(c[6]!)}`);
        break;
      case CLOSE:
        parts.push('Z');
        break;
    }
  }
  return parts.join('');
}
