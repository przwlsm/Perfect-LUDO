/**
 * Rangoli and kolam are drawn around a centre: whatever the hand draws in
 * one slice repeats in every other, and mirrored in between. A stroke is
 * stored once and drawn once per slice with one of these transforms.
 */
export interface SliceTransform {
  /** Rotation about the centre, in radians. */
  readonly rotate: number;
  /** Reflect across the slice's own axis before rotating. */
  readonly mirror: boolean;
}

export const FOLD_CHOICES = [4, 6, 8, 12] as const;
export type Folds = (typeof FOLD_CHOICES)[number];

export function slices(folds: number, mirror: boolean): SliceTransform[] {
  const out: SliceTransform[] = [];
  for (let k = 0; k < folds; k++) {
    const rotate = (k / folds) * Math.PI * 2;
    out.push({ rotate, mirror: false });
    if (mirror) out.push({ rotate, mirror: true });
  }
  return out;
}

/** Where a point lands under a slice transform, about centre (cx, cy). */
export function applySlice(
  s: SliceTransform,
  x: number,
  y: number,
  cx: number,
  cy: number,
): { x: number; y: number } {
  const dx = s.mirror ? -(x - cx) : x - cx;
  const dy = y - cy;
  const cos = Math.cos(s.rotate);
  const sin = Math.sin(s.rotate);
  return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
}

/**
 * Smooths a finger's path into quadratic curves through the midpoints of
 * its samples: the classic trick that turns jagged input into a fluid line.
 * Returns the moveTo point and a list of [controlX, controlY, endX, endY].
 */
export function midpointCurve(points: readonly number[]): {
  start: [number, number];
  quads: [number, number, number, number][];
} | null {
  const n = points.length / 2;
  if (n === 0) return null;
  const start: [number, number] = [points[0]!, points[1]!];
  const quads: [number, number, number, number][] = [];
  for (let k = 1; k < n - 1; k++) {
    const x = points[2 * k]!;
    const y = points[2 * k + 1]!;
    const nx = points[2 * k + 2]!;
    const ny = points[2 * k + 3]!;
    quads.push([x, y, (x + nx) / 2, (y + ny) / 2]);
  }
  if (n > 1) {
    const lx = points[2 * n - 2]!;
    const ly = points[2 * n - 1]!;
    quads.push([lx, ly, lx, ly]);
  }
  return { start, quads };
}
