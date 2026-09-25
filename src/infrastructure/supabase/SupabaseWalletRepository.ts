import type { SupabaseClient } from '@supabase/supabase-js';
import {
  parseWalletSnapshot,
  WalletRefusedError,
  WalletUnavailableError,
  type IWalletRepository,
  type WalletSnapshot,
} from '@/domain';
import { toFriendlyError } from './socialRows';

/**
 * Errors from a Postgres function carry a five-character SQLSTATE (P0001,
 * 22023, 42501…): the server ran the request and declined it. Anything
 * else — a failed fetch, a timeout, a stale token (PGRST3xx), a function
 * the server does not have (PGRST202) — means the request may not have run
 * at all, so the caller must treat it as unknown and retry or re-read.
 */
function classify(error: { message?: string; code?: string }): Error {
  const friendly = toFriendlyError(error);
  const code = error.code ?? '';
  const declined = /^[0-9A-Z]{5}$/.test(code) && !code.startsWith('PGRST');
  return declined
    ? new WalletRefusedError(friendly.message)
    : new WalletUnavailableError(friendly.message);
}

export class SupabaseWalletRepository implements IWalletRepository {
  constructor(private readonly client: SupabaseClient) {}

  private async call(fn: string, args: Record<string, unknown> = {}): Promise<WalletSnapshot> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const { data, error } = await this.client.rpc(fn, args).abortSignal(controller.signal);
      if (error) throw classify(error);
      return parseWalletSnapshot(data);
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

  getWallet(): Promise<WalletSnapshot> {
    return this.call('get_wallet');
  }

  purchase(itemId: string, expectedPrice: number): Promise<WalletSnapshot> {
    return this.call('purchase_item', { p_item_id: itemId, p_expected_price: expectedPrice });
  }

  claimGift(): Promise<WalletSnapshot> {
    return this.call('claim_daily_gift');
  }

  awardMatch(matchId: string, won: boolean, rewardEligible: boolean): Promise<WalletSnapshot> {
    return this.call('award_match', {
      p_match_id: matchId,
      p_won: won,
      p_eligible: rewardEligible,
    });
  }
}
