import { decodePuzzle, NO_CLUE } from '@/domain/entities/Board';
import { isSolved } from '../engine/rules';
import { countSolutions, pairPatterns, solve, solveLogic } from '../engine/solver';
import { dailyLevel, dailySpec, dateOfDaily, DAILY_EPOCH, shareText, todayNumber } from './daily';
import {
  CHAPTER_COUNT,
  chapterLevels,
  difficultyOf,
  freshLevel,
  LEVEL_COUNT,
  levelFor,
  sample,
  specFor,
} from './levels';
import { SHIPPED } from './shipped';
import { SHOWCASE, TUTORIAL } from './tutorial';

const FIRST = Array.from({ length: 50 }, (_, i) => i + 1);
const LATER = sample(40, 51, LEVEL_COUNT, 2026);

describe('shipped levels', () => {
  it('has all 300, each a well-formed board of the planned size', () => {
    expect(SHIPPED).toHaveLength(LEVEL_COUNT);
    for (let n = 1; n <= LEVEL_COUNT; n++) {
      const { puzzle, tier } = decodePuzzle(SHIPPED[n - 1]!);
      const spec = specFor(n);
      expect(puzzle.rows).toBe(spec.rows);
      expect(puzzle.cols).toBe(spec.cols);
      expect(tier).toBeLessThanOrEqual(3);
    }
  });

  it.each(FIRST)('level %i has exactly one answer, and the solver finds it', (n) => {
    const { puzzle, tier } = levelFor(n);
    expect(countSolutions(puzzle, 2)).toBe(1);
    expect(solveLogic(puzzle, tier).solved).toBe(true);
    const answer = solve(puzzle);
    expect(answer && isSolved(puzzle, answer)).toBe(true);
  });

  it.each(LATER)('later level %i has exactly one answer, and the solver finds it', (n) => {
    const { puzzle, tier } = levelFor(n);
    expect(countSolutions(puzzle, 2)).toBe(1);
    expect(solveLogic(puzzle, tier).solved).toBe(true);
    const answer = solve(puzzle);
    expect(answer && isSolved(puzzle, answer)).toBe(true);
  });

  it('are exactly what their seeds build (no level changes by accident)', () => {
    for (const n of [...Array.from({ length: 24 }, (_, i) => i + 1), 41, 45, 61, 90]) {
      expect(freshLevel(n)).toBe(SHIPPED[n - 1]);
    }
  });

  it('start tiny and grow gently', () => {
    expect(levelFor(1).puzzle.rows).toBe(4);
    let side = 0;
    for (let c = 0; c < CHAPTER_COUNT; c++) {
      const sides = chapterLevels(c).map((n) => levelFor(n).puzzle.rows);
      expect(Math.min(...sides)).toBeGreaterThanOrEqual(side);
      side = Math.max(...sides);
    }
    expect(side).toBe(12);
    // Look-ahead boards wait until that idea is taught at level 41.
    for (let n = 1; n < 41; n++) expect(levelFor(n).tier).toBeLessThan(3);
    expect(levelFor(41).tier).toBe(3);
    expect(difficultyOf(levelFor(1))).toBe('gentle');
    expect(difficultyOf(levelFor(300))).toBe('deep');
  });

  it('first level keeps many numbers so it can be read at a glance', () => {
    const p = levelFor(1).puzzle;
    expect(p.clues.filter((c) => c !== NO_CLUE).length / p.clues.length).toBeGreaterThanOrEqual(
      0.6,
    );
  });

  it('teach each idea on its lesson level', () => {
    expect(levelFor(1).lesson).toBe('loop');
    expect(levelFor(2).puzzle.clues).toContain(0);
    const five = levelFor(5).puzzle;
    expect([0, 4, 20, 24].some((c) => five.clues[c] === 3)).toBe(true);
    expect(pairPatterns(levelFor(9).puzzle).some((x) => x.kind === 'adjacent3')).toBe(true);
    expect(levelFor(41).lesson).toBe('ahead');
  });
});

describe('tutorial and showcase boards', () => {
  it('have exactly one answer, found by simple ideas', () => {
    for (const level of [TUTORIAL, SHOWCASE]) {
      expect(countSolutions(level.puzzle, 2)).toBe(1);
      expect(solveLogic(level.puzzle, level.tier).solved).toBe(true);
    }
    expect(TUTORIAL.puzzle.rows).toBe(3);
    expect(TUTORIAL.tier).toBe(1);
  });
});

describe('daily kolam', () => {
  it('numbers days from the epoch, the same everywhere', () => {
    expect(todayNumber(DAILY_EPOCH)).toBe(1);
    expect(todayNumber(new Date(Date.UTC(2026, 9, 15, 20)))).toBe(15);
    expect(todayNumber(dateOfDaily(212))).toBe(212);
  });

  it('builds the same unique board for a day, every time', () => {
    for (const n of [1, 15, 212]) {
      const a = dailyLevel(n);
      const spec = dailySpec(n);
      expect(a.puzzle.rows).toBe(spec.rows);
      expect(countSolutions(a.puzzle, 2)).toBe(1);
      expect(solveLogic(a.puzzle, a.tier).solved).toBe(true);
      expect(a.id).toBe(`d${n}`);
    }
    expect(dailyLevel(16).puzzle.clues).not.toEqual(dailyLevel(15).puzzle.clues);
  });

  it('grows from Monday to the weekend', () => {
    const sizes = Array.from({ length: 7 }, (_, i) => dailySpec(100 + i).rows);
    expect(Math.min(...sizes)).toBe(6);
    expect(Math.max(...sizes)).toBe(8);
  });

  it('shares a spoiler-free line', () => {
    const words = {
      name: 'Kolam',
      noHints: 'no hints',
      hints: (n: number) => (n === 1 ? '1 hint' : `${n} hints`),
    };
    expect(shareText(212, '7×7', 190, 0, words)).toBe('Kolam #212 ✿ 7×7 · 3:10 · no hints');
    expect(shareText(5, '6×6', null, 2, words)).toBe('Kolam #5 ✿ 6×6 · 2 hints');
  });
});
