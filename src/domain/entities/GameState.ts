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
  /**
   * 2 v 2: only on a 4-seat board. Opposite seats are partners (red with
   * yellow, green with blue): they never capture or block each other, a
   * player whose coins are all home plays for their partner, and the pair
   * wins together once all eight coins are home. Absent means every seat
   * plays for itself.
   */
  readonly teams?: boolean;
  /** Quick game: the first player with this many coins home wins (absent: all four). */
  readonly goal?: 1 | 2;
  /** Kill & Go: a coin may not enter its home path until its player has captured. */
  readonly killToEnter?: boolean;
  /** Kill & Go: colours that have captured at least once, in the order they first did. */
  readonly hunters?: readonly PlayerColor[];
}

/** Whether this board is played in partnerships. */
export function isTeamGame(state: Pick<GameState, 'teams' | 'players'>): boolean {
  return state.teams === true && state.players.length === 4;
}

/** The partner of `color` in a team game, or null when everyone plays alone. */
export function partnerOf(
  state: Pick<GameState, 'teams' | 'players'>,
  color: PlayerColor,
): PlayerColor | null {
  if (!isTeamGame(state)) return null;
  const index = state.players.findIndex((p) => p.color === color);
  if (index < 0) return null;
  return state.players[(index + 2) % 4]?.color ?? null;
}

export function getCurrentPlayer(state: GameState): Player {
  const player = state.players[state.currentPlayerIndex];
  if (!player) {
    throw new Error(`Invalid currentPlayerIndex ${state.currentPlayerIndex}`);
  }
  return player;
}
