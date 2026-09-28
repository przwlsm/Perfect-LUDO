import type { WalletSnapshot } from '../entities/Wallet';
import type { MatchStats } from '../entities/Progression';

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
  /**
   * Records a finished game against the computer (or pass & play) once per
   * `matchId`; replays return the wallet unchanged. The client's word, so
   * the pay is small and capped per day.
   */
  awardMatch(
    matchId: string,
    won: boolean,
    rewardEligible: boolean,
    stats?: MatchStats,
  ): Promise<WalletSnapshot>;
  /**
   * Collects an online match's reward. The server reads the result from its
   * own match record, so there is nothing to claim but the id.
   */
  awardOnlineMatch(matchId: string, stats?: MatchStats): Promise<WalletSnapshot>;
}
