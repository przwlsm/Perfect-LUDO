import { HIDDEN, ingredientsOf, TALL_SIZE, type Level } from '@/domain/entities/Level';
import { SPICES } from '@/domain/entities/Ingredient';
import { generate } from '../engine/generator';
import { route } from '../engine/solver';
import { isServed, isSolved, positionOf, tryPour } from '../engine/state';
import { decodeLevel, encodeLevel } from './codec';
import { dailyLevel, dailySpec, shareText, todayNumber } from './daily';
import {
  CHAPTER_COUNT,
  CHAPTER_SIZE,
  chapterLevels,
  chapterOf,
  freshLevel,
  LESSONS,
  LEVEL_COUNT,
  levelFor,
  levelSeed,
  specFor,
} from './levels';
import { SHIPPED } from './shipped';

/** Solves with the solver and replays its route with the game's own rules. */
function solvesTo(level: Level, budget = 60_000): number {
  const start = positionOf(level);
  const r = route(start, budget);
  if (r.status !== 'solved') throw new Error(`level ${level.id}: ${r.status}`);
  let p = start;
  for (const step of r.path) {
    const next = tryPour(p, step.from, step.to);
    if (!next) throw new Error(`level ${level.id}: illegal pour in route`);
    p = next.pos;
  }
  if (!isSolved(p)) throw new Error(`level ${level.id}: route does not sort`);
  return r.path.length;
}

const all = Array.from({ length: LEVEL_COUNT }, (_, i) => levelFor(i + 1));

describe('shipped levels', () => {
  it('ships every level, numbered in order', () => {
    expect(SHIPPED).toHaveLength(LEVEL_COUNT);
    all.forEach((l, i) => expect(l.id).toBe(String(i + 1)));
    expect(CHAPTER_COUNT * CHAPTER_SIZE).toBe(LEVEL_COUNT);
    expect(chapterLevels(19)).toHaveLength(CHAPTER_SIZE);
    expect(chapterOf(1)).toBe(0);
    expect(chapterOf(300)).toBe(19);
  });

  it('every level is a fair counter: four of each ingredient, nothing served, nothing hidden on top', () => {
    for (const l of all) {
      const counts = new Map<number, number>();
      for (const c of l.cups) {
        expect(c.layers.length).toBeLessThanOrEqual(c.cap);
        expect(isServed(c.layers)).toBe(false);
        const top = c.layers[c.layers.length - 1];
        if (top !== undefined) expect(top & HIDDEN).toBe(0);
        for (const layer of c.layers) counts.set(layer & 31, (counts.get(layer & 31) ?? 0) + 1);
      }
      expect([...counts.values()].every((n) => n === 4)).toBe(true);
      expect(l.cups.some((c) => c.layers.length === 0)).toBe(true);
      expect(l.par).toBeGreaterThan(l.best);
      expect(l.best).toBeGreaterThan(0);
    }
  });

  it('the solver sorts every one of the first 50, in its stated best number of pours or fewer', () => {
    for (const l of all.slice(0, 50)) expect(solvesTo(l)).toBeLessThanOrEqual(l.best);
  });

  it('the solver sorts a sample of the rest (every seventh level, and the last)', () => {
    for (let n = 51; n <= LEVEL_COUNT; n += 7) solvesTo(all[n - 1]!);
    solvesTo(all[LEVEL_COUNT - 1]!);
  });

  it('introduces each idea once, in order, on the level that teaches it', () => {
    const levels = LESSONS.map((l) => l.level);
    expect([...levels].sort((a, b) => a - b)).toEqual(levels);
    for (const { level, lesson } of LESSONS) expect(levelFor(level).lesson).toBe(lesson);
    const has = {
      froth: (l: Level) => l.cups.some((c) => c.layers.some((x) => x & HIDDEN)),
      lid: (l: Level) => l.cups.some((c) => c.lid > 0),
      tall: (l: Level) => l.cups.some((c) => c.cap === TALL_SIZE),
      spice: (l: Level) => ingredientsOf(l).some((i) => SPICES.includes(i)),
      oneSpare: (l: Level) => l.cups.filter((c) => c.layers.length === 0).length === 1,
    };
    for (const [idea, test] of Object.entries(has)) {
      const first = all.findIndex(test) + 1;
      const taught = LESSONS.find((l) => l.lesson === idea)!.level;
      // Level 1 is one spare cup by hand, before the idea is named.
      if (idea !== 'oneSpare') expect({ idea, first }).toEqual({ idea, first: taught });
      expect(test(levelFor(taught))).toBe(true);
    }
  });

  it('grows gently: more ingredients and longer routes later on', () => {
    const avg = (from: number, to: number, f: (l: Level) => number) =>
      all.slice(from - 1, to).reduce((s, l) => s + f(l), 0) / (to - from + 1);
    const kinds = (l: Level) => ingredientsOf(l).length;
    const best = (l: Level) => l.best;
    expect(avg(1, 15, kinds)).toBeLessThan(avg(91, 105, kinds));
    expect(avg(91, 105, kinds)).toBeLessThan(avg(271, 300, kinds));
    expect(avg(1, 15, best)).toBeLessThan(avg(151, 180, best));
    expect(avg(151, 180, best)).toBeLessThan(avg(271, 300, best));
    // Gentle: a level is never more than a few pours longer than the one before.
    for (let i = 1; i < all.length; i++) expect(all[i]!.best - all[i - 1]!.best).toBeLessThan(8);
  });

  it('matches what the seeds build (all of the first 50 and a sample after)', () => {
    const sample = [
      ...Array.from({ length: 50 }, (_, i) => i + 1),
      ...Array.from({ length: 10 }, (_, i) => 60 + i * 24),
    ];
    for (const n of sample) expect(encodeLevel(freshLevel(n))).toBe(SHIPPED[n - 1]);
  });

  it('round-trips through the codec', () => {
    for (const n of [1, 16, 46, 61, 76, 200, 300]) {
      expect(decodeLevel(encodeLevel(levelFor(n)))).toEqual(levelFor(n));
    }
  });
});

