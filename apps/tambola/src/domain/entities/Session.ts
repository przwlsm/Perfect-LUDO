import type { PrizeId } from './Prize';

/** A prize the host awarded after checking the claim. */
export interface HostWin {
  readonly prize: PrizeId;
  /** The winning ticket's ID, as shown on it ("H7KQ-3"). */
  readonly ticket: string;
  /** What the host typed, or empty. */
  readonly name: string;
  /** How many numbers had been called when it was checked. */
  readonly atCall: number;
}

/** The game this phone is calling. Kept on the device so a closed app can carry on. */
export interface HostSession {
  readonly code: string;
  readonly called: number;
  readonly wins: readonly HostWin[];
  readonly startedAt: number;
}

/** The tickets this phone is playing in someone else's room. */
export interface PlayerSession {
  readonly code: string;
  /** The strip the tickets come from; tickets are slots 1…count of it. */
  readonly strip: string;
  readonly count: number;
  /** Every number the player has daubed. A strip never repeats a number, so one set covers all tickets. */
  readonly daubs: readonly number[];
  readonly joinedAt: number;
}

export interface ResultRow {
  readonly prize: PrizeId;
  /** Who won it, or null when nobody did before Full House. */
  readonly winner: string | null;
  readonly you: boolean;
  /** The player called it too soon and lost the chance. */
  readonly bogus: boolean;
}

export interface GameResult {
  readonly mode: 'solo' | 'party';
  readonly rows: readonly ResultRow[];
  readonly calls: number;
  readonly code?: string;
  /** Solo: the options to play again with. */
  readonly replay?: { readonly tickets: number; readonly rivals: number; readonly speed: number };
}
