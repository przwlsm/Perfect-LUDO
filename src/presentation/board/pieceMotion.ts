import type { Piece } from '@/domain';
import { getCellForPiece } from './getCellForPiece';
import type { Cell } from './boardLayout';

/** One hop from cell to cell. Slow enough to read each square the coin lands on. */
export const PIECE_STEP_MS = 170;
/** A single straight jump: leaving the yard, or a captured coin flying home. */
export const PIECE_JUMP_MS = 320;
/** How long the game waits after a move before the next turn: the longest
 * possible walk (a six) plus a beat to let the coin settle on its square. */
export const PIECE_SETTLE_MS = PIECE_STEP_MS * 6 + 140;
export const DICE_ROLL_MS = 480;

/** Follow actual track corners and the home lane; captures return straight to the yard. */
export function getPieceWaypoints(
  piece: Piece,
  fromProgress: number,
  yardSlot: number,
  playerCount = 4,
  flip = false,
): readonly Cell[] {
  const distance = piece.progress - fromProgress;
  if (fromProgress === 0 || distance <= 0 || distance > 6)
    return [getCellForPiece(piece, yardSlot, playerCount, flip)];
  return Array.from({ length: distance }, (_, step) =>
    getCellForPiece({ ...piece, progress: fromProgress + step + 1 }, yardSlot, playerCount, flip),
  );
}