describe('generator over the curve', () => {
  it('builds the same level from the same seed', () => {
    for (const n of [12, 47, 133]) {
      const a = generate(specFor(n), levelSeed(n), 'x');
      const b = generate(specFor(n), levelSeed(n), 'x');
      expect(a && encodeLevel(a.level)).toBe(b && encodeLevel(b.level));
    }
  });
});

describe('daily puzzle', () => {
  it('is the same counter for everyone on a day, and new each day', () => {
    const a = encodeLevel(dailyLevel(212));
    expect(encodeLevel(dailyLevel(212))).toBe(a);
    expect(encodeLevel(dailyLevel(213))).not.toBe(a);
  });

  it('numbers days from the epoch', () => {
    expect(todayNumber(new Date(Date.UTC(2026, 9, 1, 8)))).toBe(1);
    expect(todayNumber(new Date(Date.UTC(2026, 9, 16, 23)))).toBe(16);
  });

  it('builds a solvable counter every day of a month, quickly enough for a phone', () => {
    const started = Date.now();
    for (let n = 1; n <= 30; n++) solvesTo(dailyLevel(n));
    // Jest's transpiled code is slower than an app bundle; this is a loose ceiling.
    expect((Date.now() - started) / 30).toBeLessThan(1500);
  });

  it('gets busier through the week', () => {
    const monday = dailySpec(5); // 2026-10-05 was a Monday
    const sunday = dailySpec(11);
    expect(sunday.ingredients + sunday.spices).toBeGreaterThan(monday.ingredients + monday.spices);
  });

  it('shares a result with no spoilers', () => {
    const words = {
      name: 'Chai Sort',
      pours: (n: number) => `in ${n} pours`,
      noHints: 'no hints',
      hints: (n: number) => (n === 1 ? '1 hint' : `${n} hints`),
    };
    expect(shareText(212, 24, 0, words)).toBe('Chai Sort #212 ☕ in 24 pours · no hints');
    expect(shareText(3, 30, 2, words)).toBe('Chai Sort #3 ☕ in 30 pours · 2 hints');
  });
});
