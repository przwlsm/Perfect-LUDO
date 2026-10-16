import { localDay } from '../money/Entitlements';

/**
 * Level progress for puzzle apps: stars per level, what is unlocked, the
 * daily puzzle everyone in the world shares, and a gentle streak.
 */
export interface Progress {
  /** Level number → best stars earned (1–3). */
  readonly stars: Readonly<Record<number, number>>;
  /** Local days (`YYYY-MM-DD`) on which the daily puzzle was solved. */
  readonly dailies: readonly string[];
}

export const NO_PROGRESS: Progress = { stars: {}, dailies: [] };

/** Levels open ahead of the furthest one solved, so a stuck player can skip around. */
export const OPEN_AHEAD = 3;

export function recordLevel(p: Progress, level: number, stars: number): Progress {
  const best = Math.max(p.stars[level] ?? 0, Math.min(3, Math.max(1, Math.round(stars))));
  return { ...p, stars: { ...p.stars, [level]: best } };
}

/** The highest level a player may open (levels start at 1). */
export function highestOpen(p: Progress): number {
  const solved = Object.keys(p.stars).map(Number);
  const furthest = solved.length ? Math.max(...solved) : 0;
  return furthest + OPEN_AHEAD;
}

export function isLevelOpen(p: Progress, level: number): boolean {
  return level >= 1 && level <= highestOpen(p);
}

export function totalStars(p: Progress): number {
  return Object.values(p.stars).reduce((a, b) => a + b, 0);
}

export function recordDaily(p: Progress, now: Date): Progress {
  const day = localDay(now);
  if (p.dailies.includes(day)) return p;
  // Keep a year of history; enough for the streak and the calendar.
  return { ...p, dailies: [...p.dailies, day].slice(-366) };
}

/** Consecutive days, ending today or yesterday, with the daily solved. */
export function dailyStreak(p: Progress, now: Date): number {
  const done = new Set(p.dailies);
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!done.has(localDay(day))) day.setDate(day.getDate() - 1);
  let streak = 0;
  while (done.has(localDay(day))) {
    streak++;
    day.setDate(day.getDate() - 1);
  }
  return streak;
}

/**
 * The daily puzzle's seed: the same number for everyone on the same UTC
 * date, so friends can compare the same board. Mixed so neighbouring days
 * give unrelated puzzles.
 */
export function dailySeed(now: Date, salt = 0): number {
  const day = Math.floor(now.getTime() / 86_400_000);
  let h = (day * 2654435761 + salt * 40503) >>> 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  return h >>> 0;
}

/** The UTC date a daily seed belongs to, for its share text ("Diya #212"). */
export function dailyNumber(now: Date, epoch: Date): number {
  return Math.floor((now.getTime() - epoch.getTime()) / 86_400_000) + 1;
}

export function parseProgress(raw: string | null): Progress {
  if (!raw) return NO_PROGRESS;
  try {
    const v = JSON.parse(raw) as Partial<Progress>;
    const stars: Record<number, number> = {};
    if (v.stars && typeof v.stars === 'object') {
      for (const [k, s] of Object.entries(v.stars)) {
        const level = Number(k);
        if (Number.isInteger(level) && level > 0 && typeof s === 'number') {
          stars[level] = Math.min(3, Math.max(1, Math.round(s)));
        }
      }
    }
    const dailies = Array.isArray(v.dailies)
      ? v.dailies.filter((d): d is string => typeof d === 'string')
      : [];
    return { stars, dailies };
  } catch {
    return NO_PROGRESS;
  }
}
