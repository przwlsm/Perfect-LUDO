import type { Piece } from '@/domain';
import { getCellForPiece } from './getCellForPiece';
import type { Cell } from './boardLayout';

export const PIECE_STEP_MS = 100;
export const PIECE_SETTLE_MS = 660;
export const DICE_ROLL_MS = 480;

/** Follow actual track corners and the home lane; captures return straight to the yard. */
export function getPieceWaypoints(
  piece: Piece,
  fromProgress: number,
  yardSlot: number,
): readonly Cell[] {
  const distance = piece.progress - fromProgress;
  if (fromProgress === 0 || distance <= 0 || distance > 6)
    return [getCellForPiece(piece, yardSlot)];
  return Array.from({ length: distance }, (_, step) =>
    getCellForPiece({ ...piece, progress: fromProgress + step + 1 }, yardSlot),
  );
}
