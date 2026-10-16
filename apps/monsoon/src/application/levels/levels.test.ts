import { fieldCount, isFixed, turnsToSolve, type Level } from '@/domain/entities/Board';
import { flow } from '../engine/flow';
import { generate } from '../engine/generator';
import { solve } from '../engine/solver';
import { decodeLevel, encodeLevel } from './codec';
import { clock, dailyLevel, dailySpec, shareText, todayNumber, weekdayOf } from './daily';
import { HANDMADE, parseBoard } from './handmade';
import {
  freshLevel,
  LESSONS,
  LEVEL_COUNT,
  levelFor,
  levelSeed,
  sizeFor,
  specFor,
  UNIQUE_UP_TO,
} from './levels';
import { SHIPPED } from './shipped';

const startsSolved = (l: Level) => flow(l, l.start).solved;
const answerWorks = (l: Level) =>
  flow(
    l,
    l.tiles.map(() => 0),
  ).solved;
const kinds = (l: Level, k: Level['tiles'][number]['kind']) =>
  l.tiles.filter((t) => t.kind === k).length;

describe('hand-made levels', () => {
  it.each(Object.keys(HANDMADE).map(Number))('level %i is a gentle, unique first step', (n) => {
    const hand = HANDMADE[n]!;
    const l = parseBoard(String(n), hand.rows, hand.lesson);
    expect(startsSolved(l)).toBe(false);
    expect(answerWorks(l)).toBe(true);
    expect(solve(l).solutions).toHaveLength(1);
    expect(turnsToSolve(l)).toBeLessThanOrEqual(6);
  });
});

describe('lessons', () => {
  it('introduces each idea once, in order, about every fifteen levels', () => {
    const at = LESSONS.map((l) => l.level);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    expect(new Set(LESSONS.map((l) => l.lesson)).size).toBe(LESSONS.length);
    for (let i = 3; i < at.length; i++) expect(at[i]! - at[i - 1]!).toBe(15);
    for (const { level, lesson } of LESSONS) expect(levelFor(level).lesson).toBe(lesson);
  });

  it('each lesson level shows its idea, and nothing appears before it is taught', () => {
    expect(kinds(levelFor(46), 'bridge')).toBeGreaterThan(0);
    expect(kinds(levelFor(61), 'dam')).toBeGreaterThan(0);
    expect(kinds(levelFor(76), 'source')).toBe(2);
    expect(levelFor(31).tiles.some(isFixed)).toBe(true);
    expect(levelFor(16).budget).not.toBeNull();
    for (let n = 1; n < 16; n++) expect(levelFor(n).budget).toBeNull();
    for (let n = 1; n < 31; n++) expect(levelFor(n).tiles.some(isFixed)).toBe(false);
    for (let n = 1; n < 46; n++) expect(kinds(levelFor(n), 'bridge')).toBe(0);
    for (let n = 1; n < 61; n++) expect(kinds(levelFor(n), 'dam')).toBe(0);
    for (let n = 1; n < 76; n++) expect(kinds(levelFor(n), 'source')).toBe(1);
  });
});

