import { CORNERS, type Cell, type Move, type Node } from 'baghchal-engine';

/**
 * A piece with a lasting identity. The engine only knows what sits on each
 * point; the screen needs to know that *this* goat went from 7 to 12, so it
 * can slide it there rather than redraw the board.
 */
export interface PieceView {
  readonly id: string;
  readonly kind: 'T' | 'G';
  readonly node: Node;
}

export function initialPieces(): readonly PieceView[] {
  return CORNERS.map((node, index) => ({ id: `tiger-${index}`, kind: 'T', node }));
}

/**
 * Pieces for a board arrived from elsewhere, with no move to animate. Ids
 * are new, so these never slide from an earlier position.
 */
export function piecesFromBoard(board: readonly Cell[]): readonly PieceView[] {
  return board.flatMap((cell, node) =>
    cell === '.' ? [] : [{ id: `${cell}-at-${node}-${board.join('')}`, kind: cell, node }],
  );
}

/** The pieces after `move`. `placedSoFar` numbers a newly placed goat. */
export function trackPieces(
  pieces: readonly PieceView[],
  move: Move,
  placedSoFar: number,
): readonly PieceView[] {
  switch (move.kind) {
    case 'place':
      return [...pieces, { id: `goat-${placedSoFar}`, kind: 'G', node: move.to }];
    case 'move':
      return pieces.map((piece) =>
        piece.node === move.from ? { ...piece, node: move.to } : piece,
      );
    case 'jump':
      return pieces
        .filter((piece) => piece.node !== move.over)
        .map((piece) => (piece.node === move.from ? { ...piece, node: move.to } : piece));
  }
}
