import type { SupabaseClient } from '@supabase/supabase-js';
import {
  parseRewards,
  parseSpin,
  parseTournament,
  WalletRefusedError,
  WalletUnavailableError,
  type IRewardsRepository,
  type RewardsSnapshot,
  type SpinResult,
  type TournamentView,
} from '@/domain';
import { toFriendlyError } from './socialRows';
import { classifyWalletError } from './SupabaseWalletRepository';

export class SupabaseRewardsRepository implements IRewardsRepository {
  constructor(private readonly client: SupabaseClient) {}

  private async call<T>(
    fn: string,
    parse: (raw: unknown) => T,
    args: Record<string, unknown> = {},
  ): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const { data, error } = await this.client.rpc(fn, args).abortSignal(controller.signal);
      if (error) throw classifyWalletError(error);
      return parse(data);
    } catch (e) {
      if (e instanceof WalletRefusedError || e instanceof WalletUnavailableError) throw e;
      throw new WalletUnavailableError(
        e instanceof Error && e.message
          ? toFriendlyError(e).message
          : 'Could not reach the server. Check your connection and try again.',
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  getRewards(): Promise<RewardsSnapshot> {
    return this.call('get_rewards', parseRewards);
  }
  spin(): Promise<SpinResult> {
    return this.call('spin_daily', parseSpin);
  }
  claimMission(missionId: string): Promise<RewardsSnapshot> {
    return this.call('claim_mission', parseRewards, { p_mission_id: missionId });
  }
  buySeasonPremium(): Promise<RewardsSnapshot> {
    return this.call('buy_season_premium', parseRewards);
  }
  claimSeasonTier(tier: number, premium: boolean): Promise<RewardsSnapshot> {
    return this.call('claim_season_tier', parseRewards, { p_tier: tier, p_premium: premium });
  }
  getTournament(): Promise<TournamentView> {
    return this.call('get_tournament', parseTournament);
  }
  claimTournamentPrize(): Promise<TournamentView> {
    return this.call('claim_tournament_prize', parseTournament);
  }
}
