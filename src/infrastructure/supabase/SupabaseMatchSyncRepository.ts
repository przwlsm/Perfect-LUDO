import type { SupabaseClient } from '@supabase/supabase-js';
import type { GameState, IMatchSyncRepository, OnlineMatchSnapshot, Unsubscribe } from '@/domain';
import { toMatchSnapshot } from './socialRows';
import { removeChannel, rpc, uniqueTopic } from './supabaseRpc';

export class SupabaseMatchSyncRepository implements IMatchSyncRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getMatchForLobby(lobbyId: string): Promise<OnlineMatchSnapshot> {
    return toMatchSnapshot(await rpc(this.client, 'get_match', { p_lobby_id: lobbyId }));
  }

  async rollDice(matchId: string, version: number): Promise<OnlineMatchSnapshot> {
    return toMatchSnapshot(
      await rpc(this.client, 'roll_match_dice', { p_match_id: matchId, p_version: version }),
    );
  }

  async submitTurn(
    matchId: string,
    version: number,
    state: GameState,
    winnerSeat: number | null,
  ): Promise<OnlineMatchSnapshot> {
    return toMatchSnapshot(
      await rpc(this.client, 'submit_match_turn', {
        p_match_id: matchId,
        p_version: version,
        p_state: state,
        p_winner_seat: winnerSeat,
      }),
    );
  }

  async claimTimeout(matchId: string, version: number): Promise<OnlineMatchSnapshot> {
    return toMatchSnapshot(
      await rpc(this.client, 'claim_turn_timeout', { p_match_id: matchId, p_version: version }),
    );
  }

  async abandon(matchId: string): Promise<OnlineMatchSnapshot> {
    return toMatchSnapshot(await rpc(this.client, 'abandon_match', { p_match_id: matchId }));
  }

  subscribe(
    matchId: string,
    onChange: () => void,
    onStatus?: (connected: boolean) => void,
  ): Unsubscribe {
    const channel = this.client
      .channel(uniqueTopic(`match:${matchId}`))
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'matches', filter: `id=eq.${matchId}` },
        () => onChange(),
      )
      .subscribe((status) => {
        onStatus?.(status === 'SUBSCRIBED');
        if (status === 'SUBSCRIBED') onChange();
      });
    return () => removeChannel(this.client, channel);
  }
}
