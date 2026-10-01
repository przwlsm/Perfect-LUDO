import type { VersionPolicy } from '../entities/AppVersion';

export type StorePlatform = 'android' | 'ios';

/** Where the server publishes the minimum and newest store versions. */
export interface IAppVersionRepository {
  /**
   * Null when the policy could not be fetched. Callers must treat that as
   * "no requirement": being offline must never lock a player out.
   */
  fetchPolicy(platform: StorePlatform): Promise<VersionPolicy | null>;
}
