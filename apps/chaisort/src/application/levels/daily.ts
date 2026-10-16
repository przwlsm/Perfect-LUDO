import { dailyNumber, dailySeed, random } from 'app-kit';
import type { Level } from '@/domain/entities/Level';
import type { LevelSpec } from '../engine/generator';
import { buildLevel } from './levels';

/** Daily puzzle #1 was this UTC day. */
export const DAILY_EPOCH = new Date(Date.UTC(2026, 9, 1));
const DAY = 86_400_000;
/** Free players can open this many recent days of the archive (today included). */
export const FREE_ARCHIVE_DAYS = 7;

/** Today's puzzle number for everyone in the world (by UTC date). */
export function todayNumber(now: Date): number {
  return dailyNumber(now, DAILY_EPOCH);
}

/** Midday UTC of puzzle `n`'s date, safely inside that day. */
export function dateOfDaily(n: number): Date {
  return new Date(DAILY_EPOCH.getTime() + (n - 1) * DAY + DAY / 2);
}

/**
 * The daily counter's shape: a gentle Monday, a little busier each day to
 * Sunday. Which twists appear is up to the day's own seed.
 */
export function dailySpec(n: number): LevelSpec {
  const r = random(dailySeed(dateOfDaily(n)) ^ 0x27d4eb2f);
  const weekday = (dateOfDaily(n).getUTCDay() + 6) % 7; // Monday = 0
  const t = weekday / 6;
  const chance = (p: number) => r() < p;
  const tall = chance(0.25) ? 1 : 0;
  const spices = chance(0.2 + 0.2 * t) ? 1 : 0;
  const lids = chance(0.3) ? 1 : 0;
  const froth = chance(0.45) ? 2 + Math.floor(r() * (1 + 2 * t)) : 0;
  const spares = tall && t > 0.4 ? 1 : 2;
  const plain = 5 + Math.round(t * 3) - spices;
  return {
    ingredients: plain,
    pool: 11,
    spices,
    spares,
    tall,
    tallFill: 5,
    froth,
    lids,
    lidPours: [3, 7],
    maxSame: spares === 1 ? 3 : 2,
    target: Math.round((plain + spices) * (3 + 0.6 * t)),
    candidates: 2,
    budget: 25_000,
  };
}

/** Daily puzzle `n`: the same counter on every phone, built on the device from that day's seed. */
export function dailyLevel(n: number): Level {
  return buildLevel(dailySpec(n), dailySeed(dateOfDaily(n)), `d${n}`);
}

/** The text a player shares: no counter, no spoilers. "Chai Sort #212 ☕ in 24 pours · no hints". */
export function shareText(
  n: number,
  pours: number,
  hints: number,
  words: {
    readonly name: string;
    readonly pours: (n: number) => string;
    readonly noHints: string;
    readonly hints: (n: number) => string;
  },
): string {
  return `${words.name} #${n} ☕ ${words.pours(pours)} · ${hints === 0 ? words.noHints : words.hints(hints)}`;
}
