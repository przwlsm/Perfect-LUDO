import type { SupabaseClient } from '@supabase/supabase-js';
import { parseCollection, type CollectionView, type ICollectionRepository } from '@/domain';
import { rpc } from './supabaseRpc';

export class SupabaseCollectionRepository implements ICollectionRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getCollection(userId?: string): Promise<CollectionView> {
    return parseCollection(
      await rpc(this.client, 'get_collection', userId ? { p_uid: userId } : {}),
    );
  }

  async setShowcase(items: readonly string[]): Promise<CollectionView> {
    return parseCollection(await rpc(this.client, 'set_showcase', { p_items: [...items] }));
  }

  async setPublic(isPublic: boolean): Promise<CollectionView> {
    return parseCollection(await rpc(this.client, 'set_collection_public', { p_public: isPublic }));
  }

  async markUnlocksSeen(): Promise<CollectionView> {
    return parseCollection(await rpc(this.client, 'mark_unlocks_seen'));
  }
}
