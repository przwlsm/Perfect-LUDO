import type { SupabaseClient } from '@supabase/supabase-js';
import type { Move, Side } from 'baghchal-engine';
import type { OnlineMatchSnapshot, Unsubscribe } from '@/domain/entities/OnlineMatch';
import type { IOnlineMatchRepository } from '@/domain/ports/IOnlineMatchRepository';
import { parseMatchSnapshot } from './matchRows';
import { removeChannel, rpc, uniqueTopic } from './supabaseRpc';

export class SupabaseOnlineMatchRepository implements IOnlineMatchRepository {
  constructor(private readonly client: SupabaseClient) {}

  async create(side: Side, turnSeconds: number): Promise<OnlineMatchSnapshot> {
    return parseMatchSnapshot(
      await rpc(this.client, 'create_match', { p_side: side, p_turn_seconds: turnSeconds }),
    );
  }

  async join(code: string): Promise<OnlineMatchSnapshot> {
    return parseMatchSnapshot(await rpc(this.client, 'join_match', { p_code: code }));
  }

  async get(matchId: string): Promise<OnlineMatchSnapshot> {
    return parseMatchSnapshot(await rpc(this.client, 'get_match', { p_match_id: matchId }));
  }

  async submitMove(matchId: string, version: number, move: Move): Promise<OnlineMatchSnapshot> {
    return parseMatchSnapshot(
      await rpc(this.client, 'submit_move', {
        p_match_id: matchId,
        p_version: version,
        p_move: move,
      }),
    );
  }

  async claimTimeout(matchId: string, version: number): Promise<OnlineMatchSnapshot> {
    return parseMatchSnapshot(
      await rpc(this.client, 'claim_timeout', { p_match_id: matchId, p_version: version }),
    );
  }

  async resign(matchId: string): Promise<OnlineMatchSnapshot> {
    return parseMatchSnapshot(await rpc(this.client, 'resign_match', { p_match_id: matchId }));
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
