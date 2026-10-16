import { lampCount, type Level } from '@/domain/entities/Board';
import { arrangementOf, compile } from '../engine/grid';
import { generate } from '../engine/generator';
import { solve } from '../engine/solver';
import { solved, trace } from '../engine/trace';
import { decodeLevel, encodeLevel } from './codec';
import { clock, dailyLevel, dailySpec, shareText, todayNumber } from './daily';
import { HANDMADE, parseBoard } from './handmade';
import { freshLevel, LESSONS, LEVEL_COUNT, levelFor, levelSeed, specFor } from './levels';
import { SHIPPED } from './shipped';

const startsSolved = (l: Level) => {
  const g = compile(l);
  return solved(g, trace(g));
};
const answerWorks = (l: Level) => {
  const g = compile(l, arrangementOf(l, l.solution));
  return solved(g, trace(g));
};

describe('hand-made lessons', () => {
  it.each(Object.keys(HANDMADE).map(Number))('level %i teaches on a solvable board', (n) => {
    const hand = HANDMADE[n]!;
    const l = parseBoard(String(n), hand.rows, hand.lesson);
    expect(startsSolved(l)).toBe(false);
    expect(answerWorks(l)).toBe(true);
    expect(solve(l).solutions.length).toBe(1);
  });

  it('introduces each idea once, in order', () => {
    const levels = LESSONS.map((l) => l.level);
    expect([...levels].sort((a, b) => a - b)).toEqual(levels);
    expect(new Set(LESSONS.map((l) => l.lesson)).size).toBe(LESSONS.length);
    for (const { level, lesson } of LESSONS) expect(levelFor(level).lesson).toBe(lesson);
  });
});

describe('shipped levels', () => {
  const all = Array.from({ length: LEVEL_COUNT }, (_, i) => levelFor(i + 1));

  it('ships every level', () => {
    expect(SHIPPED).toHaveLength(LEVEL_COUNT);
    all.forEach((l, i) => expect(l.id).toBe(String(i + 1)));
  });

  it('every level starts unlit, and its own answer lights it', () => {
    for (const l of all) {
      expect(startsSolved(l)).toBe(false);
      expect(answerWorks(l)).toBe(true);
      expect(lampCount(l)).toBeGreaterThan(0);
    }
  });

  it('the solver solves every shipped level', () => {
    for (const l of all) {
      const r = solve(l);
      expect({ id: l.id, solved: r.solutions.length }).toEqual({ id: l.id, solved: 1 });
    }
  });

  it('grows: bigger boards and more pieces later on', () => {
    const size = (l: Level) => l.w * l.h;
    const work = (l: Level) => l.tray.length + l.solution.length;
    const avg = (from: number, to: number, f: (l: Level) => number) =>
      all.slice(from - 1, to).reduce((s, l) => s + f(l), 0) / (to - from + 1);
    expect(avg(1, 20, size)).toBeLessThan(avg(101, 120, size));
    expect(avg(101, 120, size)).toBeLessThanOrEqual(avg(281, 300, size));
    expect(avg(1, 20, work)).toBeLessThan(avg(281, 300, work));
  });

  it('matches what the seeds build (all of the first 50 and a sample after)', () => {
    const sample = [
      ...Array.from({ length: 50 }, (_, i) => i + 1),
      ...Array.from({ length: 10 }, (_, i) => 60 + i * 24),
    ];
    for (const n of sample) expect(encodeLevel(freshLevel(n))).toBe(SHIPPED[n - 1]);
  });
});

describe('generator', () => {
  it('builds the same level from the same seed', () => {
    for (const n of [12, 47, 133]) {
      const a = generate(specFor(n), levelSeed(n), 'x');
      const b = generate(specFor(n), levelSeed(n), 'x');
      expect(a && encodeLevel(a.level)).toBe(b && encodeLevel(b.level));
    }
  });

  it('builds different levels from different seeds', () => {
    const spec = specFor(120);
    const a = generate(spec, 1, 'x')!;
    const b = generate(spec, 2, 'x')!;
    expect(encodeLevel(a.level)).not.toBe(encodeLevel(b.level));
  });

  it('every built piece matters: lifting any one leaves a lamp wrong', () => {
    for (const n of [25, 77, 150, 260]) {
      const l = levelFor(n);
      for (const p of l.solution) {
        const rest = l.solution.filter((q) => q !== p);
        const tile = l.tiles[p.at];
        if (tile?.kind === 'piece') continue; // a pivot cannot be lifted, only turned
        const g = compile(l, arrangementOf(l, rest));
        expect(solved(g, trace(g))).toBe(false);
      }
    }
  });
});

describe('codec', () => {
  it('round-trips every kind of tile', () => {
    for (const n of [1, 51, 61, 71, 81, 200]) {
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
  });

  it('builds a solvable board every day of a month, quickly enough for a phone', () => {
    const started = Date.now();
    for (let n = 1; n <= 30; n++) {
      const l = dailyLevel(n);
      expect(answerWorks(l)).toBe(true);
      expect(startsSolved(l)).toBe(false);
      expect(solve(l).solutions.length).toBe(1);
    }
    // Jest's transpiled code is slower than an app bundle; this is a loose ceiling.
    expect((Date.now() - started) / 30).toBeLessThan(1500);
  });

  it('gets harder through the week', () => {
    const monday = dailySpec(5); // 2026-10-05 was a Monday
    const sunday = dailySpec(11);
    expect(sunday.difficulty).toBeGreaterThan(monday.difficulty);
  });

  it('shares a result with no spoilers', () => {
    const words = {
      name: 'Diya',
      noHints: 'no hints',
      hints: (n: number) => (n === 1 ? '1 hint' : `${n} hints`),
    };
    expect(shareText(212, 4, 84, 0, words)).toBe('Diya #212 🪔🪔🪔🪔 · 1:24 · no hints');
    expect(shareText(3, 2, null, 2, words)).toBe('Diya #3 🪔🪔 · 2 hints');
    expect(clock(5)).toBe('0:05');
    expect(clock(3725)).toBe('62:05');
  });
});
