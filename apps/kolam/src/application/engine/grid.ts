/**
 * The geometry of a board, worked out once per size: which edges surround
 * each cell, which edges meet at each dot, and the reverse.
 *
 * Numbering: dots row-major, (rows+1) by (cols+1). Horizontal edges come
 * first, (rows+1) rows of `cols`; then vertical edges, `rows` rows of
 * (cols+1). A horizontal edge h(r, c) joins dot (r, c) to (r, c+1); a
 * vertical edge v(r, c) joins dot (r, c) to (r+1, c).
 */
export interface Grid {
  readonly rows: number;
  readonly cols: number;
  readonly cellCount: number;
  readonly dotCount: number;
  readonly edgeCount: number;
  /** Number of horizontal edges; edges at or above this index are vertical. */
  readonly horizontalCount: number;
  /** Per cell, its four edges: top, bottom, left, right. */
  readonly cellEdges: Int16Array;
  /** Per edge, the two cells either side (-1 outside the board): above/left, then below/right. */
  readonly edgeCells: Int16Array;
  /** Per edge, its two dots. */
  readonly edgeDots: Int16Array;
  /** Per dot, the edges that meet there (2 at a corner, 3 on a side, 4 inside). */
  readonly dotEdges: readonly (readonly number[])[];
}

const cache = new Map<string, Grid>();

export function gridOf(rows: number, cols: number): Grid {
  const key = `${rows}x${cols}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const grid = build(rows, cols);
  cache.set(key, grid);
  return grid;
}

export const hEdge = (g: Grid, r: number, c: number) => r * g.cols + c;
export const vEdge = (g: Grid, r: number, c: number) => g.horizontalCount + r * (g.cols + 1) + c;
export const dotAt = (g: Grid, r: number, c: number) => r * (g.cols + 1) + c;
export const isHorizontal = (g: Grid, e: number) => e < g.horizontalCount;

/** The dot's row and column. */
export function dotPos(g: Grid, d: number): [number, number] {
  return [Math.floor(d / (g.cols + 1)), d % (g.cols + 1)];
}

/** Both ends of an edge, as [row, col] dot positions. */
export function edgeEnds(g: Grid, e: number): [[number, number], [number, number]] {
  return [dotPos(g, g.edgeDots[e * 2]!), dotPos(g, g.edgeDots[e * 2 + 1]!)];
}

/** The edge joining two neighbouring dots, or -1. */
export function edgeBetween(g: Grid, a: number, b: number): number {
  for (const e of g.dotEdges[a]!) {
    if (g.edgeDots[e * 2] === b || g.edgeDots[e * 2 + 1] === b) return e;
  }
  return -1;
}

/** The dot at the other end of edge `e` from dot `d`. */
export function otherDot(g: Grid, e: number, d: number): number {
  const a = g.edgeDots[e * 2]!;
  return a === d ? g.edgeDots[e * 2 + 1]! : a;
}

function build(rows: number, cols: number): Grid {
  const horizontalCount = (rows + 1) * cols;
  const edgeCount = horizontalCount + rows * (cols + 1);
  const dotCount = (rows + 1) * (cols + 1);
  const cellCount = rows * cols;
  const g = {
    rows,
    cols,
    cellCount,
    dotCount,
    edgeCount,
    horizontalCount,
    cellEdges: new Int16Array(cellCount * 4),
    edgeCells: new Int16Array(edgeCount * 2).fill(-1),
    edgeDots: new Int16Array(edgeCount * 2),
    dotEdges: [] as number[][],
  };
  const dots: number[][] = Array.from({ length: dotCount }, () => []);
  for (let r = 0; r <= rows; r++) {
    for (let c = 0; c < cols; c++) {
      const e = hEdge(g, r, c);
      const a = dotAt(g, r, c);
      const b = dotAt(g, r, c + 1);
      g.edgeDots[e * 2] = a;
      g.edgeDots[e * 2 + 1] = b;
      dots[a]!.push(e);
      dots[b]!.push(e);
      if (r > 0) g.edgeCells[e * 2] = (r - 1) * cols + c;
      if (r < rows) g.edgeCells[e * 2 + 1] = r * cols + c;
    }
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c <= cols; c++) {
      const e = vEdge(g, r, c);
      const a = dotAt(g, r, c);
      const b = dotAt(g, r + 1, c);
      g.edgeDots[e * 2] = a;
      g.edgeDots[e * 2 + 1] = b;
      dots[a]!.push(e);
      dots[b]!.push(e);
      if (c > 0) g.edgeCells[e * 2] = r * cols + c - 1;
      if (c < cols) g.edgeCells[e * 2 + 1] = r * cols + c;
    }
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = r * cols + c;
      g.cellEdges[cell * 4] = hEdge(g, r, c);
      g.cellEdges[cell * 4 + 1] = hEdge(g, r + 1, c);
      g.cellEdges[cell * 4 + 2] = vEdge(g, r, c);
      g.cellEdges[cell * 4 + 3] = vEdge(g, r, c + 1);
    }
  }
  g.dotEdges = dots;
  return g;
}
