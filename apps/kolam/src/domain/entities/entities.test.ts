import { contrast } from 'app-kit';
import { decodePuzzle, encodePuzzle, NO_CLUE, sizeLabel, starsFor } from './Board';
import { FREE_HINTS_PER_DAY, freeHintsLeft, parseWallet, spendFreeHint } from './Hints';
import { lookById, LOOKS } from './Look';
import { ALL_SKUS, PLUS_SKU, TIP_PRODUCTS } from './Products';
import { MAX_SAVES, NO_RECORD, parseRecord, withSave } from './Record';
import { DEFAULT_SETTINGS, parseSettings } from './Settings';

describe('Board', () => {
  it('round-trips a puzzle through text', () => {
    const p = { rows: 2, cols: 3, clues: [3, NO_CLUE, 0, 1, 2, NO_CLUE] };
    const text = encodePuzzle(p, 2);
    expect(text).toBe('2;3;2;3.012.');
    expect(decodePuzzle(text)).toEqual({ puzzle: p, tier: 2 });
    expect(sizeLabel(p)).toBe('3×2');
  });

  it('refuses malformed text', () => {
    expect(() => decodePuzzle('2;2;1;...')).toThrow();
    expect(() => decodePuzzle('2;2;1;..5.')).toThrow();
    expect(() => decodePuzzle('x')).toThrow();
  });

  it('gives three stars without hints, two with one, one otherwise', () => {
    expect(starsFor(0)).toBe(3);
    expect(starsFor(1)).toBe(2);
    expect(starsFor(2)).toBe(1);
    expect(starsFor(9)).toBe(1);
  });
});

describe('Hints wallet', () => {
  const day = new Date(2026, 9, 15, 9);
  it('gives a few free hints a day and refills the next day', () => {
    let w = parseWallet(null);
    for (let i = 0; i < FREE_HINTS_PER_DAY; i++) w = spendFreeHint(w, day)!;
    expect(freeHintsLeft(w, day)).toBe(0);
    expect(spendFreeHint(w, day)).toBeNull();
    expect(freeHintsLeft(w, new Date(2026, 9, 16, 9))).toBe(FREE_HINTS_PER_DAY);
  });
  it('survives junk', () => {
    expect(parseWallet('{oops')).toEqual({ day: '', used: 0 });
    expect(parseWallet('{"day":3,"used":-2}')).toEqual({ day: '', used: 0 });
  });
});

describe('Settings', () => {
  it('starts friendly for beginners: errors shown, auto-cross on, timer hidden', () => {
    expect(DEFAULT_SETTINGS.showErrors).toBe(true);
    expect(DEFAULT_SETTINGS.autoCross).toBe(true);
    expect(DEFAULT_SETTINGS.timer).toBe(false);
  });
  it('parses what was stored and ignores junk', () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('nope')).toEqual(DEFAULT_SETTINGS);
    const s = parseSettings('{"theme":"dawn","timer":true,"autoCross":false,"reduceMotion":true}');
    expect(s.theme).toBe('dawn');
    expect(s.timer).toBe(true);
    expect(s.autoCross).toBe(false);
    expect(s.reduceMotion).toBe(true);
    expect(parseSettings('{"theme":"neon"}').theme).toBe('system');
  });
});

describe('Record', () => {
  it('keeps only the most recent saves', () => {
    let r = NO_RECORD;
    for (let i = 1; i <= MAX_SAVES + 3; i++)
      r = withSave(r, String(i), { marks: '0', seconds: i, hints: 0 });
    expect(Object.keys(r.saves)).toHaveLength(MAX_SAVES);
    expect(r.saves['1']).toBeUndefined();
    expect(r.saves[String(MAX_SAVES + 3)]).toBeDefined();
    r = withSave(r, String(MAX_SAVES + 3), null);
    expect(r.saves[String(MAX_SAVES + 3)]).toBeUndefined();
  });
  it('round-trips and survives junk', () => {
    const r = {
      ...NO_RECORD,
      last: 7,
      progress: { stars: { 1: 3, 2: 2 }, dailies: ['2026-10-15'] },
      saves: { '7': { marks: '0120', seconds: 30, hints: 1 } },
      dailies: { 15: { seconds: 190, hints: 0 } },
    };
    expect(parseRecord(JSON.stringify(r))).toEqual(r);
    expect(parseRecord('{"last":"x","saves":{"a":{"marks":4}}}')).toEqual(NO_RECORD);
    expect(parseRecord('][')).toEqual(NO_RECORD);
  });
});

describe('Products and looks', () => {
  it('sells Plus once and tips under the kolam prefix', () => {
    expect(PLUS_SKU).toBe('kolam.plus');
    expect(TIP_PRODUCTS.every((t) => t.sku.startsWith('kolam.tip.'))).toBe(true);
    expect(new Set(ALL_SKUS).size).toBe(ALL_SKUS.length);
  });
  it('keeps Classic free and the rest premium', () => {
    expect(LOOKS.filter((l) => !l.premium).map((l) => l.id)).toEqual(['classic']);
    expect(lookById('nope').id).toBe('classic');
  });
  it('draws every line clearly on its floor', () => {
    const DAWN_EARTH = '#2a1a14';
    const COURTYARD = '#f1dfbd';
    for (const look of LOOKS) {
      for (const c of look.dawn.line) {
        expect(contrast(c, look.dawn.floor?.[0] ?? DAWN_EARTH)).toBeGreaterThanOrEqual(3);
      }
      for (const c of look.courtyard.line) {
        expect(contrast(c, look.courtyard.floor?.[0] ?? COURTYARD)).toBeGreaterThanOrEqual(3);
      }
    }
  });
});
