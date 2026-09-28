import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  IMatchmakingRepository,
  QuickMatchPlayerCount,
  QuickMatchTicket,
  Stake,
  Unsubscribe,
} from '@/domain';
import { toQuickMatchTicket } from './socialRows';
import { removeChannel, rpc, uniqueTopic } from './supabaseRpc';

export class SupabaseMatchmakingRepository implements IMatchmakingRepository {
  constructor(private readonly client: SupabaseClient) {}

  async join(playerCount: QuickMatchPlayerCount, stake: Stake = 0): Promise<QuickMatchTicket> {
    // A free table leaves the stake out, so this also works before 0013.
    return toQuickMatchTicket(
      await rpc(this.client, 'join_quick_match', {
        p_player_count: playerCount,
        ...(stake > 0 ? { p_stake: stake } : {}),
      }),
    );
  }

  async leave(): Promise<void> {
    await rpc(this.client, 'leave_quick_match');
  }

  subscribe(userId: string, onChange: () => void): Unsubscribe {
    const channel = this.client
      .channel(uniqueTopic(`quick-match:${userId}`))
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matchmaking_queue',
          filter: `user_id=eq.${userId}`,
        },
        () => onChange(),
      )
      .subscribe();
    return () => removeChannel(this.client, channel);
  }
}
