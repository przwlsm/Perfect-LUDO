import type { PlayerColor } from './PlayerColor';

/**
 * A piece's `progress` is its distance travelled from the yard, not a board
 * coordinate. 0 = still in the yard. 1-51 = on the shared 52-square track.
 * 52-56 = in this piece's own private home column. 57 = finished (home).
 * Board coordinates are derived from this via `domain/board.ts` — keeping
 * geometry out of the piece itself is what lets the same progress model
 * serve a 2D board, a 3D board, or no board at all (server validation).
 */
export interface Piece {
  readonly id: string;
  readonly color: PlayerColor;
  readonly progress: number;
}

export const YARD_PROGRESS = 0;
export const FINISH_PROGRESS = 57;

export function isInYard(piece: Piece): boolean {
  return piece.progress === YARD_PROGRESS;
}

export function hasFinished(piece: Piece): boolean {
  return piece.progress === FINISH_PROGRESS;
}

export function isOnSharedTrack(piece: Piece): boolean {
  return piece.progress >= 1 && piece.progress <= 51;
}

export function isInHomeColumn(piece: Piece): boolean {
  return piece.progress >= 52 && piece.progress <= 56;
}
