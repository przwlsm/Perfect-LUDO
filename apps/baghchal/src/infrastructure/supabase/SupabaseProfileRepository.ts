import type { SupabaseClient } from '@supabase/supabase-js';
import type { Profile } from '@/domain/entities/OnlineMatch';
import type { IProfileRepository } from '@/domain/ports/IProfileRepository';
import { parseProfile } from './matchRows';
import { rpc } from './supabaseRpc';

export class SupabaseProfileRepository implements IProfileRepository {
  constructor(private readonly client: SupabaseClient) {}

  async ensure(): Promise<Profile> {
    return parseProfile(await rpc(this.client, 'ensure_profile'));
  }
}
