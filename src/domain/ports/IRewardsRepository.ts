import type { RewardsSnapshot, SpinResult, TournamentView } from '../entities/Progression';

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
}
