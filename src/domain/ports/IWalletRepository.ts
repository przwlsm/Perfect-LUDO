import type { WalletSnapshot } from '../entities/Wallet';

/**
 * The account wallet on the server. Every call is one atomic operation for
 * the signed-in member: it either fully happens or nothing changes, and it
 * always returns the wallet as it now stands. Implementations throw
 * `WalletRefusedError` when the server declines and `WalletUnavailableError`
 * when it cannot be reached; guests are declined.
 */
export interface IWalletRepository {
  getWallet(): Promise<WalletSnapshot>;
  /**
   * Charges `expectedPrice` for `itemId` and adds it (plus a pack's contents)
   * to the inventory. Already owned: returns the wallet unchanged, no charge.
   * Price no longer matches the catalog: refused.
   */
  purchase(itemId: string, expectedPrice: number): Promise<WalletSnapshot>;
  claimGift(): Promise<WalletSnapshot>;
  /** Records a finished match once per `matchId`; replays return the wallet unchanged. */
  awardMatch(matchId: string, won: boolean, rewardEligible: boolean): Promise<WalletSnapshot>;
}
