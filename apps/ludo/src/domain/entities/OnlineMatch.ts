import type { GameState } from './GameState';
import type { DieValue } from './PlayerColor';
import type { PresenceStatus } from './Social';
import type { GameVariant } from './Variant';

export type OnlineMatchStatus = 'IN_PROGRESS' | 'FINISHED' | 'ABANDONED';

export interface OnlineMatchPlayer {
  readonly userId: string;
  readonly seatIndex: number;
  readonly username: string;
  readonly displayName: string | null;
  readonly avatar: string | null;
  readonly presence: PresenceStatus;
  readonly lastSeen: string | null;
  /** Turns this player has let the clock run out on (lifelines lost). */
  readonly missed: number;
  /** Out of lifelines: their turns are skipped for the rest of the match. */
  readonly out: boolean;
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
  /** Coins each seat paid to sit down; 0 for a free table. */
  readonly stake: number;
  /** Everything paid in. */
  readonly pool: number;
  /** What the winner collects from the pool. */
  readonly prize: number;
  /** When the current roll or move times out; null once the match is over. */
  readonly turnDeadline: string | null;
  /** Classic, Quick or Kill & Go. */
  readonly variant: GameVariant;
  /** Lifelines each player starts with. */
  readonly lifelines: number;
  /** 2 v 2: opposite seats are partners and win together. */
  readonly teams: boolean;
}

export interface OnlineMatchSnapshot {
  readonly serverNow: string;
  /** This player's seat, or null if they are only spectating the row. */
  readonly mySeat: number | null;
  readonly match: OnlineMatch;
  readonly players: readonly OnlineMatchPlayer[];
}
