import { Skia, type SkPath } from '@shopify/react-native-skia';
import { random } from 'app-kit';
import { LINE, type Puzzle } from '@/domain/entities/Board';
import type { Grid } from '@/application/engine/grid';
import { insideCells, type Marks } from '@/application/engine/rules';
import { cellXY, dotXY, edgeMid, type BoardGeom } from './geometry';

/** Every drawn side as one path of straight strokes. */
export function linesPath(geom: BoardGeom, grid: Grid, marks: Marks): SkPath {
  const b = Skia.PathBuilder.Make();
  for (let e = 0; e < grid.edgeCount; e++) {
    if (marks[e] !== LINE) continue;
    const a = dotXY(geom, grid, grid.edgeDots[e * 2]!);
    const z = dotXY(geom, grid, grid.edgeDots[e * 2 + 1]!);
    b.moveTo(a.x, a.y).lineTo(z.x, z.y);
  }
  return b.build();
}

/** Small ✕ marks at the middle of the given sides. */
export function crossesPath(geom: BoardGeom, grid: Grid, edges: Iterable<number>): SkPath {
  const b = Skia.PathBuilder.Make();
  const s = Math.max(3, geom.cell * 0.09);
  for (const e of edges) {
    const { x, y } = edgeMid(geom, grid, e);
    b.moveTo(x - s, y - s).lineTo(x + s, y + s);
    b.moveTo(x + s, y - s).lineTo(x - s, y + s);
  }
  return b.build();
}

/** Only the given sides, as straight strokes (hint glows). */
export function edgesPath(geom: BoardGeom, grid: Grid, edges: readonly number[]): SkPath {
  const b = Skia.PathBuilder.Make();
  for (const e of edges) {
    const a = dotXY(geom, grid, grid.edgeDots[e * 2]!);
    const z = dotXY(geom, grid, grid.edgeDots[e * 2 + 1]!);
    b.moveTo(a.x, a.y).lineTo(z.x, z.y);
  }
  return b.build();
}

/**
 * The finished loop as a kolam: every corner becomes a curve running from
 * the middle of one side to the middle of the next, so the line flows the
 * way a hand lets the flour fall. `order` lists the loop's dots in turn.
 */
export function kolamPath(geom: BoardGeom, grid: Grid, order: readonly number[]): SkPath {
  const pts = order.map((d) => dotXY(geom, grid, d));
  const n = pts.length;
  const b = Skia.PathBuilder.Make();
  if (n < 3) return b.build();
  const mid = (i: number) => {
    const p = pts[i % n]!;
    const q = pts[(i + 1) % n]!;
    return { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
  };
  const start = mid(n - 1);
  b.moveTo(start.x, start.y);
  for (let i = 0; i < n; i++) {
    const p = pts[i]!;
    const m = mid(i);
    b.quadTo(p.x, p.y, m.x, m.y);
  }
  b.close();
  return b.build();
}

export interface Bloom {
  /** Rice dots (pulli) inside each lobe of the kolam: x, y, delay (s). */
  readonly pulli: readonly number[];
  /** Little flowers deep inside: x, y, delay (s), colour index. */
  readonly flowers: readonly number[];
  /** Falling petals: x, start delay, speed, sway phase, colour index, size. */
  readonly petals: readonly number[];
}

/**
 * What blooms when a board is solved: a rice dot in every square inside the
 * loop, small flowers where the inside is deepest, and marigold petals.
 * Everything opens in a ripple from the centre.
 */
export function bloomOf(p: Puzzle, solution: Marks, geom: BoardGeom): Bloom {
  const inside = insideCells(p, solution);
  const cx = geom.bx + (geom.cols * geom.cell) / 2;
  const cy = geom.by + (geom.rows * geom.cell) / 2;
  const far = Math.hypot(cx - geom.bx, cy - geom.by) || 1;
  const delayAt = (x: number, y: number, base: number) =>
    base + (Math.hypot(x - cx, y - cy) / far) * 0.9;
  const rnd = random(p.rows * 977 + p.cols * 131 + inside.size * 7);
  const isIn = (r: number, c: number) =>
    r >= 0 && c >= 0 && r < p.rows && c < p.cols && inside.has(r * p.cols + c);

  const pulli: number[] = [];
  const flowers: number[] = [];
  const deep: number[] = [];
  for (const cell of inside) {
    const r = Math.floor(cell / p.cols);
    const c = cell % p.cols;
    if (isIn(r - 1, c) && isIn(r + 1, c) && isIn(r, c - 1) && isIn(r, c + 1)) deep.push(cell);
  }
  // A few flowers, spread out: never two side by side.
  const flowerCells = new Set<number>();
  for (const cell of deep.sort((a, b) => a - b)) {
    const r = Math.floor(cell / p.cols);
    const c = cell % p.cols;
    let near = false;
    for (const f of flowerCells) {
      const fr = Math.floor(f / p.cols);
      const fc = f % p.cols;
      if (Math.abs(fr - r) <= 1 && Math.abs(fc - c) <= 1) near = true;
    }
    if (!near && flowerCells.size < 2 + Math.floor(p.rows / 3)) flowerCells.add(cell);
  }
  for (const cell of inside) {
    const { x, y } = cellXY(geom, p.cols, cell);
    if (flowerCells.has(cell)) flowers.push(x, y, delayAt(x, y, 2.0), Math.floor(rnd() * 3));
    else pulli.push(x, y, delayAt(x, y, 1.45));
  }

  const petals: number[] = [];
  const count = 18 + Math.min(14, p.rows * 2);
  for (let i = 0; i < count; i++) {
    petals.push(
      geom.floor.x + rnd() * geom.floor.w,
      1.1 + rnd() * 3.2,
      0.55 + rnd() * 0.6,
      rnd() * Math.PI * 2,
      Math.floor(rnd() * 4),
      0.7 + rnd() * 0.6,
    );
  }
  return { pulli, flowers, petals };
}