describe('shipped levels', () => {
  const all = Array.from({ length: LEVEL_COUNT }, (_, i) => levelFor(i + 1));

  it('ships every level', () => {
    expect(SHIPPED).toHaveLength(LEVEL_COUNT);
    all.forEach((l, i) => expect(l.id).toBe(String(i + 1)));
  });

  it('every level starts unsolved and is solved at its own orientation', () => {
    for (const l of all) {
      expect(startsSolved(l)).toBe(false);
      expect(answerWorks(l)).toBe(true);
      expect(fieldCount(l)).toBeGreaterThan(0);
    }
  });

  it('the solver solves the first 50 and a sample after, from the start position', () => {
    const sample = [
      ...Array.from({ length: 50 }, (_, i) => i + 1),
      ...Array.from({ length: 25 }, (_, i) => 55 + i * 10),
    ];
    for (const n of sample) {
      const r = solve(all[n - 1]!);
      expect({ n, solved: r.solutions.length > 0 }).toEqual({ n, solved: true });
      expect(flow(all[n - 1]!, r.solutions[0]!).solved).toBe(true);
    }
  });

  it(`levels 1–${UNIQUE_UP_TO} each have exactly one answer`, () => {
    const notUnique: number[] = [];
    for (let n = 1; n <= UNIQUE_UP_TO; n++) {
      const r = solve(all[n - 1]!, { limit: 2 });
      if (!(r.complete && r.solutions.length === 1)) notUnique.push(n);
    }
    expect(notUnique).toEqual([]);
  });

  it('grows from 4×4 to 9×12 along a gentle curve', () => {
    expect(sizeFor(1)).toEqual([4, 4]);
    expect(sizeFor(300)).toEqual([9, 12]);
    for (let n = 2; n <= LEVEL_COUNT; n++) {
      const [w0, h0] = sizeFor(n - 1);
      const [w1, h1] = sizeFor(n);
      // Never a big jump from one level to the next.
      expect(w1 * h1 - w0 * h0).toBeLessThanOrEqual(12);
    }
    const area = (l: Level) => l.w * l.h;
    const work = (l: Level) => turnsToSolve(l);
    const avg = (from: number, to: number, f: (l: Level) => number) =>
      all.slice(from - 1, to).reduce((s, l) => s + f(l), 0) / (to - from + 1);
    expect(avg(1, 20, area)).toBeLessThan(avg(101, 120, area));
    expect(avg(101, 120, area)).toBeLessThan(avg(281, 300, area));
    expect(avg(1, 20, work)).toBeLessThan(avg(101, 120, work));
    expect(avg(101, 120, work)).toBeLessThan(avg(281, 300, work));
  });

  it('matches what the seeds build (all of the first 50 and a sample after)', () => {
    const sample = [
      ...Array.from({ length: 50 }, (_, i) => i + 1),
      ...Array.from({ length: 10 }, (_, i) => 60 + i * 24),
    ];
    for (const n of sample) expect(encodeLevel(freshLevel(n))).toBe(SHIPPED[n - 1]);
  });

  it('the cloud budget always leaves room beyond the fewest turns', () => {
    for (const l of all) {
      if (l.budget === null) continue;
      expect(l.budget).toBeGreaterThanOrEqual(turnsToSolve(l) + 2);
    }
  });
});

describe('generator for levels', () => {
  it('builds the same level from the same seed', () => {
    for (const n of [12, 47, 133]) {
      const a = generate(specFor(n), levelSeed(n), 'x');
      const b = generate(specFor(n), levelSeed(n), 'x');
      expect(a && encodeLevel(a.level)).toBe(b && encodeLevel(b.level));
    }
  });
});

describe('codec', () => {
  it('round-trips every kind of tile', () => {
    for (const n of [1, 46, 61, 76, 200, 300]) {
      const l = levelFor(n);
      expect(decodeLevel(encodeLevel(l))).toEqual(l);
    }
  });
});

describe('daily puzzle', () => {
  it('is the same board for everyone on a day, and new each day', () => {
    const a = encodeLevel(dailyLevel(212));
    expect(encodeLevel(dailyLevel(212))).toBe(a);
    expect(encodeLevel(dailyLevel(213))).not.toBe(a);
  });

  it('numbers days from the epoch', () => {
    expect(todayNumber(new Date(Date.UTC(2026, 9, 1, 8)))).toBe(1);
    expect(todayNumber(new Date(Date.UTC(2026, 9, 15, 23)))).toBe(15);
    expect(weekdayOf(5)).toBe(0); // 2026-10-05 was a Monday
  });

  it('builds a solvable, unique board every day of a month, quickly enough for a phone', () => {
    const started = Date.now();
    for (let n = 1; n <= 30; n++) {
      const l = dailyLevel(n);
      expect(answerWorks(l)).toBe(true);
      expect(startsSolved(l)).toBe(false);
      expect(solve(l).solutions).toHaveLength(1);
      expect(l.budget).not.toBeNull();
    }
    // Jest's transpiled code is slower than an app bundle; this is a loose ceiling.
    expect((Date.now() - started) / 30).toBeLessThan(800);
  });

  it('gets bigger through the week', () => {
    const monday = dailySpec(5);
    const sunday = dailySpec(11);
    expect(sunday.w * sunday.h).toBeGreaterThan(monday.w * monday.h);
  });

  it('shares a result with no spoilers', () => {
    const words = {
      name: 'Monsoon',
      turns: (n: number) => `${n} turns`,
      noHints: 'no hints',
      hints: (n: number) => (n === 1 ? '1 hint' : `${n} hints`),
    };
    expect(shareText(212, { paddies: 3, ponds: 0 }, 38, 0, words)).toBe(
      'Monsoon #212 🌧️🌾🌾🌾 · 38 turns · no hints',
    );
    expect(shareText(3, { paddies: 1, ponds: 2 }, 50, 2, words)).toBe(
      'Monsoon #3 🌧️🌾🪷🪷 · 50 turns · 2 hints',
    );
    expect(clock(84)).toBe('1:24');
  });
});
