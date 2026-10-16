import type { Profile } from '../entities/OnlineMatch';

export interface IProfileRepository {
  /** The signed-in player's profile, created on first call. */
  ensure(): Promise<Profile>;
}
