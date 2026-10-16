import {
  adsLeftToday,
  contrast,
  dailySeed,
  dailyStreak,
  DEFAULT_ADS_PER_DAY,
  grantDayPass,
  grantHint,
  highestOpen,
  isLight,
  isOpen,
  isTipSku,
  mix,
  NO_ENTITLEMENTS,
  NO_PROGRESS,
  OPEN_AHEAD,
  parseEntitlements,
  parseProgress,
  priceOf,
  random,
  recordDaily,
  recordLevel,
  spendHint,
  tipProducts,
  totalStars,
  withAlpha,
} from './index';

const noon = new Date(2026, 9, 15, 12);

describe('entitlements', () => {
  const premium = { id: 'look.gold', premium: true };
  const free = { id: 'look.plain', premium: false };

  it('opens free items always and premium ones with Plus or a pass', () => {
    expect(isOpen(NO_ENTITLEMENTS, free, noon.getTime())).toBe(true);
    expect(isOpen(NO_ENTITLEMENTS, premium, noon.getTime())).toBe(false);
    expect(isOpen({ ...NO_ENTITLEMENTS, plus: true }, premium, noon.getTime())).toBe(true);
    const e = grantDayPass(NO_ENTITLEMENTS, premium.id, noon);
    expect(isOpen(e, premium, noon.getTime() + 23 * 3_600_000)).toBe(true);
    expect(isOpen(e, premium, noon.getTime() + 25 * 3_600_000)).toBe(false);
  });

  it('counts videos per local day across passes and hints', () => {
    let e = grantDayPass(NO_ENTITLEMENTS, 'a', noon);
    e = grantHint(e, noon);
    expect(adsLeftToday(e, noon)).toBe(DEFAULT_ADS_PER_DAY - 2);
    expect(adsLeftToday(e, new Date(2026, 9, 16, 8))).toBe(DEFAULT_ADS_PER_DAY);
  });

  it('spends hints, and Plus never runs out', () => {
    expect(spendHint(NO_ENTITLEMENTS)).toBeNull();
    const one = grantHint(NO_ENTITLEMENTS, noon);
    expect(spendHint(one)?.hints).toBe(0);
    const plus = { ...NO_ENTITLEMENTS, plus: true };
    expect(spendHint(plus)).toBe(plus);
  });

  it('round-trips and survives corruption', () => {
    const e = grantHint(grantDayPass({ ...NO_ENTITLEMENTS, tips: 3 }, 'x', noon), noon, 2);
    expect(parseEntitlements(JSON.stringify(e))).toEqual(e);
    expect(parseEntitlements('{bad')).toEqual(NO_ENTITLEMENTS);
    expect(parseEntitlements(null)).toEqual(NO_ENTITLEMENTS);
  });
});

describe('products', () => {
  it('names tips under the app prefix', () => {
    const tips = tipProducts('diya');
    expect(tips.map((t) => t.sku)).toContain('diya.tip.chai');
    expect(tips.every((t) => isTipSku(t.sku))).toBe(true);
    expect(isTipSku('diya.plus')).toBe(false);
    expect(priceOf([{ sku: 'diya.plus', price: '₹249' }], 'diya.plus')).toBe('₹249');
  });
});

describe('progress', () => {
  it('keeps the best stars and opens a few levels ahead', () => {
    let p = recordLevel(NO_PROGRESS, 1, 3);
    p = recordLevel(p, 1, 1);
    p = recordLevel(p, 2, 2);
    expect(p.stars).toEqual({ 1: 3, 2: 2 });
    expect(totalStars(p)).toBe(5);
    expect(highestOpen(p)).toBe(2 + OPEN_AHEAD);
    expect(highestOpen(NO_PROGRESS)).toBe(OPEN_AHEAD);
  });

  it('counts a daily streak ending today or yesterday', () => {
    let p = NO_PROGRESS;
    for (const d of [12, 13, 14]) p = recordDaily(p, new Date(2026, 9, d, 9));
    expect(dailyStreak(p, noon)).toBe(3);
    p = recordDaily(p, noon);
    expect(dailyStreak(p, noon)).toBe(4);
    expect(dailyStreak(p, new Date(2026, 9, 18))).toBe(0);
  });

  it('gives everyone the same daily seed for a date, and different ones for other dates', () => {
    const a = new Date(Date.UTC(2026, 9, 15, 3));
    const b = new Date(Date.UTC(2026, 9, 15, 22));
    expect(dailySeed(a)).toBe(dailySeed(b));
    expect(dailySeed(a)).not.toBe(dailySeed(new Date(Date.UTC(2026, 9, 16, 3))));
    expect(dailySeed(a, 1)).not.toBe(dailySeed(a, 2));
  });

  it('parses only valid progress', () => {
    const p = recordDaily(recordLevel(NO_PROGRESS, 4, 2), noon);
    expect(parseProgress(JSON.stringify(p))).toEqual(p);
    expect(parseProgress('{"stars":{"0":3,"x":2,"5":9}}')).toEqual({ stars: { 5: 3 }, dailies: [] });
  });
});

describe('colour and random', () => {
  it('mixes and fades colours', () => {
    expect(mix('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(withAlpha('#ff0000', 0.5)).toBe('rgba(255, 0, 0, 0.5)');
  });

  it('measures contrast like WCAG', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 0);
    expect(isLight('#f8f2e7')).toBe(true);
    expect(isLight('#0d0f22')).toBe(false);
  });

  it('repeats a seeded sequence', () => {
    const a = random(9);
    const b = random(9);
    for (let i = 0; i < 5; i++) expect(a()).toBe(b());
  });
});
