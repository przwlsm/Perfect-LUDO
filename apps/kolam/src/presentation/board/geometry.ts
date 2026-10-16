import { gridOf, type Grid } from '@/application/engine/grid';

/** Where the board sits in its canvas, in dp (before any zoom). */
export interface BoardGeom {
  readonly width: number;
  readonly height: number;
  readonly rows: number;
  readonly cols: number;
  /** Distance between neighbouring dots. */
  readonly cell: number;
  /** The top-left dot. */
  readonly bx: number;
  readonly by: number;
  /** The swept floor around the dots. */
  readonly floor: {
    readonly x: number;
    readonly y: number;
    readonly w: number;
    readonly h: number;
  };
}

/** Boards larger than this many squares a side can be zoomed. */
export const ZOOM_FROM = 7;
export const MAX_ZOOM = 3;

/**
 * Fits a board into `width` x `height`: dots as far apart as they can be
 * (up to `maxCell`), with a margin of floor around them.
 */
export function fitBoard(
  rows: number,
  cols: number,
  width: number,
  height: number,
  maxCell = 76,
): BoardGeom {
  const margin = 0.62;
  const cell = Math.max(
    16,
    Math.min(maxCell, (width - 8) / (cols + margin * 2), (height - 8) / (rows + margin * 2)),
  );
  const bw = cell * cols;
  const bh = cell * rows;
  const bx = (width - bw) / 2;
  const by = (height - bh) / 2;
  const m = cell * margin;
  return {
    width,
    height,
    rows,
    cols,
    cell,
    bx,
    by,
    floor: { x: bx - m, y: by - m, w: bw + m * 2, h: bh + m * 2 },
  };
}

export function dotXY(geom: BoardGeom, grid: Grid, d: number): { x: number; y: number } {
  const r = Math.floor(d / (grid.cols + 1));
  const c = d % (grid.cols + 1);
  return { x: geom.bx + c * geom.cell, y: geom.by + r * geom.cell };
}

export function edgeMid(geom: BoardGeom, grid: Grid, e: number): { x: number; y: number } {
  const a = dotXY(geom, grid, grid.edgeDots[e * 2]!);
  const b = dotXY(geom, grid, grid.edgeDots[e * 2 + 1]!);
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function cellXY(geom: BoardGeom, cols: number, cell: number): { x: number; y: number } {
  const r = Math.floor(cell / cols);
  const c = cell % cols;
  return { x: geom.bx + (c + 0.5) * geom.cell, y: geom.by + (r + 0.5) * geom.cell };
}

/**
 * The side nearest a point (in board coordinates), or -1. Hit areas are
 * generous: anywhere within `reach` cells of a side counts, so a finger
 * never has to land exactly between two dots.
 */
export function nearestEdge(geom: BoardGeom, x: number, y: number, reach = 0.5): number {
  const grid = gridOf(geom.rows, geom.cols);
  const fx = (x - geom.bx) / geom.cell;
  const fy = (y - geom.by) / geom.cell;
  let best = -1;
  let bestD = reach;
  // A horizontal side: nearest dot row, the column span under the point.
  const hr = Math.round(fy);
  const hc = Math.floor(fx);
  if (hr >= 0 && hr <= geom.rows && hc >= 0 && hc < geom.cols) {
    const d = Math.abs(fy - hr);
    if (d < bestD) {
      bestD = d;
      best = hr * geom.cols + hc;
    }
  }
  const vc = Math.round(fx);
  const vr = Math.floor(fy);
  if (vc >= 0 && vc <= geom.cols && vr >= 0 && vr < geom.rows) {
    const d = Math.abs(fx - vc);
    if (d < bestD) {
      bestD = d;
      best = grid.horizontalCount + vr * (geom.cols + 1) + vc;
    }
  }
  // Just outside the board, beyond the end of a row or column: no side.
  if (fx < -reach || fy < -reach || fx > geom.cols + reach || fy > geom.rows + reach) return -1;
  return best;
}

/** The dot nearest a point, if it lies within `reach` cells of it; else -1. */
export function nearestDot(geom: BoardGeom, x: number, y: number, reach = 0.42): number {
  const fx = (x - geom.bx) / geom.cell;
  const fy = (y - geom.by) / geom.cell;
  const c = Math.round(fx);
  const r = Math.round(fy);
  if (r < 0 || c < 0 || r > geom.rows || c > geom.cols) return -1;
  if (Math.hypot(fx - c, fy - r) > reach) return -1;
  return r * (geom.cols + 1) + c;
}

/**
 * The dots a finger passes from dot `a` to dot `b`, one step at a time
 * along the grid (a fast drag can skip dots; it should still draw every
 * side it crossed). Excludes `a`, includes `b`.
 */
export function walkDots(cols: number, a: number, b: number): number[] {
  const w = cols + 1;
  let r = Math.floor(a / w);
  let c = a % w;
  const tr = Math.floor(b / w);
  const tc = b % w;
  const out: number[] = [];
  for (let guard = 0; guard < 400 && (r !== tr || c !== tc); guard++) {
    // Step along the axis with further to go, so the path hugs the straight line.
    if (Math.abs(tr - r) >= Math.abs(tc - c)) r += Math.sign(tr - r);
    else c += Math.sign(tc - c);
    out.push(r * w + c);
  }
  return out;
}

/** Keeps a zoomed board on screen: at least part of it always under the window. */
export function clampPan(
  geom: BoardGeom,
  scale: number,
  tx: number,
  ty: number,
): { tx: number; ty: number } {
  const f = geom.floor;
  // The floor's corners after zoom: x' = x * scale + tx.
  const minTx = geom.width - (f.x + f.w) * scale - 0;
  const maxTx = -f.x * scale;
  const minTy = geom.height - (f.y + f.h) * scale;
  const maxTy = -f.y * scale;
  const clamp = (v: number, lo: number, hi: number) =>
    lo > hi ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, v));
  return { tx: clamp(tx, minTx, maxTx), ty: clamp(ty, minTy, maxTy) };
}
