export interface AuthUser {
  readonly uid: string;
  readonly email: string | null;
  /**
   * A temporary session with no credentials behind it. Guests can play
   * online but cannot add friends or keep a profile; signing up later
   * keeps the same uid, so nothing played as a guest is lost.
   */
  readonly isGuest: boolean;
}

/**
 * The slice of a player's profile that follows their account between
 * devices. Deliberately excludes per-device settings (3D board, reduced
 * motion, sound) — those belong to the handset, not the account, so
 * turning off 3D on a slow phone must not disable it on a fast tablet.
 */
export interface UserProfile {
  readonly uid: string;
  readonly displayName: string | null;
  readonly coins: number;
  readonly gamesPlayed: number;
  readonly gamesWon: number;
  /** Consecutive wins right now; a loss resets it to zero. */
  readonly streak: number;
  /** High-water mark of `streak`. */
  readonly bestStreak: number;
}
