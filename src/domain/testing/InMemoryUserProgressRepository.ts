import type { UserProfile } from '../entities/User';
import type { IUserProgressRepository } from '../ports/IUserProgressRepository';

/** In-memory IUserProgressRepository test double — stands in for Firestore in tests. */
export class InMemoryUserProgressRepository implements IUserProgressRepository {
  private readonly profiles = new Map<string, UserProfile>();

  async getProfile(uid: string): Promise<UserProfile | null> {
    return this.profiles.get(uid) ?? null;
  }

  async createProfile(uid: string, displayName: string | null): Promise<UserProfile> {
    const profile: UserProfile = { uid, displayName, stats: { gamesPlayed: 0, gamesWon: 0 } };
    this.profiles.set(uid, profile);
    return profile;
  }

  async recordGameResult(uid: string, result: { readonly won: boolean }): Promise<UserProfile> {
    const existing = this.profiles.get(uid);
    if (!existing) {
      throw new Error(`No profile found for uid ${uid}`);
    }
    const updated: UserProfile = {
      ...existing,
      stats: {
        gamesPlayed: existing.stats.gamesPlayed + 1,
        gamesWon: existing.stats.gamesWon + (result.won ? 1 : 0),
      },
    };
    this.profiles.set(uid, updated);
    return updated;
  }
}
