import { passId, penById, surfaceById } from './Cosmetics';
import { PLUS_SKU, TIP_PRODUCTS } from './Products';
import {
  FREE_HINTS_PER_DAY,
  freeHintsLeft,
  nextLetterIndex,
  NO_PROGRESS,
  parseProgress,
  recordAttempt,
  spendFreeHint,
  starsOf,
  streak,
  tally,
  totalStars,
} from './Progress';
import { DEFAULT_SETTINGS, parseSettings, penWidthFor } from './Settings';
import { scriptById } from './scripts';

const noon = (d: number) => new Date(2026, 9, d, 12);

describe('progress', () => {
  it('keeps the best stars per letter and counts practice days', () => {
    let p = recordAttempt(NO_PROGRESS, 'tamil', 'அ', 1, noon(1));
    p = recordAttempt(p, 'tamil', 'அ', 0, noon(1));
    expect(starsOf(p, 'tamil', 'அ')).toBe(1);
    p = recordAttempt(p, 'tamil', 'அ', 3, noon(2));
    expect(starsOf(p, 'tamil', 'அ')).toBe(3);
    expect(p.days).toEqual(['2026-10-01', '2026-10-02']);
    expect(p.written).toBe(3);
    expect(p.fromMemory).toBe(1);
    expect(streak(p, noon(2))).toBe(2);
    expect(streak(p, noon(5))).toBe(0);
  });

  it('a zero-star attempt is practice but not progress', () => {
    const p = recordAttempt(NO_PROGRESS, 'urdu', 'ب', 0, noon(3));
    expect(p.stars).toEqual({});
    expect(p.days).toHaveLength(1);
  });

  it('tallies a script and finds where to continue', () => {
    const tamil = scriptById('tamil');
    let p = recordAttempt(NO_PROGRESS, 'tamil', 'அ', 2, noon(1));
    p = recordAttempt(p, 'tamil', 'ஆ', 3, noon(1));
    const t = tally(p, tamil);
    expect(t.stars).toBe(5);
    expect(t.started).toBe(2);
    expect(t.mastered).toBe(1);
    expect(t.maxStars).toBe(t.letters * 3);
    expect(nextLetterIndex(p, tamil)).toBe(2);
    expect(totalStars(p)).toBe(5);
  });

  it('gives a few free hints a day', () => {
    let p = NO_PROGRESS;
    for (let i = 0; i < FREE_HINTS_PER_DAY; i++) p = spendFreeHint(p, noon(1))!;
    expect(freeHintsLeft(p, noon(1))).toBe(0);
    expect(spendFreeHint(p, noon(1))).toBeNull();
    expect(freeHintsLeft(p, noon(2))).toBe(FREE_HINTS_PER_DAY);
  });

  it('parses what was stored and survives junk', () => {
    const p = recordAttempt(NO_PROGRESS, 'kannada', 'ಕ', 2, noon(1));
    expect(parseProgress(JSON.stringify(p))).toEqual(p);
    expect(parseProgress('{oops')).toEqual(NO_PROGRESS);
    expect(parseProgress(null)).toEqual(NO_PROGRESS);
    expect(parseProgress(JSON.stringify({ stars: { a: 9, b: 'x' } })).stars).toEqual({ a: 3 });
  });
});

describe('settings', () => {
  it('round-trips and drops unknown values', () => {
    const s = { ...DEFAULT_SETTINGS, scripts: ['tamil', 'urdu'] as const, onboarded: true };
    expect(parseSettings(JSON.stringify(s))).toEqual(s);
    const odd = parseSettings(
      JSON.stringify({ theme: 'neon', scripts: ['tamil', 'klingon', 'tamil'], pen: 'laser' }),
    );
    expect(odd.theme).toBe('system');
    expect(odd.scripts).toEqual(['tamil']);
    expect(odd.pen).toBe('ink');
    expect(parseSettings('nope')).toEqual(DEFAULT_SETTINGS);
  });

  it('is not onboarded without a script', () => {
    expect(parseSettings(JSON.stringify({ onboarded: true, scripts: [] })).onboarded).toBe(false);
  });

  it('pen widths grow with thickness and the box', () => {
    expect(penWidthFor('fine', 360)).toBeLessThan(penWidthFor('medium', 360));
    expect(penWidthFor('medium', 360)).toBeLessThan(penWidthFor('bold', 360));
    expect(penWidthFor('fine', 50)).toBe(6);
  });
});

describe('cosmetics and products', () => {
  it('falls back to the free desk and pen', () => {
    expect(surfaceById('nope').id).toBe('desk');
    expect(penById('nope').id).toBe('ink');
    expect(surfaceById('desk').premium).toBe(false);
    expect(penById('gold').premium).toBe(true);
    expect(passId('pen', 'gold')).toBe('pen.gold');
  });

  it('sells Plus and tips under the akshar prefix', () => {
    expect(PLUS_SKU).toBe('akshar.plus');
    expect(TIP_PRODUCTS.every((t) => t.sku.startsWith('akshar.tip.'))).toBe(true);
  });
});
