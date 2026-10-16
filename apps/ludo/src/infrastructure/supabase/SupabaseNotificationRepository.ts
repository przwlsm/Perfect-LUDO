import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppNotification, INotificationRepository, Unsubscribe } from '@/domain';
import { toFriendlyError, toNotification } from './socialRows';
import { rpc, removeChannel, uniqueTopic, type CurrentUserId } from './supabaseRpc';

const COLUMNS =
  'id, type, title, message, related_challenge_id, related_lobby_id, is_read, created_at';

export class SupabaseNotificationRepository implements INotificationRepository {
  constructor(
    private readonly client: SupabaseClient,
    private readonly currentUserId: CurrentUserId,
  ) {}

  async list(limit = 30): Promise<readonly AppNotification[]> {
    const { data, error } = await this.client
      .from('notifications')
      .select(COLUMNS)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw toFriendlyError(error);
    return (data ?? []).map(toNotification);
  }

  async markRead(ids?: readonly string[]): Promise<void> {
    await rpc(this.client, 'mark_notifications_read', { p_ids: ids ? [...ids] : null });
  }

  subscribe(onNotification: (notification: AppNotification) => void): Unsubscribe {
    const uid = this.currentUserId();
    if (!uid) return () => undefined;
    const channel = this.client
      .channel(uniqueTopic(`notifications:${uid}`))
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${uid}` },
        (payload) => {
          try {
            onNotification(toNotification(payload.new));
          } catch {
            // A row this build cannot parse must not tear down the channel and
            // take every later notification down with it.
          }
        },
      )
      .subscribe();
    return () => removeChannel(this.client, channel);
  }
}
