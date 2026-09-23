import { FINISH_PROGRESS, getBoardPosition, type Piece } from '@/domain';
import {
  FINISH_CELL,
  HOME_COLUMN_CELLS,
  TRACK_CELLS,
  YARD_REST_SPOTS,
  type Cell,
} from './boardLayout';

/**
 * Maps a domain piece (color + progress) onto a grid cell for rendering.
 * `yardSlotIndex` (0-3, the piece's index within its player's piece array)
 * only decides which of the 4 yard rest spots a parked piece visually sits
 * in — it carries no game meaning, which is why it lives here and not in
 * the domain model.
 */
export function getCellForPiece(piece: Piece, yardSlotIndex: number): Cell {
  if (piece.progress === FINISH_PROGRESS) {
    return FINISH_CELL[piece.color];
  }

  const position = getBoardPosition(piece.color, piece.progress);
  if (!position) {
    return YARD_REST_SPOTS[piece.color][yardSlotIndex % 4]!;
  }
  if (position.zone === 'SHARED_TRACK') {
    return TRACK_CELLS[position.square]!;
  }
  return HOME_COLUMN_CELLS[position.color][position.step - 1]!;
}
