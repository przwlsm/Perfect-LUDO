import { dailyNumber, dailySeed } from 'app-kit';
import { encodePuzzle, decodePuzzle, type Level } from '@/domain/entities/Board';
import { generate, type GenSpec } from '../engine/generator';
import { clock } from '../game/play';

/** Daily kolam #1 was this UTC day. */
export const DAILY_EPOCH = new Date(Date.UTC(2026, 9, 1));
const DAY = 86_400_000;
/** Free players can open this many recent days of the archive (today included). */
export const FREE_ARCHIVE_DAYS = 7;

/** Today's kolam number for everyone in the world (by UTC date). */
export function todayNumber(now: Date): number {
  return dailyNumber(now, DAILY_EPOCH);
}

/** Midday UTC of kolam `n`'s date, safely inside that day. */
export function dateOfDaily(n: number): Date {
  return new Date(DAILY_EPOCH.getTime() + (n - 1) * DAY + DAY / 2);
}

/**
 * The week's rhythm: a small, gentle board on Monday growing to a deeper
 * 8×8 at the weekend. The same for everyone on the same day.
 */
export function dailySpec(n: number): GenSpec {
  const weekday = (dateOfDaily(n).getUTCDay() + 6) % 7; // Monday = 0
  if (weekday <= 1) return { rows: 6, cols: 6, tier: 2 };
  if (weekday <= 3) return { rows: 7, cols: 7, tier: 2 };
  if (weekday === 4) return { rows: 7, cols: 7, tier: 3 };
  return { rows: 8, cols: 8, tier: 3 };
}

const cache = new Map<number, Level>();

/** Daily kolam `n`: built on the phone from that day's seed, the same board everywhere. */
export function dailyLevel(n: number): Level {
  const hit = cache.get(n);
  if (hit) return hit;
  const made = generate(dailySpec(n), dailySeed(dateOfDaily(n)));
  const { puzzle, tier } = decodePuzzle(encodePuzzle(made.puzzle, made.tier));
  const level: Level = { id: `d${n}`, puzzle, tier };
  cache.set(n, level);
  return level;
}

export interface ShareWords {
  readonly name: string;
  readonly noHints: string;
  readonly hints: (count: number) => string;
}

/** What a player shares: no board, no spoilers. "Kolam #212 ✿ 7×7 · 3:10 · no hints". */
export function shareText(
  n: number,
  size: string,
  seconds: number | null,
  hints: number,
  words: ShareWords,
): string {
  const parts = [`${words.name} #${n} ✿ ${size}`];
  if (seconds !== null) parts.push(clock(seconds));
  parts.push(hints === 0 ? words.noHints : words.hints(hints));
  return parts.join(' · ');
}
