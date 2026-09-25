import type { UserProfile } from '../entities/User';

/**
 * Read side of a player's cloud profile, plus the one field the client may
 * still write: its display name.
 *
 * Coins, inventory and statistics are server-owned since migration 0007 and
 * change only through `IWalletRepository`; the database refuses direct
 * writes to those columns even from the account's own session.
 */
export interface IUserProgressRepository {
  getProfile(uid: string): Promise<UserProfile | null>;
  saveDisplayName(uid: string, displayName: string | null): Promise<void>;
}
