import type { SupabaseClient } from '@supabase/supabase-js';
import {
  parseReactionMessage,
  type IReactionChannel,
  type ReactionMessage,
  type ReactionRoom,
} from '@/domain';
import { removeChannel } from './supabaseRpc';

/**
 * Reactions over a Realtime broadcast channel shared by everyone at the
 * table (one topic per match, so no unique suffix). Nothing touches the
 * database; every incoming payload is validated against the emoji list.
 */
export class SupabaseReactionChannel implements IReactionChannel {
  constructor(private readonly client: SupabaseClient) {}

  join(matchId: string, onReaction: (message: ReactionMessage) => void): ReactionRoom {
    const channel = this.client
      .channel(`reactions:${matchId}`, { config: { broadcast: { self: false } } })
      .on('broadcast', { event: 'react' }, ({ payload }) => {
        const message = parseReactionMessage(payload);
        if (message) onReaction(message);
      })
      .subscribe();
    return {
      send: (message) => {
        void channel
          .send({ type: 'broadcast', event: 'react', payload: message })
          .catch(() => undefined);
      },
      leave: () => removeChannel(this.client, channel),
    };
  }
}
