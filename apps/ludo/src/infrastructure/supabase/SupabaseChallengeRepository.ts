import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  CreatedChallenge,
  GameVariant,
  IChallengeRepository,
  LinkRoom,
  LobbySnapshot,
  Unsubscribe,
} from '@/domain';
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

  async createLinkRoom(
    playerCount: number,
    stake = 0,
    variant: GameVariant = 'classic',
    teams = false,
  ): Promise<LinkRoom> {
    // Defaults are left out, so free classic rooms work on older servers too.
    const data = await rpc<{ lobbyId?: unknown; code?: unknown }>(this.client, 'create_link_room', {
      p_player_count: playerCount,
      ...(stake > 0 || variant !== 'classic' || teams ? { p_stake: stake } : {}),
      ...(variant !== 'classic' || teams ? { p_variant: variant } : {}),
      ...(teams ? { p_teams: true } : {}),
    });
    if (typeof data?.lobbyId !== 'string' || typeof data?.code !== 'string') {
      throw new Error('The game could not be created. Please try again.');
    }
    return { lobbyId: data.lobbyId, code: data.code };
  }

  async joinLinkRoom(code: string): Promise<string> {
    const data = await rpc<{ lobbyId?: unknown }>(this.client, 'join_link_room', { p_code: code });
    if (typeof data?.lobbyId !== 'string') {
      throw new Error('Could not join that game. Please try again.');
    }
    return data.lobbyId;
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

  async moveSeat(lobbyId: string, seat: number): Promise<LobbySnapshot> {
    return toLobbySnapshot(
      await rpc(this.client, 'move_lobby_seat', { p_lobby_id: lobbyId, p_seat: seat }),
    );
  }

  async seekOpponents(lobbyId: string, on: boolean): Promise<LobbySnapshot> {
    return toLobbySnapshot(
      await rpc(this.client, 'seek_opponents', { p_lobby_id: lobbyId, p_on: on }),
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
