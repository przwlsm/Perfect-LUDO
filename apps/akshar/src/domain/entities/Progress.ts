import { dailyStreak, localDay } from 'app-kit';
import type { Script, ScriptId } from './Script';
import { letterKey, lettersOf } from './Script';

/** Free "show me" hints a day without Plus (more by watching a video). */
export const FREE_HINTS_PER_DAY = 3;

/**
 * What the learner has written. Lives on the device only. Stars are the
 * best ever earned per letter: one or two from tracing, three once it was
 * written from memory.
 */
export interface Progress {
  readonly stars: Readonly<Record<string, number>>;
  /** Local days (YYYY-MM-DD) with any writing, newest last. */
  readonly days: readonly string[];
  /** Letters checked, all time. */
  readonly written: number;
  /** Letters written from memory with a third star. */
  readonly fromMemory: number;
  /** Free hints used on `hintDay`. */
  readonly hintDay: string;
  readonly hintsUsed: number;
}

export const NO_PROGRESS: Progress = {
  stars: {},
  days: [],
  written: 0,
  fromMemory: 0,
  hintDay: '',
  hintsUsed: 0,
};

export function starsOf(p: Progress, script: ScriptId, char: string): number {
  return p.stars[letterKey(script, char)] ?? 0;
}

/** Records one checked attempt (0 stars still counts as practice). */
export function recordAttempt(
  p: Progress,
  script: ScriptId,
  char: string,
  stars: number,
  now: Date,
): Progress {
  const key = letterKey(script, char);
  const before = p.stars[key] ?? 0;
  const best = Math.max(before, Math.min(3, Math.max(0, Math.round(stars))));
  const day = localDay(now);
  return {
    ...p,
    stars: best > 0 ? { ...p.stars, [key]: best } : p.stars,
    days: p.days.includes(day) ? p.days : [...p.days, day].slice(-400),
    written: p.written + 1,
    fromMemory: p.fromMemory + (stars >= 3 && before < 3 ? 1 : 0),
  };
}

export interface ScriptTally {
  readonly stars: number;
  readonly maxStars: number;
  /** Letters with at least one star. */
  readonly started: number;
  readonly mastered: number;
  readonly letters: number;
}

export function tally(p: Progress, script: Script): ScriptTally {
  const letters = lettersOf(script);
  let stars = 0;
  let started = 0;
  let mastered = 0;
  for (const l of letters) {
    const s = starsOf(p, script.id, l.char);
    stars += s;
    if (s > 0) started++;
    if (s >= 3) mastered++;
  }
  return { stars, maxStars: letters.length * 3, started, mastered, letters: letters.length };
}

/** The first letter in teaching order without all three stars (to continue from). */
export function nextLetterIndex(p: Progress, script: Script): number {
  const letters = lettersOf(script);
  const i = letters.findIndex((l) => starsOf(p, script.id, l.char) < 1);
  return i < 0 ? 0 : i;
}

export function streak(p: Progress, now: Date): number {
  return dailyStreak({ stars: {}, dailies: p.days }, now);
}

export function totalStars(p: Progress): number {
  return Object.values(p.stars).reduce((a, b) => a + b, 0);
}

export function freeHintsLeft(p: Progress, now: Date): number {
  return p.hintDay === localDay(now)
    ? Math.max(0, FREE_HINTS_PER_DAY - p.hintsUsed)
    : FREE_HINTS_PER_DAY;
}

/** Uses one of today's free hints; null when none is left. */
export function spendFreeHint(p: Progress, now: Date): Progress | null {
  if (freeHintsLeft(p, now) <= 0) return null;
  const day = localDay(now);
  return { ...p, hintDay: day, hintsUsed: (p.hintDay === day ? p.hintsUsed : 0) + 1 };
}

export function parseProgress(raw: string | null): Progress {
  if (!raw) return NO_PROGRESS;
  try {
    const v = JSON.parse(raw) as Partial<Progress>;
    const stars: Record<string, number> = {};
    if (v.stars && typeof v.stars === 'object') {
      for (const [k, s] of Object.entries(v.stars)) {
        if (typeof s === 'number' && s >= 1) stars[k] = Math.min(3, Math.round(s));
      }
    }
    const n = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? Math.max(0, x) : 0);
    return {
      stars,
      days: Array.isArray(v.days) ? v.days.filter((d): d is string => typeof d === 'string') : [],
      written: n(v.written),
      fromMemory: n(v.fromMemory),
      hintDay: typeof v.hintDay === 'string' ? v.hintDay : '',
      hintsUsed: n(v.hintsUsed),
    };
  } catch {
    return NO_PROGRESS;
  }
}
