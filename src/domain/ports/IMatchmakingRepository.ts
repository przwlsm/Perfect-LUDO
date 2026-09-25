import type { Unsubscribe } from '../entities/Social';

export type QuickMatchPlayerCount = 2 | 3 | 4;

/** The caller's place in the quick-play queue, as the server sees it. */
export interface QuickMatchTicket {
  readonly status: 'WAITING' | 'MATCHED';
  /** Set once a table has been seated; the client then joins that lobby. */
  readonly lobbyId: string | null;
  readonly playerCount: number;
  /** Others waiting for the same table size, so "finding opponent" can say how close it is. */
  readonly waiting: number;
  readonly serverNow: string;
}

/**
 * Quick play for people with nobody to challenge. Open to guests: the
 * queue is the one online feature that must not require an account.
 */
export interface IMatchmakingRepository {
  /**
   * Enters the queue, or refreshes an existing ticket. Doubles as the
   * heartbeat: a ticket that is not refreshed is dropped server-side, so a
   * closed app never leaves a phantom opponent behind.
   */
  join(playerCount: QuickMatchPlayerCount): Promise<QuickMatchTicket>;
  leave(): Promise<void>;
  /** Fires when the caller's own ticket changes, e.g. when a table is seated. */
  subscribe(userId: string, onChange: () => void): Unsubscribe;
}
