import type { GameState, Move } from '@/domain';
import type { IMoveSelectionStrategy } from '../ports/IMoveSelectionStrategy';

/**
 * "Easy" difficulty: picks uniformly among the currently valid moves. Not
 * used for anything fairness-critical (that's the dice roll, which goes
 * through the domain's IRandomProvider) — this is just bot behavior, so a
 * plain injectable RNG function is enough rather than the secure port.
 */
export class RandomMoveStrategy implements IMoveSelectionStrategy {
  constructor(private readonly random: () => number = Math.random) {}

  selectMove(_state: GameState, validMoves: readonly Move[]): Move {
    if (validMoves.length === 0) {
      throw new Error('RandomMoveStrategy requires at least one valid move');
    }
    const index = Math.floor(this.random() * validMoves.length);
    return validMoves[index]!;
  }
}
