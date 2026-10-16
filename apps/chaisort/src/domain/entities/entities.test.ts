import { cupThemeById, CUP_THEMES } from './CupTheme';
import { freeHintsLeft, FREE_HINTS_PER_DAY, parseWallet, spendFreeHint } from './Hints';
import { INGREDIENTS, PLAIN_COUNT, SPICES } from './Ingredient';
import { NO_RECORD, parseRecord, recordDailyResult } from './Record';
import { DEFAULT_SETTINGS, parseSettings } from './Settings';
import { pourCue } from '../ports/Sounds';

describe('ingredients', () => {
  it('each has its own colour and its own mark', () => {
    expect(new Set(INGREDIENTS.map((i) => i.colour)).size).toBe(INGREDIENTS.length);
    expect(new Set(INGREDIENTS.map((i) => i.mark)).size).toBe(INGREDIENTS.length);
    expect(PLAIN_COUNT + SPICES.length).toBe(INGREDIENTS.length);
  });

  it('no two colours are near-twins (the marks carry the rest)', () => {
    const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    for (let a = 0; a < INGREDIENTS.length; a++) {
      for (let b = a + 1; b < INGREDIENTS.length; b++) {
        const [x, y] = [rgb(INGREDIENTS[a]!.colour), rgb(INGREDIENTS[b]!.colour)];
        const distance = Math.hypot(x[0]! - y[0]!, x[1]! - y[1]!, x[2]! - y[2]!);
        expect({ pair: [a, b], far: distance > 60 }).toEqual({ pair: [a, b], far: true });
      }
    }
  });
});

describe('hints wallet', () => {
  const day1 = new Date(2026, 9, 16, 10);
  const day2 = new Date(2026, 9, 17, 9);

  it('gives a few free hints a day, renewed tomorrow', () => {
    let w = parseWallet(null);
    expect(freeHintsLeft(w, day1)).toBe(FREE_HINTS_PER_DAY);
    for (let i = 0; i < FREE_HINTS_PER_DAY; i++) w = spendFreeHint(w, day1)!;
    expect(freeHintsLeft(w, day1)).toBe(0);
    expect(spendFreeHint(w, day1)).toBeNull();
    expect(freeHintsLeft(w, day2)).toBe(FREE_HINTS_PER_DAY);
  });

  it('survives junk', () => {
    expect(parseWallet('{oops')).toEqual(parseWallet(null));
    expect(parseWallet('{"day":3,"used":-2}')).toEqual({ day: '', used: 0 });
  });
});

describe('record', () => {
  it('keeps the better daily result: fewer hints, then fewer pours', () => {
    let r = recordDailyResult(NO_RECORD, 5, { pours: 30, hints: 1, stars: 1 });
    r = recordDailyResult(r, 5, { pours: 40, hints: 0, stars: 2 });
    expect(r.dailies[5]).toEqual({ pours: 40, hints: 0, stars: 2 });
    r = recordDailyResult(r, 5, { pours: 50, hints: 0, stars: 1 });
    expect(r.dailies[5]!.pours).toBe(40);
  });

  it('round-trips and survives junk', () => {
    const r = recordDailyResult({ ...NO_RECORD, last: 7 }, 3, { pours: 12, hints: 0, stars: 3 });
    expect(parseRecord(JSON.stringify(r))).toEqual(r);
    expect(parseRecord('nope')).toEqual(NO_RECORD);
    expect(parseRecord('{"dailies":{"x":{"pours":1}},"last":-4}').last).toBe(1);
  });
});

describe('settings', () => {
  it('colour-blind marks are on by default', () => {
    expect(DEFAULT_SETTINGS.symbols).toBe(true);
    expect(parseSettings(null).symbols).toBe(true);
  });

  it('reads what it can and defaults the rest', () => {
    const s = parseSettings(
      '{"sound":false,"light":"morning","cups":"copper","lessonsSeen":["lid","x"]}',
    );
    expect(s.sound).toBe(false);
    expect(s.light).toBe('morning');
    expect(s.cups).toBe('copper');
    expect(s.lessonsSeen).toEqual(['lid']);
    expect(parseSettings('{"cups":"teapot"}').cups).toBe('kulhad');
  });
});

describe('cup themes and sounds', () => {
  it('the kulhad is free and the default; the rest are Plus', () => {
    expect(cupThemeById('nope').id).toBe('kulhad');
    expect(CUP_THEMES.filter((c) => !c.premium).map((c) => c.id)).toEqual(['kulhad']);
  });

  it('the pour gurgle rises as the cup fills', () => {
    expect(pourCue(0)).toBe('pour1');
    expect(pourCue(0.5)).toBe('pour3');
    expect(pourCue(1)).toBe('pour5');
  });
});
