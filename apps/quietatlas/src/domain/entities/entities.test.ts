import {
  AD_PASSES_PER_DAY,
  grantDayPass,
  isLookOpen,
  NO_ENTITLEMENTS,
  parseEntitlements,
  passesLeftToday,
  passRemaining,
} from './Entitlements';
import { defaultLook, LOOKS, lookById, looksFor } from './Look';
import { ink, parsePassport, recordVisit, stampCount, totalMinutes } from './Passport';
import { ALL_SKUS, isTipSku, PLUS_SKU } from './Products';
import { parseSettings, DEFAULT_SETTINGS } from './Settings';
import { COMING_SOON, flagOf, isToyId, TOYS, toyOfTheDay } from './Toy';

describe('toys', () => {
  it('have unique ids and a free look each', () => {
    expect(new Set(TOYS.map((t) => t.id)).size).toBe(TOYS.length);
    for (const toy of TOYS) {
      expect(looksFor(toy.id).length).toBeGreaterThanOrEqual(2);
      expect(defaultLook(toy.id).premium).toBe(false);
    }
  });

  it('no destination shares a country pin with a toy', () => {
    const toyCountries = new Set(TOYS.map((t) => t.country));
    for (const d of COMING_SOON) expect(toyCountries.has(d.country)).toBe(false);
  });

  it('turns a country code into its flag', () => {
    expect(flagOf('IN')).toBe('🇮🇳');
    expect(flagOf('np')).toBe('🇳🇵');
  });

  it('the toy of the day cycles through every toy', () => {
    const seen = new Set<string>();
    for (let d = 0; d < TOYS.length; d++) seen.add(toyOfTheDay(new Date(2026, 9, 1 + d)).id);
    expect(seen.size).toBe(TOYS.length);
    expect(toyOfTheDay(new Date(2026, 9, 1, 1))).toEqual(toyOfTheDay(new Date(2026, 9, 1, 23)));
  });

  it('recognises toy ids', () => {
    expect(isToyId('ebru')).toBe(true);
    expect(isToyId('kintsugi')).toBe(false);
  });
});

describe('looks', () => {
  it('have unique ids and colours', () => {
    expect(new Set(LOOKS.map((l) => l.id)).size).toBe(LOOKS.length);
    for (const l of LOOKS) {
      expect(l.colors.length).toBeGreaterThan(0);
      expect(l.id.startsWith(`${l.toy}.`)).toBe(true);
    }
    expect(lookById('ebru.tulip')?.toy).toBe('ebru');
  });
});

describe('entitlements', () => {
  const premium = LOOKS.find((l) => l.premium)!;
  const free = LOOKS.find((l) => !l.premium)!;
  const now = new Date(2026, 9, 15, 12);

  it('free looks are always open, premium ones need Plus or a pass', () => {
    expect(isLookOpen(NO_ENTITLEMENTS, free, now.getTime())).toBe(true);
    expect(isLookOpen(NO_ENTITLEMENTS, premium, now.getTime())).toBe(false);
    expect(isLookOpen({ ...NO_ENTITLEMENTS, plus: true }, premium, now.getTime())).toBe(true);
  });

  it('a day pass opens a look for 24 hours', () => {
    const e = grantDayPass(NO_ENTITLEMENTS, premium.id, now);
    expect(isLookOpen(e, premium, now.getTime() + 23 * 3_600_000)).toBe(true);
    expect(isLookOpen(e, premium, now.getTime() + 25 * 3_600_000)).toBe(false);
    expect(passRemaining(e, premium.id, now.getTime())).toBe(24 * 3_600_000);
  });

  it('counts videos per local day and resets the next day', () => {
    let e = NO_ENTITLEMENTS;
    expect(passesLeftToday(e, now)).toBe(AD_PASSES_PER_DAY);
    e = grantDayPass(e, premium.id, now);
    e = grantDayPass(e, premium.id, now);
    expect(passesLeftToday(e, now)).toBe(AD_PASSES_PER_DAY - 2);
    expect(passesLeftToday(e, new Date(2026, 9, 16, 9))).toBe(AD_PASSES_PER_DAY);
  });

  it('forgets expired passes', () => {
    const old = grantDayPass(NO_ENTITLEMENTS, 'a', new Date(2026, 0, 1));
    expect(Object.keys(grantDayPass(old, 'b', now).passes)).toEqual(['b']);
  });

  it('survives a corrupted store', () => {
    expect(parseEntitlements('{nope')).toEqual(NO_ENTITLEMENTS);
    expect(parseEntitlements(null)).toEqual(NO_ENTITLEMENTS);
    const round = grantDayPass({ ...NO_ENTITLEMENTS, plus: true, tips: 2 }, premium.id, now);
    expect(parseEntitlements(JSON.stringify(round))).toEqual(round);
  });
});

describe('passport', () => {
  it('inks a stamp on the first visit and adds calm time after', () => {
    let p = recordVisit({}, 'ebru', 90, 1000);
    p = recordVisit(p, 'ebru', 45, 5000);
    expect(p.ebru).toEqual({ since: 1000, visits: 2, seconds: 135 });
    expect(stampCount(p)).toBe(1);
    expect(totalMinutes(p)).toBe(2);
  });

  it('inks a stamp mid-visit without counting the visit twice', () => {
    let p = ink({}, 'candle', 500);
    expect(ink(p, 'candle', 900)).toBe(p);
    p = recordVisit(p, 'candle', 60, 1000);
    expect(p.candle).toEqual({ since: 500, visits: 1, seconds: 60 });
  });

  it('ignores peeks and caps a phone left open', () => {
    expect(recordVisit({}, 'bowl', 1, 0).bowl!.seconds).toBe(0);
    expect(recordVisit({}, 'bowl', 99_999, 0).bowl!.seconds).toBe(3600);
  });

  it('parses only well-formed stamps', () => {
    const p = recordVisit({}, 'rangoli', 30, 1);
    expect(parsePassport(JSON.stringify({ ...p, candle: { since: 'x' } }))).toEqual(p);
    expect(parsePassport('garbage')).toEqual({});
  });
});

describe('products and settings', () => {
  it('lists Plus and every tip once', () => {
    expect(ALL_SKUS[0]).toBe(PLUS_SKU);
    expect(new Set(ALL_SKUS).size).toBe(ALL_SKUS.length);
    expect(isTipSku(PLUS_SKU)).toBe(false);
    expect(isTipSku('quietatlas.tip.chai')).toBe(true);
  });

  it('settings fall back to defaults', () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('{"sound":false,"theme":"neon"}')).toMatchObject({
      sound: false,
      theme: 'system',
    });
  });
});
