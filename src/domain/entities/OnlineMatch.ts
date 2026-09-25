import type { GameState } from './GameState';
import type { DieValue } from './PlayerColor';
import type { PresenceStatus } from './Social';

export type OnlineMatchStatus = 'IN_PROGRESS' | 'FINISHED' | 'ABANDONED';

export interface OnlineMatchPlayer {
  readonly userId: string;
  readonly seatIndex: number;
  readonly username: string;
  readonly displayName: string | null;
  readonly avatar: string | null;
  readonly presence: PresenceStatus;
  readonly lastSeen: string | null;
}

export interface OnlineMatch {
  readonly id: string;
  readonly lobbyId: string;
  readonly playerCount: number;
  readonly status: OnlineMatchStatus;
  /**
   * Null until somebody moves. Every client derives the identical opening
   * position from the seat count, so there is nothing to store until the
   * board actually differs from it.
   */
  readonly state: GameState | null;
  /** Bumped by the server on every accepted write; a write states the version it saw. */
  readonly version: number;
  readonly turnSeat: number;
  /** Server-issued. Null means the player at `turnSeat` still has to roll. */
  readonly lastRoll: DieValue | null;
  readonly winnerSeat: number | null;
}

export interface OnlineMatchSnapshot {
  readonly serverNow: string;
  /** This player's seat, or null if they are only spectating the row. */
  readonly mySeat: number | null;
  readonly match: OnlineMatch;
  readonly players: readonly OnlineMatchPlayer[];
}
