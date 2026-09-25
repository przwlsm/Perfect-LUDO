import type { SupabaseClient } from '@supabase/supabase-js';
import type { ISocialIdentityRepository, SocialIdentity, UsernameAvailability } from '@/domain';
import { toIdentity, toUsernameAvailability } from './socialRows';
import { rpc } from './supabaseRpc';

export class SupabaseSocialIdentityRepository implements ISocialIdentityRepository {
  constructor(private readonly client: SupabaseClient) {}

  async ensure(displayName: string | null): Promise<SocialIdentity> {
    return toIdentity(
      await rpc(this.client, 'ensure_social_identity', { p_display_name: displayName }),
    );
  }

  async update(changes: { username?: string; avatar?: string }): Promise<SocialIdentity> {
    return toIdentity(
      await rpc(this.client, 'update_social_identity', {
        p_username: changes.username ?? null,
        p_avatar: changes.avatar ?? null,
      }),
    );
  }

  async checkUsername(username: string): Promise<UsernameAvailability> {
    return toUsernameAvailability(
      await rpc(this.client, 'check_username_available', { p_username: username }),
    );
  }
}
