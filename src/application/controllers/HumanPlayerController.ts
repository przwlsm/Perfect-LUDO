import type { GameState, Move } from '@/domain';
import type { IPlayerController } from '../ports/IPlayerController';

/**
 * Bridges UI interaction into the same IPlayerController contract as the
 * AI: chooseMove() resolves only once the presentation layer calls
 * submitMove() with whatever the player tapped, so a use case can `await`
 * a human turn exactly like it awaits a bot's.
 */
export class HumanPlayerController implements IPlayerController {
  private pendingResolve: ((move: Move) => void) | null = null;

  async chooseMove(_state: GameState, _validMoves: readonly Move[]): Promise<Move> {
    if (this.pendingResolve) {
      throw new Error('HumanPlayerController is already awaiting a move');
    }
    return new Promise<Move>((resolve) => {
      this.pendingResolve = resolve;
    });
  }

  /**
   * A no-op when nothing is pending, not an error: a rapid double-tap, or a
   * 3D click ray crossing more than one mesh, can legitimately call this
   * twice for what the user experienced as a single tap. The first call
   * resolves the turn; any later call for that same decision has nothing
   * left to do and must not crash the app.
   */
  submitMove(move: Move): void {
    if (!this.pendingResolve) {
      return;
    }
    const resolve = this.pendingResolve;
    this.pendingResolve = null;
    resolve(move);
  }

  isAwaitingMove(): boolean {
    return this.pendingResolve !== null;
  }
}
