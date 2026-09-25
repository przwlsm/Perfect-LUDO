import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Friend,
  FriendRequest,
  IFriendsRepository,
  Unsubscribe,
  UserSearchResult,
} from '@/domain';
import { toFriend, toFriendRequest, toSearchResult } from './socialRows';
import { rpc, removeChannel, uniqueTopic, type CurrentUserId } from './supabaseRpc';

export class SupabaseFriendsRepository implements IFriendsRepository {
  constructor(
    private readonly client: SupabaseClient,
    private readonly currentUserId: CurrentUserId,
  ) {}

  async searchUsers(query: string): Promise<readonly UserSearchResult[]> {
    const trimmed = query.trim();
    // The server requires two characters; asking anyway would just be a
    // guaranteed-empty round trip on every keystroke.
    if (trimmed.length < 2) return [];
    const rows = await rpc<unknown[]>(this.client, 'search_users', { p_query: trimmed });
    return (rows ?? []).map(toSearchResult);
  }

  async listFriends(): Promise<readonly Friend[]> {
    const rows = await rpc<unknown[]>(this.client, 'list_friends');
    return (rows ?? []).map(toFriend);
  }

  listIncomingRequests(): Promise<readonly FriendRequest[]> {
    return this.requests('incoming');
  }

  listSentRequests(): Promise<readonly FriendRequest[]> {
    return this.requests('sent');
  }

  private async requests(direction: 'incoming' | 'sent'): Promise<readonly FriendRequest[]> {
    const rows = await rpc<unknown[]>(this.client, 'list_friend_requests', {
      p_direction: direction,
    });
    return (rows ?? []).map(toFriendRequest);
  }

  async sendRequest(targetUserId: string): Promise<void> {
    await rpc(this.client, 'send_friend_request', { p_target: targetUserId });
  }

  async respondToRequest(requestId: string, accept: boolean): Promise<void> {
    await rpc(this.client, 'respond_friend_request', {
      p_request_id: requestId,
      p_accept: accept,
    });
  }

  async cancelRequest(requestId: string): Promise<void> {
    await rpc(this.client, 'cancel_friend_request', { p_request_id: requestId });
  }

  async removeFriend(friendId: string): Promise<void> {
    await rpc(this.client, 'remove_friend', { p_friend_id: friendId });
  }

  subscribe(onChange: () => void): Unsubscribe {
    const uid = this.currentUserId();
    if (!uid) return () => undefined;
    const handler = () => onChange();
    const channel = this.client
      .channel(uniqueTopic(`friends:${uid}`))
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friend_requests', filter: `receiver_id=eq.${uid}` },
        handler,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friend_requests', filter: `sender_id=eq.${uid}` },
        handler,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friendships', filter: `user_id=eq.${uid}` },
        handler,
      )
      // No filter: row-level security already limits presence rows to this
      // user and their friends, so the server does the narrowing.
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_presence' }, handler)
      .subscribe();
    return () => removeChannel(this.client, channel);
  }
}
