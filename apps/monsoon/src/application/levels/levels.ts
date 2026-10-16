import { random } from 'app-kit';
import type { Lesson, Level } from '@/domain/entities/Board';
import { generate, type Generated, type LevelSpec } from '../engine/generator';
import { decodeLevel } from './codec';
import { HANDMADE, parseBoard } from './handmade';
import { SHIPPED } from './shipped';

export const LEVEL_COUNT = 300;
export const CHAPTER_SIZE = 20;
export const CHAPTER_COUNT = LEVEL_COUNT / CHAPTER_SIZE;
/** Levels the generator must make with exactly one answer. */
export const UNIQUE_UP_TO = 100;

/** Where each new idea first appears (about one every fifteen levels), with its one-line lesson. */
export const LESSONS: readonly { readonly level: number; readonly lesson: Lesson }[] = [
  { level: 1, lesson: 'rotate' },
  { level: 4, lesson: 'spills' },
  { level: 16, lesson: 'clouds' },
  { level: 31, lesson: 'fixed' },
  { level: 46, lesson: 'bridges' },
  { level: 61, lesson: 'dams' },
  { level: 76, lesson: 'twoWaters' },
];

export function lessonAt(n: number): Lesson | undefined {
  return LESSONS.find((l) => l.level === n)?.lesson;
}

/** Whether level `n` may use an idea: every lesson at or before it. */
export function knows(n: number, lesson: Lesson): boolean {
  return LESSONS.some((l) => l.lesson === lesson && l.level <= n);
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

/** Each chapter's board, before it grows a row in its last third. */
const CHAPTER_BOARDS: readonly (readonly [number, number])[] = [
  [5, 5],
  [5, 6],
  [6, 6],
  [6, 7],
  [7, 7],
  [7, 8],
  [7, 8],
  [7, 9],
  [8, 9],
  [8, 9],
  [8, 10],
  [8, 10],
  [8, 11],
  [9, 11],
  [9, 11],
];

/** The board size of level `n`: 4×4 at the start, 9×12 by the end. */
export function sizeFor(n: number): readonly [number, number] {
  if (n <= 6) return [4, n <= 3 ? 4 : 5];
  if (n <= 10) return [5, 5];
  const chapter = chapterOf(n);
  const [w, h] = CHAPTER_BOARDS[chapter]!;
  const k = (n - 1) % CHAPTER_SIZE;
  return [w, Math.min(12, h + (k >= 13 ? 1 : 0))];
}

/**
 * The difficulty curve. Boards grow; networks branch more and wind less;
 * fewer tiles start already facing right; the cloud budget tightens. New
 * ideas arrive one at a time (see LESSONS) and then mix by each level's seed.
 * Within a chapter it climbs; the next chapter opens a little gentler.
 */
export function specFor(n: number): LevelSpec {
  const r = random(levelSeed(n) ^ 0x5bd1e995);
  const chance = (p: number) => r() < p;
  const lesson = lessonAt(n);
  const t = Math.min(1, (n - 1) / (LEVEL_COUNT - 1));
  const climb = ((n - 1) % CHAPTER_SIZE) / (CHAPTER_SIZE - 1);
  const [w, h] = sizeFor(n);
  const area = w * h;
  const late = n > 90;
  const twoWaters = lesson === 'twoWaters' || (knows(n, 'twoWaters') && chance(late ? 0.4 : 0.6));
  return {
    w,
    h,
    rocks: n <= 10 ? 0.26 : 0.22 - 0.12 * t,
    fields: Math.max(1, Math.min(9, Math.round(area / 12 + climb * 1.2))) + (twoWaters ? 1 : 0),
    deadEnds: n < 20 ? 0 : Math.min(4, Math.floor(area / 32) + (climb > 0.5 ? 1 : 0)),
    wind: 0.78 - 0.34 * t - 0.12 * climb,
    twoWaters,
    bridges:
      lesson === 'bridges'
        ? 1
        : knows(n, 'bridges') && chance(late ? 0.45 : 0.55)
          ? late && chance(0.3)
            ? 2
            : 1
          : 0,
    dams:
      lesson === 'dams'
        ? 2
        : knows(n, 'dams') && chance(late ? 0.45 : 0.6)
          ? 1 + (chance(0.4) ? 1 : 0)
          : 0,
    fixed: lesson === 'fixed' ? 3 : knows(n, 'fixed') ? Math.floor(r() * (late ? 3 : 2.5)) : 0,
    slack: knows(n, 'clouds') ? 0.6 - 0.35 * t : null,
    settled: n <= 10 ? 0.3 : 0.28 - 0.24 * t - 0.06 * climb,
    attempts: n <= UNIQUE_UP_TO ? 40 : 10,
    pinAmbiguity: knows(n, 'fixed'),
  };
}

/**
 * Builds from a spec, relaxing it step by step if the seed cannot meet it:
 * fewer extras first, never the idea a lesson level is there to teach.
 */
export function buildLevel(spec: LevelSpec, seed: number, id: string, lesson?: Lesson): Generated {
  const steps: ((s: LevelSpec) => LevelSpec)[] = [
    (s) => s,
    (s) => ({
      ...s,
      bridges: lesson === 'bridges' ? s.bridges : Math.min(1, s.bridges),
      dams: lesson === 'dams' ? s.dams : Math.min(1, s.dams),
    }),
    (s) => ({
      ...s,
      twoWaters: lesson === 'twoWaters' ? s.twoWaters : false,
      bridges: lesson === 'bridges' ? s.bridges : 0,
      dams: lesson === 'dams' ? 1 : 0,
      rocks: s.rocks * 0.7,
    }),
  ];
  let current = spec;
  let fallback: Generated | null = null;
  for (let i = 0; i < steps.length; i++) {
    current = steps[i]!(current);
    const built = generate(current, (seed + i * 0x632be5ab) >>> 0, id, lesson);
    if (built?.unique) return built;
    fallback ??= built;
  }
  if (fallback) return fallback;
  throw new Error(`Could not build level ${id}`);
}

/** Level `n` built afresh: hand-made for the first steps, otherwise from its seed. */
export function freshLevel(n: number): Level {
  const id = String(n);
  const hand = HANDMADE[n];
  return hand
    ? parseBoard(id, hand.rows, hand.lesson)
    : buildLevel(specFor(n), levelSeed(n), id, lessonAt(n)).level;
}

const cache = new Map<number, Level>();

/** Level `n` (1-based) as shipped. */
export function levelFor(n: number): Level {
  const hit = cache.get(n);
  if (hit) return hit;
  const text = SHIPPED[n - 1];
  const level = text ? decodeLevel(text) : freshLevel(n);
  cache.set(n, level);
  return level;
}

export function chapterLevels(chapter: number): number[] {
  const first = chapter * CHAPTER_SIZE + 1;
  return Array.from({ length: CHAPTER_SIZE }, (_, i) => first + i);
}
