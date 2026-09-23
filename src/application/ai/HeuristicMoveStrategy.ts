import { FINISH_PROGRESS, type GameState, type Move } from '@/domain';
import type { IMoveSelectionStrategy } from '../ports/IMoveSelectionStrategy';

/**
 * "Hard" difficulty: a simple greedy priority order rather than a search —
 * capture > finish a piece > leave the yard > advance the furthest piece.
 * Deliberately not a minimax/lookahead engine; that would be premature
 * complexity for what is, for now, a single difficulty tier above random.
 */
export class HeuristicMoveStrategy implements IMoveSelectionStrategy {
  selectMove(_state: GameState, validMoves: readonly Move[]): Move {
    if (validMoves.length === 0) {
      throw new Error('HeuristicMoveStrategy requires at least one valid move');
    }

    const capturing = validMoves.filter((move) => move.capturedPieceIds.length > 0);
    if (capturing.length > 0) {
      return capturing.reduce((best, move) =>
        move.capturedPieceIds.length > best.capturedPieceIds.length ? move : best,
      );
    }

    const finishing = validMoves.find((move) => move.toProgress === FINISH_PROGRESS);
    if (finishing) return finishing;

    const leavingYard = validMoves.find((move) => move.fromProgress === 0);
    if (leavingYard) return leavingYard;

    return validMoves.reduce((best, move) => (move.fromProgress > best.fromProgress ? move : best));
  }
}
