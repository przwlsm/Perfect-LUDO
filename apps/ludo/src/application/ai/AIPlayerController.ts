import type { GameState, Move } from '@/domain';
import type { IPlayerController } from '../ports/IPlayerController';
import type { IMoveSelectionStrategy } from '../ports/IMoveSelectionStrategy';

/** Liskov-substitutable for HumanPlayerController — see IPlayerController. */
export class AIPlayerController implements IPlayerController {
  constructor(private readonly strategy: IMoveSelectionStrategy) {}

  async chooseMove(state: GameState, validMoves: readonly Move[]): Promise<Move> {
    return this.strategy.selectMove(state, validMoves);
  }
}
