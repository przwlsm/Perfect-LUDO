import { radialPieceCell } from './radialLayout';
import { type ClassicColor, FINISH_PROGRESS, getBoardPosition, type Piece } from '@/domain';
import {
  finishCell,
  flipTrackSquare,
  homeColumnCells,
  TRACK_CELLS,
  yardRestSpots,
  type Cell,
} from './boardLayout';

/**
 * Maps a domain piece (color + progress) onto a grid cell for rendering.
 * `yardSlotIndex` (0-3, the piece's index within its player's piece array)
 * only decides which of the 4 yard rest spots a parked piece visually sits
 * in — it carries no game meaning, which is why it lives here and not in
 * the domain model. `flip` renders the piece at its seat's opposite corner
 * (see boardLayout.ts); it never changes the piece's actual game position.
 */
export function getCellForPiece(
  piece: Piece,
  yardSlotIndex: number,
  playerCount = 4,
  flip = false,
): Cell {
  if (playerCount > 4) return radialPieceCell(piece, yardSlotIndex, playerCount);
  if (piece.progress === FINISH_PROGRESS) {
    return finishCell(piece.color as ClassicColor, flip);
  }

  const position = getBoardPosition(piece.color, piece.progress);
  if (!position) {
    return yardRestSpots(piece.color as ClassicColor, flip)[yardSlotIndex % 4]!;
  }
  if (position.zone === 'SHARED_TRACK') {
    return TRACK_CELLS[flip ? flipTrackSquare(position.square) : position.square]!;
  }
  return homeColumnCells(position.color as ClassicColor, flip)[position.step - 1]!;
}
