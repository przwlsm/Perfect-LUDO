import { contrast } from 'app-kit';
import { DABBERS, TICKET_THEMES, dabberById, themeById } from './Look';
import { normalizePrizes } from './Prize';
import { ALL_SKUS, PLUS_SKU, TIP_PRODUCTS } from './Products';
import { DEFAULT_SETTINGS, clampCallSeconds, parseSettings } from './Settings';
import { columnOf, columnRange } from './Ticket';

describe('Ticket helpers', () => {
  it('maps numbers to columns', () => {
    expect(columnOf(1)).toBe(0);
    expect(columnOf(9)).toBe(0);
    expect(columnOf(10)).toBe(1);
    expect(columnOf(79)).toBe(7);
    expect(columnOf(80)).toBe(8);
    expect(columnOf(90)).toBe(8);
    expect(columnRange(0)).toEqual([1, 9]);
    expect(columnRange(4)).toEqual([40, 49]);
    expect(columnRange(8)).toEqual([80, 90]);
  });
});

describe('Prizes', () => {
  it('always keeps Full House and play order', () => {
    expect(normalizePrizes([])).toEqual(['full']);
    expect(normalizePrizes(['full', 'top', 'early5', 'top', 'nope'])).toEqual([
      'early5',
      'top',
      'full',
    ]);
  });
});

describe('Settings', () => {
  it('falls back to defaults for junk', () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('nope')).toEqual(DEFAULT_SETTINGS);
  });
  it('keeps valid choices and clamps the call speed', () => {
    const s = parseSettings(
      JSON.stringify({ theme: 'night', voiceLanguage: 'hi', callSeconds: 99, missedHelper: true }),
    );
    expect(s.theme).toBe('night');
    expect(s.voiceLanguage).toBe('hi');
    expect(s.callSeconds).toBe(10);
    expect(s.missedHelper).toBe(true);
    expect(clampCallSeconds(1)).toBe(3);
    expect(clampCallSeconds(Number.NaN)).toBe(DEFAULT_SETTINGS.callSeconds);
  });
  it('keeps the missed-number helper off by default', () => {
    expect(DEFAULT_SETTINGS.missedHelper).toBe(false);
  });
});

describe('Looks', () => {
  it('keeps every ticket number highly legible', () => {
    for (const t of TICKET_THEMES) {
      expect(contrast(t.ink, t.cell)).toBeGreaterThanOrEqual(7);
      expect(contrast(t.headerInk, t.header)).toBeGreaterThanOrEqual(4.5);
    }
  });
  it('keeps numbers readable on every dab', () => {
    for (const d of DABBERS) {
      if (d.shape === 'ring') continue;
      expect(contrast(d.onColor, d.color)).toBeGreaterThanOrEqual(4.5);
    }
  });
  it('has free choices for everyone', () => {
    expect(TICKET_THEMES.filter((t) => !t.premium).length).toBeGreaterThanOrEqual(2);
    expect(DABBERS.filter((d) => !d.premium).length).toBeGreaterThanOrEqual(2);
    expect(themeById('nope').id).toBe('classic');
    expect(dabberById(undefined).id).toBe('marigold');
  });
});

describe('Products', () => {
  it('uses the tambola prefix', () => {
    expect(PLUS_SKU).toBe('tambola.plus');
    expect(TIP_PRODUCTS.every((t) => t.sku.startsWith('tambola.tip.'))).toBe(true);
    expect(ALL_SKUS).toContain(PLUS_SKU);
  });
});
