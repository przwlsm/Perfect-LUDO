import { SIZE, pointOf, type Node } from 'baghchal-engine';

export interface Position {
  readonly x: number;
  readonly y: number;
}

/** Where a point sits on a square board `size` wide whose outer lines are `inset` from the edge. */
export function nodePosition(node: Node, size: number, inset: number): Position {
  const { row, col } = pointOf(node);
  const step = (size - 2 * inset) / (SIZE - 1);
  return { x: inset + col * step, y: inset + row * step };
}
