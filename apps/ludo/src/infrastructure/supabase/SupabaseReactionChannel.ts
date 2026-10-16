import type { SupabaseClient } from '@supabase/supabase-js';
import {
  parseReactionMessage,
  parseTableGiftMessage,
  type IReactionChannel,
  type ReactionMessage,
  type ReactionRoom,
  type TableGiftMessage,
} from '@/domain';
import { removeChannel } from './supabaseRpc';

/**
 * Reactions and gifts over a Realtime broadcast channel shared by everyone
 * at the table (one topic per match, so no unique suffix). Nothing touches
 * the database here; every incoming payload is validated before it is shown.
 */
export class SupabaseReactionChannel implements IReactionChannel {
  constructor(private readonly client: SupabaseClient) {}

  join(
    matchId: string,
    onReaction: (message: ReactionMessage) => void,
    onGift?: (message: TableGiftMessage) => void,
  ): ReactionRoom {
    const channel = this.client
      .channel(`reactions:${matchId}`, { config: { broadcast: { self: false } } })
      .on('broadcast', { event: 'react' }, ({ payload }) => {
        const message = parseReactionMessage(payload);
        if (message) onReaction(message);
      })
      .on('broadcast', { event: 'gift' }, ({ payload }) => {
        const message = parseTableGiftMessage(payload);
        if (message) onGift?.(message);
      })
      .subscribe();
    const broadcast = (event: string, payload: object) => {
      void channel.send({ type: 'broadcast', event, payload }).catch(() => undefined);
    };
    return {
      send: (message) => broadcast('react', message),
      sendGift: (message) => broadcast('gift', message),
      leave: () => removeChannel(this.client, channel),
    };
  }
}
