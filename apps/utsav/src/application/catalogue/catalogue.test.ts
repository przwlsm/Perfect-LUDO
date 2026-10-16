import { contrast } from 'app-kit';
import { OCCASION_IDS } from '@/domain/entities/Occasion';
import { PALETTES } from './palettes';
import {
  heroTemplate,
  occasionsInOrder,
  popularNow,
  templateById,
  TEMPLATES,
  templatesFor,
} from './templates';

describe('templates', () => {
  it('have unique ids that resolve', () => {
    const ids = TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(templateById(id)?.id).toBe(id);
    expect(templateById('nope')).toBeUndefined();
  });

  it.each(OCCASION_IDS)('%s has at least three free designs and something premium', (id) => {
    const list = templatesFor(id);
    expect(list.filter((t) => !t.premium).length).toBeGreaterThanOrEqual(3);
    expect(list.some((t) => t.premium)).toBe(true);
    expect(heroTemplate(id).premium).toBe(false);
    expect(heroTemplate(id).occasion).toBe(id);
  });

  it('every template has at least one palette, and no palette repeats within one', () => {
    for (const t of TEMPLATES) {
      expect(t.palettes.length).toBeGreaterThanOrEqual(1);
      expect(new Set(t.palettes.map((p) => p.id)).size).toBe(t.palettes.length);
    }
  });
});

describe('palettes', () => {
  it.each(Object.values(PALETTES).map((p) => [p.id, p] as const))(
    '%s keeps its words readable on both background stops',
    (_id, p) => {
      for (const bg of p.bg) {
        expect(contrast(p.text, bg)).toBeGreaterThanOrEqual(4.5);
        expect(contrast(p.ink, bg)).toBeGreaterThanOrEqual(3);
      }
    },
  );

  it('are all #rrggbb and know whether they are dark', () => {
    for (const p of Object.values(PALETTES)) {
      for (const c of [...p.bg, p.ink, p.text, p.gold, p.accent, p.accent2, p.accent3, p.glow]) {
        expect(c).toMatch(/^#[0-9a-f]{6}$/i);
      }
      // A dark palette has light words, a light one dark words.
      expect(contrast(p.text, '#000000') > contrast(p.text, '#ffffff')).toBe(p.dark);
    }
  });
});

describe('popular now', () => {
  it('names five distinct occasions every month', () => {
    for (let m = 0; m < 12; m++) {
      const list = popularNow(new Date(2026, m, 15));
      expect(list).toHaveLength(5);
      expect(new Set(list).size).toBe(5);
      for (const id of list) expect(OCCASION_IDS).toContain(id);
    }
  });

  it('keeps everyday favourites in the row all year', () => {
    for (let m = 0; m < 12; m++) {
      const list = popularNow(new Date(2026, m, 1));
      expect(list.includes('goodMorning') || list.includes('birthday')).toBe(true);
    }
  });

  it('orders every occasion exactly once, popular first', () => {
    const now = new Date(2026, 9, 15);
    const order = occasionsInOrder(now);
    expect([...order].sort()).toEqual([...OCCASION_IDS].sort());
    expect(order.slice(0, 5)).toEqual(popularNow(now));
    expect(order[0]).toBe('diwali');
  });
});
