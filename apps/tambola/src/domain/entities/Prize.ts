/**
 * The prizes a game can offer. Full House is always on; the host chooses
 * which of the others to play for.
 */
export type PrizeId = 'early5' | 'top' | 'middle' | 'bottom' | 'corners' | 'full';

/** Every prize, in the order they usually fall and the order screens list them. */
export const ALL_PRIZES: readonly PrizeId[] = [
  'early5',
  'top',
  'middle',
  'bottom',
  'corners',
  'full',
];

/** The prizes a host may switch off (everything but Full House). */
export const OPTIONAL_PRIZES: readonly PrizeId[] = ['early5', 'top', 'middle', 'bottom', 'corners'];

export const DEFAULT_PRIZES: readonly PrizeId[] = ALL_PRIZES;

export function isPrizeId(v: unknown): v is PrizeId {
  return typeof v === 'string' && (ALL_PRIZES as readonly string[]).includes(v);
}

/** Normalises a prize list: known ids only, no repeats, Full House always included, in play order. */
export function normalizePrizes(list: readonly string[]): PrizeId[] {
  const wanted = new Set(list.filter(isPrizeId));
  wanted.add('full');
  return ALL_PRIZES.filter((p) => wanted.has(p));
}
