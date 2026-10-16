import type { ToyId } from './Toy';

/**
 * The traveller's passport: a stamp for every toy visited and the calm
 * minutes spent with each. No streaks, no targets, nothing to lose.
 */
export interface Stamp {
  /** Epoch ms of the first visit, when the stamp was inked. */
  readonly since: number;
  readonly visits: number;
  readonly seconds: number;
}

export type Passport = Readonly<Partial<Record<ToyId, Stamp>>>;

/** A visit shorter than this is not counted as calm time (a peek, not a stay). */
const MIN_SECONDS = 3;
/** Longer than this in one go is capped, so a phone left open does not inflate the total. */
const MAX_SECONDS = 60 * 60;

/**
 * Inks the stamp the moment a traveller has settled into a toy, before the
 * visit is over. Does nothing if the stamp is already there.
 */
export function ink(p: Passport, toy: ToyId, now: number): Passport {
  if (p[toy]) return p;
  return { ...p, [toy]: { since: now, visits: 0, seconds: 0 } };
}

export function recordVisit(p: Passport, toy: ToyId, seconds: number, now: number): Passport {
  const counted = seconds < MIN_SECONDS ? 0 : Math.min(MAX_SECONDS, Math.round(seconds));
  const prior = p[toy];
  const stamp: Stamp = prior
    ? { since: prior.since, visits: prior.visits + 1, seconds: prior.seconds + counted }
    : { since: now, visits: 1, seconds: counted };
  return { ...p, [toy]: stamp };
}

export function totalMinutes(p: Passport): number {
  let seconds = 0;
  for (const stamp of Object.values(p)) seconds += stamp?.seconds ?? 0;
  return Math.floor(seconds / 60);
}

export function stampCount(p: Passport): number {
  return Object.values(p).filter(Boolean).length;
}

export function parsePassport(raw: string | null): Passport {
  if (!raw) return {};
  try {
    const v = JSON.parse(raw) as Record<string, Partial<Stamp>>;
    const out: Partial<Record<ToyId, Stamp>> = {};
    for (const [toy, s] of Object.entries(v)) {
      if (
        s &&
        typeof s.since === 'number' &&
        typeof s.visits === 'number' &&
        typeof s.seconds === 'number'
      ) {
        out[toy as ToyId] = { since: s.since, visits: s.visits, seconds: s.seconds };
      }
    }
    return out;
  } catch {
    return {};
  }
}
