/**
 * The Bagh-Chal board: 25 points on a 5×5 grid, numbered 0–24 row by row
 * from the top left. Every point joins its orthogonal neighbours; only the
 * points where row + column is even also join their diagonal neighbours,
 * which is what gives the board its star pattern.
 */
export type Node = number;

export const SIZE = 5;
export const NODE_COUNT = SIZE * SIZE;
/** Where the four tigers start. */
export const CORNERS: readonly Node[] = [0, 4, 20, 24];

export interface Point {
  readonly row: number;
  readonly col: number;
}

type Direction = readonly [dRow: number, dCol: number];

const ORTHOGONAL: readonly Direction[] = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];
const DIAGONAL: readonly Direction[] = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
];

export function pointOf(node: Node): Point {
  if (!Number.isInteger(node) || node < 0 || node >= NODE_COUNT) {
    throw new RangeError(`No such point: ${node}`);
  }
  return { row: Math.floor(node / SIZE), col: node % SIZE };
}

/** The point at a row and column, or null when it falls off the board. */
export function nodeAt(row: number, col: number): Node | null {
  return row >= 0 && row < SIZE && col >= 0 && col < SIZE ? row * SIZE + col : null;
}

/** A point's name as a player would say it: columns A–E, rows 1–5 from the top. */
export function nodeName(node: Node): string {
  const { row, col } = pointOf(node);
  return `${'ABCDE'[col]}${row + 1}`;
}

/** Whether diagonal lines pass through this point. */
export function hasDiagonals(node: Node): boolean {
  const { row, col } = pointOf(node);
  return (row + col) % 2 === 0;
}

function directionsFrom(node: Node): readonly Direction[] {
  return hasDiagonals(node) ? [...ORTHOGONAL, ...DIAGONAL] : ORTHOGONAL;
}

function step(node: Node, [dRow, dCol]: Direction): Node | null {
  const { row, col } = pointOf(node);
  return nodeAt(row + dRow, col + dCol);
}

const ADJACENCY: readonly (readonly Node[])[] = Array.from({ length: NODE_COUNT }, (_, node) =>
  directionsFrom(node).flatMap((direction) => {
    const next = step(node, direction);
    return next === null ? [] : [next];
  }),
);

/** The points one line segment away from `node`. */
export function neighbours(node: Node): readonly Node[] {
  return ADJACENCY[node] ?? [];
}

export function areAdjacent(a: Node, b: Node): boolean {
  return neighbours(a).includes(b);
}

/**
 * Where a tiger on `from` lands when it jumps the piece on `over`: the next
 * point along the same line, or null when `over` is not adjacent or the line
 * ends at the board's edge. The line always continues past `over`: a
 * diagonal only reaches `over` through a point that itself has diagonals.
 */
export function jumpTarget(from: Node, over: Node): Node | null {
  if (!areAdjacent(from, over)) return null;
  const a = pointOf(from);
  const b = pointOf(over);
  return nodeAt(b.row + (b.row - a.row), b.col + (b.col - a.col));
}

/** Every line segment on the board once, as a pair of points, for drawing. */
export const LINES: readonly (readonly [Node, Node])[] = ADJACENCY.flatMap((list, node) =>
  list.filter((other) => other > node).map((other): readonly [Node, Node] => [node, other]),
);
