import type { ReactionMessage } from '../social/reactions';
import type { TableGiftMessage } from '../social/tableGifts';

/** A joined table's reaction stream: send your own, hear everyone else's. */
export interface ReactionRoom {
  send(message: ReactionMessage): void;
  /** Announces a gift the server has already charged, so every phone plays it. */
  sendGift(message: TableGiftMessage): void;
  leave(): void;
}

/**
 * Live emoji and gifts between the players of one online match. Both are
 * fire-and-forget: nothing is stored here, and a missed one is simply missed.
 * (A gift's gems are charged by the server before it is announced.)
 */
export interface IReactionChannel {
  join(
    matchId: string,
    onReaction: (message: ReactionMessage) => void,
    onGift?: (message: TableGiftMessage) => void,
  ): ReactionRoom;
}
