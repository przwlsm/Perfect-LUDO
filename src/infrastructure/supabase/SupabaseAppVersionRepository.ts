import type { SupabaseClient } from '@supabase/supabase-js';
import {
  parseVersionPolicy,
  type IAppVersionRepository,
  type StorePlatform,
  type VersionPolicy,
} from '@/domain';

/** Reads the published version policy; any failure reads as "no policy". */
export class SupabaseAppVersionRepository implements IAppVersionRepository {
  constructor(private readonly client: SupabaseClient) {}

  async fetchPolicy(platform: StorePlatform): Promise<VersionPolicy | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const { data, error } = await this.client
        .rpc('get_app_version_policy', { p_platform: platform })
        .abortSignal(controller.signal);
      return error ? null : parseVersionPolicy(data);
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }
}
