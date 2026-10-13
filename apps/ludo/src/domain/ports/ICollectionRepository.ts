import type { CollectionView } from '../collection/Collection';

/**
 * The Collection Room: achievements, thrones and the showcase, for the
 * signed-in player and for looking at other players' rooms.
 */
export interface ICollectionRepository {
  /** The caller's own room, or another player's (private rooms return the name card only). */
  getCollection(userId?: string): Promise<CollectionView>;
  /** Up to three 'ach:<id>' / 'throne:<cup>' items to show on the player's card. */
  setShowcase(items: readonly string[]): Promise<CollectionView>;
  setPublic(isPublic: boolean): Promise<CollectionView>;
  /** Clears the "new trophies" list after the owner has seen them. */
  markUnlocksSeen(): Promise<CollectionView>;
}
