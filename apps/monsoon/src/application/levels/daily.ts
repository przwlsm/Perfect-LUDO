import { dailyNumber, dailySeed, random } from 'app-kit';
import type { Level } from '@/domain/entities/Board';
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

/** Monday = 0 … Sunday = 6, for puzzle `n`. */
export function weekdayOf(n: number): number {
  return (dateOfDaily(n).getUTCDay() + 6) % 7;
}

/**
 * The daily board: gentle on Monday, a little bigger and more tangled each
 * day to Sunday. Which ideas appear is up to the day's own seed.
 */
export function dailySpec(n: number): LevelSpec {
  const r = random(dailySeed(dateOfDaily(n)) ^ 0x27d4eb2f);
  const t = weekdayOf(n) / 6;
  const chance = (p: number) => r() < p;
  const w = t < 0.5 ? 7 : 8;
  const h = 8 + Math.round(t * 2);
  const twoWaters = chance(0.35);
  return {
    w,
    h,
    rocks: 0.14,
    fields: Math.round((w * h) / 12) + (twoWaters ? 1 : 0),
    deadEnds: 2,
    wind: 0.6 - t * 0.2,
    twoWaters,
    bridges: chance(0.45) ? 1 : 0,
    dams: chance(0.45) ? 1 : 0,
    fixed: chance(0.5) ? 1 : 0,
    slack: 0.45,
    settled: 0.16 - t * 0.08,
    attempts: 6,
    pinAmbiguity: true,
  };
}

/** Daily puzzle `n`: the same board on every phone, built on the device from that day's seed. */
export function dailyLevel(n: number): Level {
  return buildLevel(dailySpec(n), dailySeed(dateOfDaily(n)), `d${n}`).level;
}

/**
 * The text a player shares: no board, no spoilers.
 * "Monsoon #212 🌧️🌾🌾🌾 · 38 turns · no hints".
 */
export function shareText(
  n: number,
  fields: { readonly paddies: number; readonly ponds: number },
  turns: number,
  hints: number,
  words: {
    readonly name: string;
    readonly turns: (n: number) => string;
    readonly noHints: string;
    readonly hints: (n: number) => string;
  },
): string {
  const crops = '🌾'.repeat(Math.max(0, fields.paddies)) + '🪷'.repeat(Math.max(0, fields.ponds));
  return [
    `${words.name} #${n} 🌧️${crops || '🌾'}`,
    words.turns(turns),
    hints === 0 ? words.noHints : words.hints(hints),
  ].join(' · ');
}

/** 84 → "1:24". */
export function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
