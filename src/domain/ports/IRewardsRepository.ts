import type {
  AdRewardKind,
  LeagueView,
  RewardsSnapshot,
  SpinResult,
  TournamentView,
} from '../entities/Progression';
import type { WalletSnapshot } from '../entities/Wallet';

/**
 * Daily spin, missions, the season pass and the weekly tournament: all
 * server-owned, members only. Every call returns the fresh state (with the
 * wallet where it changed), so the screen never has to guess. Throws
 * `WalletRefusedError` when the server declines, `WalletUnavailableError`
 * when it cannot be reached.
 */
export interface IRewardsRepository {
  getRewards(): Promise<RewardsSnapshot>;
  spin(): Promise<SpinResult>;
  claimMission(missionId: string): Promise<RewardsSnapshot>;
  buySeasonPremium(): Promise<RewardsSnapshot>;
  claimSeasonTier(tier: number, premium: boolean): Promise<RewardsSnapshot>;
  getTournament(): Promise<TournamentView>;
  claimTournamentPrize(): Promise<TournamentView>;
  /** Reports a finished rewarded ad view; the server grants within daily caps. */
  claimAdReward(kind: AdRewardKind): Promise<WalletSnapshot>;
  /** The player's league standing; reading it also settles a finished week. */
  getLeague(): Promise<LeagueView>;
}
