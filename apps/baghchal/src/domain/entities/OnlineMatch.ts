import type { GameState, Move, Result, Side } from 'baghchal-engine';

export type MatchStatus = 'WAITING' | 'ACTIVE' | 'FINISHED' | 'ABANDONED';

/** How a match ended: by the rules, or by the clock or a resignation. */
export type MatchOutcome =
  Result | { readonly kind: 'win'; readonly winner: Side; readonly reason: 'timeout' | 'resigned' };

export interface MatchPlayer {
  readonly id: string;
  readonly username: string;
  readonly displayName: string | null;
}

export interface OnlineMatch {
  readonly id: string;
  /** The invitation code while the game waits for an opponent. */
  readonly code: string;
  readonly status: MatchStatus;
  readonly hostId: string;
  readonly tigerId: string | null;
  readonly goatId: string | null;
  /** The position. Its `result` is the rules' verdict only; see `outcome`. */
  readonly state: GameState;
  /** Why the match is over, including the clock and resignations; null while it goes on. */
  readonly outcome: MatchOutcome | null;
  /** Bumped by the server on every accepted write; a write states the version it saw. */
  readonly version: number;
  readonly turnSeconds: number;
  /** When the current move times out; null once the match is over or not yet started. */
  readonly turnDeadline: string | null;
  readonly lastMove: Move | null;
  /** Coins this seat earned when the match finished; null while it goes on or if none. */
  readonly myReward: number | null;
  readonly myRewardDoubled: boolean;
}

export interface OnlineMatchSnapshot {
  /** The server's clock when this was taken, to correct for the device's. */
  readonly serverNow: string;
  /** The side this device plays, or null when it is only the host of a waiting game. */
  readonly mySide: Side | null;
  readonly match: OnlineMatch;
  readonly players: {
    readonly tiger: MatchPlayer | null;
    readonly goat: MatchPlayer | null;
  };
}

export interface Profile {
  readonly id: string;
  readonly username: string;
  readonly displayName: string | null;
  readonly ratingTiger: number;
  readonly ratingGoat: number;
  readonly coins: number;
}

export interface AuthUser {
  readonly uid: string;
  readonly isGuest: boolean;
}

export type Unsubscribe = () => void;
