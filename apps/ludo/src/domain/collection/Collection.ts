import { WalletUnavailableError } from '../entities/Wallet';

/** One player's Collection Room as the server returns it. */
export interface CollectionView {
  readonly userId: string;
  readonly username: string | null;
  readonly displayName: string | null;
  readonly avatar: string | null;
  readonly country: string | null;
  /** False when a visitor is looking at a room its owner closed. */
  readonly isPublic: boolean;
  /** 'ach:<id>' or 'throne:<cup>', up to three. */
  readonly showcase: readonly string[];
  readonly stats: {
    readonly games: number;
    readonly wins: number;
    readonly bestStreak: number;
    readonly level: number;
    readonly cupsWon: number;
    readonly thrones: number;
  } | null;
  readonly thrones: readonly {
    readonly cup: string;
    readonly count: number;
    readonly wonAt: string;
  }[];
  readonly achievements: readonly {
    readonly id: string;
    readonly progress: number;
    /** 0 locked, 1 bronze … 4 platinum. */
    readonly tier: number;
    readonly unlockedAt: string | null;
  }[];
  /** Fresh unlocks the owner has not been shown yet (own room only). */
  readonly unseen: readonly { readonly id: string; readonly tier: number }[];
}

const bad = () => new WalletUnavailableError('Received a malformed collection from the server.');
const row = (v: unknown): Record<string, unknown> => {
  if (!v || typeof v !== 'object') throw bad();
  return v as Record<string, unknown>;
};
const int = (v: unknown): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.floor(v) : 0;
const optStr = (v: unknown): string | null => (typeof v === 'string' ? v : null);

export function parseCollection(v: unknown): CollectionView {
  const r = row(v);
  if (typeof r.userId !== 'string') throw bad();
  const stats = r.stats && typeof r.stats === 'object' ? row(r.stats) : null;
  return {
    userId: r.userId,
    username: optStr(r.username),
    displayName: optStr(r.displayName),
    avatar: optStr(r.avatar),
    country: optStr(r.country),
    isPublic: r.public !== false,
    showcase: Array.isArray(r.showcase)
      ? r.showcase.filter((x): x is string => typeof x === 'string')
      : [],
    stats: stats
      ? {
          games: int(stats.games),
          wins: int(stats.wins),
          bestStreak: int(stats.bestStreak),
          level: int(stats.level),
          cupsWon: int(stats.cupsWon),
          thrones: int(stats.thrones),
        }
      : null,
    thrones: Array.isArray(r.thrones)
      ? r.thrones
          .map(row)
          .map((t) => ({ cup: String(t.cup), count: int(t.count), wonAt: String(t.wonAt ?? '') }))
      : [],
    achievements: Array.isArray(r.achievements)
      ? r.achievements.map(row).map((a) => ({
          id: String(a.id),
          progress: int(a.progress),
          tier: int(a.tier),
          unlockedAt: optStr(a.unlockedAt),
        }))
      : [],
    unseen: Array.isArray(r.unseen)
      ? r.unseen.map(row).map((u) => ({ id: String(u.id), tier: int(u.tier) }))
      : [],
  };
}
