export interface SocialIdentity {
  readonly id: string;
  readonly username: string;
  readonly displayName: string | null;
  readonly avatar: string | null;
  /** Eight-digit public ID friends can search for. Null for guests, who have none. */
  readonly publicId: string | null;
  readonly isGuest: boolean;
}

export interface UsernameAvailability {
  readonly available: boolean;
  /** Why it cannot be used, written for the player. Null when available. */
  readonly reason: string | null;
}

/**
 * The handle other players can find you by, kept apart from the private
 * profile (coins, stats) that only its owner may read.
 */
export interface ISocialIdentityRepository {
  /** Idempotent; assigns a username on first use so a new account is findable. */
  ensure(displayName: string | null): Promise<SocialIdentity>;
  update(changes: { username?: string; avatar?: string }): Promise<SocialIdentity>;
  /** Server-side check, usable before an account exists. */
  checkUsername(username: string): Promise<UsernameAvailability>;
}
