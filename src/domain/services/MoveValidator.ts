import { getBoardPosition, isSafeSquare } from '../board';
import { FINISH_PROGRESS, isInYard, type Piece } from '../entities/Piece';
import type { Player } from '../entities/Player';
import type { DieValue, PlayerColor } from '../entities/PlayerColor';

export interface Move {
  readonly pieceId: string;
  readonly fromProgress: number;
  readonly toProgress: number;
  readonly capturedPieceIds: readonly string[];
}

function findPiecesAtSquare(players: readonly Player[], square: number): Piece[] {
  const occupants: Piece[] = [];
  for (const player of players) {
    for (const piece of player.pieces) {
      const position = getBoardPosition(piece.color, piece.progress);
      if (position?.zone === 'SHARED_TRACK' && position.square === square) {
        occupants.push(piece);
      }
    }
  }
  return occupants;
}

function countByOpponentColor(
  occupants: readonly Piece[],
  movingColor: PlayerColor,
): Map<PlayerColor, number> {
  const counts = new Map<PlayerColor, number>();
  for (const piece of occupants) {
    if (piece.color === movingColor) continue;
    counts.set(piece.color, (counts.get(piece.color) ?? 0) + 1);
  }
  return counts;
}

/**
 * Two or more same-colored pieces sharing a square form a block: no other
 * color may land there at all (own-color stacking is always allowed).
 */
function isBlockedForColor(
  players: readonly Player[],
  square: number,
  movingColor: PlayerColor,
): boolean {
  const counts = countByOpponentColor(findPiecesAtSquare(players, square), movingColor);
  return [...counts.values()].some((count) => count >= 2);
}

/**
 * A lone opponent piece on the destination square is sent back to the yard.
 * Two-or-more of the same opponent color form a block instead (handled by
 * isBlockedForColor, so this never gets called for that case), and safe
 * squares never allow captures at all.
 */
function getCapturedPieceIds(
  players: readonly Player[],
  square: number,
  movingColor: PlayerColor,
): string[] {
  if (isSafeSquare(square)) return [];
  const occupants = findPiecesAtSquare(players, square).filter((p) => p.color !== movingColor);
  const counts = countByOpponentColor(occupants, movingColor);
  return occupants.filter((p) => counts.get(p.color) === 1).map((p) => p.id);
}

export function getValidMoveForPiece(
  players: readonly Player[],
  piece: Piece,
  dieValue: DieValue,
): Move | null {
  const toProgress = isInYard(piece) ? (dieValue === 6 ? 1 : null) : piece.progress + dieValue;
  if (toProgress === null || toProgress > FINISH_PROGRESS) return null;

  const position = getBoardPosition(piece.color, toProgress);
  if (position?.zone !== 'SHARED_TRACK') {
    return { pieceId: piece.id, fromProgress: piece.progress, toProgress, capturedPieceIds: [] };
  }

  if (isBlockedForColor(players, position.square, piece.color)) return null;

  const capturedPieceIds = getCapturedPieceIds(players, position.square, piece.color);
  return { pieceId: piece.id, fromProgress: piece.progress, toProgress, capturedPieceIds };
}

export function getValidMoves(
  players: readonly Player[],
  color: PlayerColor,
  dieValue: DieValue,
): Move[] {
  const player = players.find((p) => p.color === color);
  if (!player) return [];

  const moves: Move[] = [];
  for (const piece of player.pieces) {
    if (piece.progress === FINISH_PROGRESS) continue;
    const move = getValidMoveForPiece(players, piece, dieValue);
    if (move) moves.push(move);
  }
  return moves;
}
