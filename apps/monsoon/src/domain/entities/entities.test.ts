import { hasTwoWaters, turnsToSolve, type Level } from './Board';
import {
  FREE_HINTS_PER_DAY,
  freeHintsLeft,
  FRESH_WALLET,
  parseWallet,
  spendFreeHint,
} from './Hints';
import { ALL_SKUS, PLUS_SKU, TIP_PRODUCTS } from './Products';
import { NO_RECORD, parseRecord, recordDailyResult } from './Record';
import { DEFAULT_SETTINGS, parseSettings } from './Settings';
import { themeById, THEMES } from './Theme';

describe('board', () => {
  const level: Level = {
    id: 't',
    w: 3,
    h: 1,
    tiles: [
      { kind: 'source', mask: 2, water: 0, fixed: false },
      { kind: 'pipe', mask: 10, fixed: false },
      { kind: 'field', mask: 8, water: 1, fixed: false },
    ],
    start: [1, 1, 2],
    budget: null,
  };

  it('counts the fewest turns: three for the spring, one for the straight, two for the pond', () => {
    expect(turnsToSolve(level)).toBe(6);
  });

  it('knows when both waters are on the board', () => {
    expect(hasTwoWaters(level)).toBe(true);
  });
});

describe('settings', () => {
  it('falls back to defaults for anything malformed', () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('nope')).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('{"theme":"mars","light":"noon","frogs":"yes"}')).toEqual(
      DEFAULT_SETTINGS,
    );
  });

  it('keeps what the player chose, and drops unknown lessons', () => {
    const s = parseSettings(
      '{"theme":"tea","light":"morning","colourAid":true,"frogs":false,"lessonsSeen":["rotate","flying"]}',
    );
    expect(s).toMatchObject({
      theme: 'tea',
      light: 'morning',
      colourAid: true,
      frogs: false,
      lessonsSeen: ['rotate'],
    });
  });

  it('rice terraces, sound and frogs are on by default', () => {
    expect(DEFAULT_SETTINGS.theme).toBe('terraces');
    expect(DEFAULT_SETTINGS.sound).toBe(true);
    expect(DEFAULT_SETTINGS.frogs).toBe(true);
  });
});

describe('themes', () => {
  it('rice terraces are free; every other valley is premium', () => {
    expect(themeById('terraces').premium).toBe(false);
    expect(THEMES.filter((t) => t.id !== 'terraces').every((t) => t.premium)).toBe(true);
    expect(THEMES).toHaveLength(5);
    expect(themeById('unknown').id).toBe('terraces');
  });
});

describe('hints', () => {
  const day = new Date(2026, 9, 15, 20);
  const next = new Date(2026, 9, 16, 9);

  it('gives a few free hints each day', () => {
    let w = FRESH_WALLET;
    for (let i = 0; i < FREE_HINTS_PER_DAY; i++) w = spendFreeHint(w, day)!;
    expect(freeHintsLeft(w, day)).toBe(0);
    expect(spendFreeHint(w, day)).toBeNull();
    expect(freeHintsLeft(w, next)).toBe(FREE_HINTS_PER_DAY);
  });

  it('parses stored wallets safely', () => {
    expect(parseWallet(null)).toEqual(FRESH_WALLET);
    expect(parseWallet('{"day":"2026-10-15","used":-4}')).toEqual({ day: '2026-10-15', used: 0 });
  });
});

describe('products', () => {
  it('sells Plus once and five tips, all under the monsoon prefix', () => {
    expect(PLUS_SKU).toBe('monsoon.plus');
    expect(TIP_PRODUCTS).toHaveLength(5);
    expect(ALL_SKUS.every((s) => s.startsWith('monsoon.'))).toBe(true);
  });
});

describe('player record', () => {
  const result = { turns: 40, hints: 1, seconds: 90, paddies: 3, ponds: 1 };

  it('keeps the better daily result: fewer hints, then fewer turns', () => {
    let r = recordDailyResult(NO_RECORD, 3, result);
    r = recordDailyResult(r, 3, { ...result, hints: 0, turns: 60 });
    expect(r.dailies[3]!.hints).toBe(0);
    r = recordDailyResult(r, 3, { ...result, hints: 0, turns: 70 });
    expect(r.dailies[3]!.turns).toBe(60);
  });

  it('round-trips through storage and survives junk', () => {
    const r = recordDailyResult(NO_RECORD, 7, result);
    const back = parseRecord(
      JSON.stringify({
        ...r,
        progress: { stars: { 1: 3, 2: 2 }, dailies: ['2026-10-15'] },
        last: 4,
      }),
    );
    expect(back.dailies[7]).toEqual(result);
    expect(back.progress.stars).toEqual({ 1: 3, 2: 2 });
    expect(back.last).toBe(4);
    expect(parseRecord('{broken')).toEqual(NO_RECORD);
  });
});
