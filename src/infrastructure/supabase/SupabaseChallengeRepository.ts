import type { SupabaseClient } from '@supabase/supabase-js';
import type { CreatedChallenge, IChallengeRepository, LobbySnapshot, Unsubscribe } from '@/domain';
import { toLobbySnapshot } from './socialRows';
import { rpc, removeChannel, uniqueTopic } from './supabaseRpc';

export class SupabaseChallengeRepository implements IChallengeRepository {
  constructor(private readonly client: SupabaseClient) {}

  async createChallenge(friendIds: readonly string[]): Promise<CreatedChallenge> {
    const data = await rpc<{ challengeId?: unknown; lobbyId?: unknown }>(
      this.client,
      'create_challenge',
      { p_friend_ids: [...friendIds] },
    );
    if (typeof data?.challengeId !== 'string' || typeof data?.lobbyId !== 'string') {
      throw new Error('The game could not be created. Please try again.');
    }
    return { challengeId: data.challengeId, lobbyId: data.lobbyId };
  }

  async respondToChallenge(challengeId: string, accept: boolean): Promise<string | null> {
    const data = await rpc<{ lobbyId?: unknown }>(this.client, 'respond_challenge', {
      p_challenge_id: challengeId,
      p_accept: accept,
    });
    if (!accept) return null;
    return typeof data?.lobbyId === 'string' ? data.lobbyId : null;
  }

  async cancelChallenge(challengeId: string): Promise<void> {
    await rpc(this.client, 'cancel_challenge', { p_challenge_id: challengeId });
  }

  async getLobby(lobbyId: string): Promise<LobbySnapshot> {
    return toLobbySnapshot(await rpc(this.client, 'get_lobby', { p_lobby_id: lobbyId }));
  }

  async joinLobby(lobbyId: string): Promise<LobbySnapshot> {
    return toLobbySnapshot(await rpc(this.client, 'join_lobby', { p_lobby_id: lobbyId }));
  }

  async leaveLobby(lobbyId: string): Promise<void> {
    await rpc(this.client, 'leave_lobby', { p_lobby_id: lobbyId });
  }

  async setReady(lobbyId: string, ready: boolean): Promise<LobbySnapshot> {
    return toLobbySnapshot(
      await rpc(this.client, 'set_lobby_ready', { p_lobby_id: lobbyId, p_ready: ready }),
    );
  }

  async startMatch(lobbyId: string): Promise<LobbySnapshot> {
    return toLobbySnapshot(await rpc(this.client, 'start_match', { p_lobby_id: lobbyId }));
  }

  subscribeToLobby(lobbyId: string, onChange: () => void): Unsubscribe {
    const handler = () => onChange();
    const channel = this.client
      .channel(uniqueTopic(`lobby:${lobbyId}`))
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lobbies', filter: `id=eq.${lobbyId}` },
        handler,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lobby_players', filter: `lobby_id=eq.${lobbyId}` },
        handler,
      )
      // Presence changes decide whether a joined player reads as connected,
      // and row-level security already scopes these to people we can see.
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_presence' }, handler)
      .subscribe();
    return () => removeChannel(this.client, channel);
  }
}
