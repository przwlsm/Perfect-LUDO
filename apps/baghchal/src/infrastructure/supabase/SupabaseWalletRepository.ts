import type { SupabaseClient } from '@supabase/supabase-js';
import type { StoreCatalog, Wallet } from '@/domain/entities/Economy';
import type {
  AdRewardGrant,
  AdRewardKind,
  IWalletRepository,
} from '@/domain/ports/IWalletRepository';
import { parseAdRewardGrant, parseStoreCatalog, parseWallet } from './economyRows';
import { rpc } from './supabaseRpc';

export class SupabaseWalletRepository implements IWalletRepository {
  constructor(private readonly client: SupabaseClient) {}

  async wallet(): Promise<Wallet> {
    return parseWallet(await rpc(this.client, 'get_wallet'));
  }

  async store(): Promise<StoreCatalog> {
    return parseStoreCatalog(await rpc(this.client, 'get_store'));
  }

  async buy(itemId: string): Promise<Wallet> {
    return parseWallet(await rpc(this.client, 'buy_item', { p_item_id: itemId }));
  }

  async equip(itemId: string): Promise<Wallet> {
    return parseWallet(await rpc(this.client, 'equip_item', { p_item_id: itemId }));
  }

  async claimAdReward(kind: AdRewardKind, ref?: string): Promise<AdRewardGrant> {
    return parseAdRewardGrant(
      await rpc(this.client, 'claim_ad_reward', { p_kind: kind, p_ref: ref ?? null }),
    );
  }
}
