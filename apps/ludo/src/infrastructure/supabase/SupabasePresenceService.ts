import type { SupabaseClient } from '@supabase/supabase-js';
import type { IPresenceService, PresenceStatus } from '@/domain';
import { toFriendlyError } from './socialRows';
import { rpc } from './supabaseRpc';

const FALLBACK_TIMEOUT_SECONDS = 75;

export class SupabasePresenceService implements IPresenceService {
  private timeout: number | null = null;

  constructor(private readonly client: SupabaseClient) {}

  async heartbeat(status: PresenceStatus): Promise<void> {
    await rpc(this.client, 'touch_presence', { p_status: status });
  }

  async getTimeoutSeconds(): Promise<number> {
    if (this.timeout !== null) return this.timeout;
    const { data, error } = await this.client
      .from('social_settings')
      .select('presence_timeout_seconds')
      .maybeSingle();
    if (error) throw toFriendlyError(error);
    const value = (data as { presence_timeout_seconds?: unknown } | null)?.presence_timeout_seconds;
    this.timeout = typeof value === 'number' && value > 0 ? value : FALLBACK_TIMEOUT_SECONDS;
    return this.timeout;
  }
}
