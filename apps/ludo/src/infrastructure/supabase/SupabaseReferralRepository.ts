import type { SupabaseClient } from '@supabase/supabase-js';
import { parseReferral, type IReferralRepository, type ReferralView } from '@/domain';
import { rpc } from './supabaseRpc';

export class SupabaseReferralRepository implements IReferralRepository {
  constructor(private readonly client: SupabaseClient) {}

  async get(): Promise<ReferralView> {
    return parseReferral(await rpc(this.client, 'get_referral'));
  }

  async setReferrer(publicId: string): Promise<ReferralView> {
    return parseReferral(await rpc(this.client, 'set_referrer', { p_public_id: publicId }));
  }
}
