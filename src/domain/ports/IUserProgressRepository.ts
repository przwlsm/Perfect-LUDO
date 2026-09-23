import type { UserProfile } from '../entities/User';

export interface IUserProgressRepository {
  getProfile(uid: string): Promise<UserProfile | null>;
  createProfile(uid: string, displayName: string | null): Promise<UserProfile>;
  recordGameResult(uid: string, result: { readonly won: boolean }): Promise<UserProfile>;
}
