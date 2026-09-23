export interface AuthUser {
  readonly uid: string;
  readonly email: string | null;
}

export interface UserProfile {
  readonly uid: string;
  readonly displayName: string | null;
  readonly stats: {
    readonly gamesPlayed: number;
    readonly gamesWon: number;
  };
}
