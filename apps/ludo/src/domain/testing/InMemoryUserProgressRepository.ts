import type { UserProfile } from '../entities/User';
import type { IUserProgressRepository } from '../ports/IUserProgressRepository';

/** In-memory IUserProgressRepository test double — stands in for Supabase in tests. */
export class InMemoryUserProgressRepository implements IUserProgressRepository {
  private readonly profiles = new Map<string, UserProfile>();

  async getProfile(uid: string): Promise<UserProfile | null> {
    return this.profiles.get(uid) ?? null;
  }

  /** Like the database: a first write creates the row with its default wallet. */
  async saveDisplayName(uid: string, displayName: string | null): Promise<void> {
    const current = this.profiles.get(uid) ?? {
      uid,
      displayName: null,
      coins: 1000,
      gamesPlayed: 0,
      gamesWon: 0,
      streak: 0,
      bestStreak: 0,
    };
    this.profiles.set(uid, { ...current, displayName });
  }

  /** Test setup for what the server already knows about an account. */
  seed(profile: UserProfile): void {
    this.profiles.set(profile.uid, profile);
  }
}
