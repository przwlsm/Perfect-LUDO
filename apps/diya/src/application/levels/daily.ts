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

/**
 * The daily board's shape: gentle on Monday, a little harder each day to
 * Sunday. Ideas are mixed by the day's own seed.
 */
export function dailySpec(n: number): LevelSpec {
  const seed = dailySeed(dateOfDaily(n));
  const r = random(seed ^ 0x27d4eb2f);
  const weekday = (dateOfDaily(n).getUTCDay() + 6) % 7; // Monday = 0
  const t = weekday / 6;
  const chance = (p: number) => r() < p;
  const glass = chance(0.6) ? 1 + (chance(0.5) ? 1 : 0) : 0;
  const mixing = glass === 2 && chance(0.5);
  return {
    w: 7,
    h: t > 0.5 ? 9 : 8,
    flames: chance(0.25) ? 2 : 1,
    pieces: 3 + Math.round(t * 2) + (mixing ? 1 : 0),
    pivots: chance(0.25) ? 1 : 0,
    fixed: chance(0.4) ? 1 : 0,
    prisms: mixing ? 1 : chance(0.6) ? 1 : 0,
    glass,
    mixing,
    oneways: chance(0.3) ? 1 : 0,
    sleepers: chance(0.45) ? 1 : 0,
    walls: 3 + Math.floor(r() * 3),
    diyas: [1, 3],
    difficulty: 5 + t * 4,
    harden: 4,
    candidates: 2,
  };
}

/** Daily puzzle `n`: the same board on every phone, built on the device from that day's seed. */
export function dailyLevel(n: number): Level {
  return buildLevel(dailySpec(n), dailySeed(dateOfDaily(n)), `d${n}`);
}

/** The text a player shares: no board, no spoilers. "Diya #212 🪔🪔🪔 · 1:24 · no hints". */
export function shareText(
  n: number,
  lamps: number,
  seconds: number | null,
  hints: number,
  words: { readonly name: string; readonly noHints: string; readonly hints: (n: number) => string },
): string {
  const parts = [`${words.name} #${n} ${'🪔'.repeat(Math.max(1, lamps))}`];
  if (seconds !== null) parts.push(clock(seconds));
  parts.push(hints === 0 ? words.noHints : words.hints(hints));
  return parts.join(' · ');
}

/** 84 → "1:24". */
export function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
