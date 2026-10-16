import { random } from 'app-kit';
import {
  decodePuzzle,
  encodePuzzle,
  type Lesson,
  type Level,
  type Puzzle,
  type Tier,
} from '@/domain/entities/Board';
import { generate, type GenSpec } from '../engine/generator';
import { pairPatterns } from '../engine/solver';
import { SHIPPED } from './shipped';

export const LEVEL_COUNT = 300;
export const CHAPTER_SIZE = 20;
export const CHAPTER_COUNT = LEVEL_COUNT / CHAPTER_SIZE;

/** Where each idea is first taught, with a one-line lesson shown on that level. */
export const LESSONS: readonly { readonly level: number; readonly lesson: Lesson }[] = [
  { level: 1, lesson: 'loop' },
  { level: 2, lesson: 'zero' },
  { level: 3, lesson: 'cross' },
  { level: 4, lesson: 'dots' },
  { level: 5, lesson: 'corner' },
  { level: 6, lesson: 'closing' },
  { level: 9, lesson: 'threes' },
  { level: 41, lesson: 'ahead' },
];

export function lessonAt(n: number): Lesson | undefined {
  return LESSONS.find((l) => l.level === n)?.lesson;
}

/** The seed of level `n`: fixed forever, so a level is the same board on every phone. */
export function levelSeed(n: number): number {
  let h = (n * 2654435761 + 0x7f4a7c15) >>> 0;
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d) >>> 0;
  h ^= h >>> 12;
  return h >>> 0;
}

export function chapterOf(n: number): number {
  return Math.floor((n - 1) / CHAPTER_SIZE);
}

/** Levels 1–20 are chapter 0, and so on. */
export function chapterLevels(chapter: number): number[] {
  return Array.from({ length: CHAPTER_SIZE }, (_, i) => chapter * CHAPTER_SIZE + i + 1);
}

/** Board side by chapter: 5×5 first, growing to 12×12 for the last chapters. */
const SIDES = [5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 10, 12, 12] as const;

/**
 * The difficulty curve. The first levels are tiny and keep many numbers;
 * each teaches one idea (see LESSONS). After that, every chapter starts on
 * counting and pattern boards and moves to boards that need looking ahead,
 * and boards grow every two chapters.
 */
export function specFor(n: number): GenSpec & { readonly lesson?: Lesson } {
  const lesson = lessonAt(n);
  const k = (n - 1) % CHAPTER_SIZE;
  if (n <= 2) return { rows: 4, cols: 4, tier: 1, keep: n === 1 ? 0.6 : 0.45, lesson };
  if (n <= 8)
    return { rows: 5, cols: 5, tier: n === 5 ? 2 : 1, keep: 0.42 - (n - 3) * 0.03, lesson };
  if (n <= 20)
    return { rows: 5, cols: 5, tier: 2, keep: n < 12 ? 0.3 : k >= 15 ? 0 : 0.15, lesson };
  const chapter = chapterOf(n);
  const side = SIDES[chapter] ?? 12;
  // The second chapter at each size leans harder than the first.
  // The last three chapters are the deepest of all.
  const lookAheadFrom = chapter === 1 ? 20 : chapter >= 12 ? 3 : chapter % 2 === 0 ? 10 : 4;
  const tier: Tier = n === 41 || k >= lookAheadFrom ? 3 : 2;
  const keep = k < 3 ? 0.2 : 0;
  return { rows: side, cols: side, tier, keep, lesson };
}

/** Lesson levels must actually show their idea; seeds are tried in turn until one does. */
function showsLesson(lesson: Lesson | undefined, p: Puzzle, tier: Tier): boolean {
  if (lesson === 'zero') return p.clues.includes(0);
  if (lesson === 'corner') {
    const corners = [0, p.cols - 1, (p.rows - 1) * p.cols, p.rows * p.cols - 1];
    return corners.some((c) => p.clues[c] === 3);
  }
  if (lesson === 'threes') return pairPatterns(p).some((x) => x.kind === 'adjacent3');
  if (lesson === 'ahead') return tier === 3;
  return true;
}

/** Builds level `n` from its seed (slow for big boards; players get the shipped copy). */
export function freshLevel(n: number): string {
  const spec = specFor(n);
  const base = levelSeed(n);
  for (let attempt = 0; ; attempt++) {
    const made = generate(spec, (base + attempt * 0x9e3779b9) >>> 0);
    // Gentle chapters keep their promise: no board harder than its tier.
    const fits = made.tier <= Math.max(spec.tier, 1);
    if ((fits && showsLesson(spec.lesson, made.puzzle, made.tier)) || attempt > 40) {
      return encodePuzzle(made.puzzle, made.tier);
    }
  }
}

const cache = new Map<number, Level>();

/** Level `n` (1–300), as shipped. */
export function levelFor(n: number): Level {
  const hit = cache.get(n);
  if (hit) return hit;
  const text = SHIPPED[n - 1];
  if (!text) throw new Error(`No level ${n}`);
  const { puzzle, tier } = decodePuzzle(text);
  const level: Level = { id: String(n), puzzle, tier, lesson: lessonAt(n) };
  cache.set(n, level);
  return level;
}

export type Difficulty = 'gentle' | 'easy' | 'steady' | 'tricky' | 'deep';

/** A word for how hard a board feels, from its size and the ideas it needs. */
export function difficultyOf(level: Level): Difficulty {
  const side = Math.max(level.puzzle.rows, level.puzzle.cols);
  const score = side + (level.tier - 1) * 2;
  if (score <= 5) return 'gentle';
  if (score <= 7) return 'easy';
  if (score <= 9) return 'steady';
  if (score <= 11) return 'tricky';
  return 'deep';
}

/** A light shuffle of `count` numbers from a seed, for picking test samples. */
export function sample(count: number, from: number, to: number, seed: number): number[] {
  const rnd = random(seed);
  const picked = new Set<number>();
  while (picked.size < Math.min(count, to - from + 1)) {
    picked.add(from + Math.floor(rnd() * (to - from + 1)));
  }
  return [...picked].sort((a, b) => a - b);
}
