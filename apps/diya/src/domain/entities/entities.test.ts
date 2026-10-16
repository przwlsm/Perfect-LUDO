import { colourOf, kindOf, LAMP_COLOURS, pieceOf, samePiece, WHITE, RED } from './Board';
import { festivalById, FESTIVALS } from './Festival';
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

describe('board entities', () => {
  it('names every lamp colour, and nothing else', () => {
    for (const [name, mask] of Object.entries(LAMP_COLOURS)) expect(colourOf(mask)).toBe(name);
    expect(colourOf(WHITE | RED)).toBeNull();
    expect(colourOf(7)).toBeNull();
  });

  it('turns kinds into pieces and back', () => {
    for (const k of ['mirror', 'prism', 'red', 'yellow', 'blue'] as const)
      expect(kindOf(pieceOf(k))).toBe(k);
    expect(samePiece(pieceOf('mirror', 0), pieceOf('mirror', 1))).toBe(false);
    expect(samePiece(pieceOf('red'), pieceOf('red'))).toBe(true);
    expect(samePiece(pieceOf('red'), pieceOf('blue'))).toBe(false);
  });
});

describe('settings', () => {
  it('falls back to defaults for anything malformed', () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('nope')).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('{"festival":"mars","light":"noon","timer":"yes"}')).toEqual(
      DEFAULT_SETTINGS,
    );
  });

  it('keeps what the player chose', () => {
    const s = parseSettings(
      '{"festival":"eid","light":"dusk","timer":true,"colourAid":true,"lessonsSeen":["rotate"]}',
    );
    expect(s).toMatchObject({
      festival: 'eid',
      light: 'dusk',
      timer: true,
      colourAid: true,
      lessonsSeen: ['rotate'],
    });
  });

  it('the timer is off and Diwali is on by default', () => {
    expect(DEFAULT_SETTINGS.timer).toBe(false);
    expect(DEFAULT_SETTINGS.festival).toBe('diwali');
  });
});

describe('festivals', () => {
  it('Diwali is free; every other festival is premium', () => {
    expect(festivalById('diwali').premium).toBe(false);
    expect(FESTIVALS.filter((f) => f.id !== 'diwali').every((f) => f.premium)).toBe(true);
    expect(festivalById('unknown').id).toBe('diwali');
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
  it('sells Plus once and five tips, all under the diya prefix', () => {
    expect(PLUS_SKU).toBe('diya.plus');
    expect(TIP_PRODUCTS).toHaveLength(5);
    expect(ALL_SKUS.every((s) => s.startsWith('diya.'))).toBe(true);
  });
});

describe('player record', () => {
  it('keeps the better daily result: fewer hints, then faster', () => {
    let r = recordDailyResult(NO_RECORD, 3, { seconds: 90, hints: 1, moves: 9, lamps: 2 });
    r = recordDailyResult(r, 3, { seconds: 200, hints: 0, moves: 12, lamps: 2 });
    expect(r.dailies[3]!.hints).toBe(0);
    r = recordDailyResult(r, 3, { seconds: 300, hints: 0, moves: 5, lamps: 2 });
    expect(r.dailies[3]!.seconds).toBe(200);
  });

  it('round-trips through storage and survives junk', () => {
    const r = recordDailyResult(NO_RECORD, 7, { seconds: 61, hints: 0, moves: 4, lamps: 3 });
    const back = parseRecord(
      JSON.stringify({
        ...r,
        progress: { stars: { 1: 3, 2: 2 }, dailies: ['2026-10-15'] },
        last: 4,
      }),
    );
    expect(back.dailies[7]).toEqual({ seconds: 61, hints: 0, moves: 4, lamps: 3 });
    expect(back.progress.stars).toEqual({ 1: 3, 2: 2 });
    expect(back.last).toBe(4);
    expect(parseRecord('{broken')).toEqual(NO_RECORD);
  });
});
