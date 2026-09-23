import type { DieValue, PlayerColor } from './PlayerColor';
import type { Player } from './Player';

export type GameStatus = 'IN_PROGRESS' | 'FINISHED';

/**
 * The entire game is this one immutable value. Every domain operation takes
 * a GameState and returns a new one rather than mutating in place — that's
 * what makes the engine trivially testable (assert on the returned value)
 * and safe to later replay/validate server-side for online play.
 */
export interface GameState {
  readonly players: readonly Player[];
  readonly currentPlayerIndex: number;
  readonly lastRoll: DieValue | null;
  readonly consecutiveSixes: number;
  readonly status: GameStatus;
  readonly winnerColor: PlayerColor | null;
}

export function getCurrentPlayer(state: GameState): Player {
  const player = state.players[state.currentPlayerIndex];
  if (!player) {
    throw new Error(`Invalid currentPlayerIndex ${state.currentPlayerIndex}`);
  }
  return player;
}
