import type { ReactionMessage } from '../social/reactions';

/** A joined table's reaction stream: send your own, hear everyone else's. */
export interface ReactionRoom {
  send(message: ReactionMessage): void;
  leave(): void;
}

/**
 * Live emoji between the players of one online match. Reactions are
 * fire-and-forget: nothing is stored, and a missed one is simply missed.
 */
export interface IReactionChannel {
  join(matchId: string, onReaction: (message: ReactionMessage) => void): ReactionRoom;
}
