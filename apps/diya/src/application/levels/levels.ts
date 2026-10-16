import { random } from 'app-kit';
import type { Lesson, Level } from '@/domain/entities/Board';
import { generate, type LevelSpec } from '../engine/generator';
import { decodeLevel } from './codec';
import { HANDMADE, parseBoard } from './handmade';
import { SHIPPED } from './shipped';

export const LEVEL_COUNT = 300;
export const CHAPTER_SIZE = 20;
export const CHAPTER_COUNT = LEVEL_COUNT / CHAPTER_SIZE;

/** Where each new idea first appears, with its one-line lesson. */
export const LESSONS: readonly { readonly level: number; readonly lesson: Lesson }[] = [
  { level: 1, lesson: 'rotate' },
  { level: 6, lesson: 'place' },
  { level: 11, lesson: 'walls' },
  { level: 21, lesson: 'prism' },
  { level: 31, lesson: 'fixed' },
  { level: 41, lesson: 'glass' },
  { level: 51, lesson: 'mixing' },
  { level: 61, lesson: 'oneway' },
  { level: 71, lesson: 'sleeper' },
  { level: 81, lesson: 'twoFlames' },
];

export function lessonAt(n: number): Lesson | undefined {
  return LESSONS.find((l) => l.level === n)?.lesson;
}

/** Ideas a level may use: every lesson at or before it. */
function knows(n: number, lesson: Lesson): boolean {
  return LESSONS.some((l) => l.lesson === lesson && l.level <= n);
}

/** The seed of level `n`: fixed forever, so a level is the same board on every phone. */
export function levelSeed(n: number): number {
  let h = (n * 2654435761 + 0x9e3779b9) >>> 0;
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d) >>> 0;
  h ^= h >>> 12;
  return h >>> 0;
}

export function chapterOf(n: number): number {
  return Math.floor((n - 1) / CHAPTER_SIZE);
}

/**
 * The difficulty curve. Each chapter of twenty climbs, then the next opens
 * a little gentler than the last one ended. Boards grow from 5x6 to 8x10;
 * pieces from one to seven; ideas arrive one at a time (see LESSONS) and,
 * from level 91 on, are mixed by each level's own seed.
 */
export function specFor(n: number): LevelSpec {
  const r = random(levelSeed(n) ^ 0x5bd1e995);
  const k = (n - 1) % CHAPTER_SIZE;
  const climb = k / (CHAPTER_SIZE - 1);
  const lesson = lessonAt(n);
  const roll = (a: number, b: number) => a + Math.floor(r() * (b - a + 1));
  const chance = (p: number) => r() < p;

  // The first five: turning mirrors in place.
  if (n <= 5) {
    const pivots = n <= 3 ? n : 3;
    return base({ w: 5, h: 7, pieces: pivots, pivots, difficulty: 1 + n * 0.4, candidates: 3 });
  }
  if (n <= 10) {
    return base({
      w: 5,
      h: 7,
      pieces: n < 8 ? 2 : 3,
      pivots: n % 2 === 0 ? 1 : 0,
      walls: 1,
      difficulty: 2.5 + (n - 6) * 0.3,
    });
  }
  if (n <= 20) {
    return base({
      w: n < 16 ? 5 : 6,
      h: 7,
      pieces: n < 14 ? 2 : 3,
      pivots: n % 3 === 0 ? 1 : 0,
      walls: roll(2, 4),
      difficulty: 3.5 + climb * 2,
      harden: 4,
    });
  }

  const late = n > 90;
  const stage = Math.min(1, (n - 21) / (LEVEL_COUNT - 21));
  const w = n <= 40 ? 6 : n <= 90 ? (n <= 60 ? 6 : 7) : stage < 0.45 ? 7 : 8;
  const h = n <= 30 ? 7 : n <= 60 ? 8 : n <= 90 ? 9 : stage < 0.45 ? 9 : 10;
  const pieces = Math.min(7, 3 + Math.floor(stage * 4 + climb * 1.2));

  const prisms = knows(n, 'prism')
    ? lesson === 'prism' || (n <= 30 && !late)
      ? 1
      : roll(late ? 0 : 1, late ? 2 : 1)
    : 0;
  const glassOn = knows(n, 'glass') && (!late || chance(0.6));
  const mixing =
    lesson === 'mixing' ||
    (knows(n, 'mixing') && glassOn && (n <= 60 ? chance(0.6) : chance(0.35)));
  const flames =
    lesson === 'twoFlames' || (knows(n, 'twoFlames') && chance(n <= 90 ? 0.7 : 0.3)) ? 2 : 1;
  const spec: LevelSpec = {
    w,
    h,
    flames,
    pieces: pieces + (mixing ? 1 : 0),
    pivots: late && chance(0.25) ? 1 : 0,
    fixed: knows(n, 'fixed') ? (lesson === 'fixed' ? 1 : roll(0, late ? 2 : 1)) : 0,
    prisms: mixing ? Math.max(1, prisms) : prisms,
    glass: glassOn ? (mixing ? 2 : roll(1, 2)) : 0,
    mixing,
    oneways: knows(n, 'oneway') ? (lesson === 'oneway' ? 1 : chance(late ? 0.35 : 0.6) ? 1 : 0) : 0,
    sleepers: knows(n, 'sleeper')
      ? lesson === 'sleeper'
        ? 1
        : chance(late ? 0.4 : 0.7)
          ? roll(1, 2)
          : 0
      : 0,
    walls: roll(2, 3 + Math.floor(stage * 5)),
    diyas: [1, Math.min(4, 2 + Math.floor(stage * 3))],
    difficulty: 4 + stage * 6 + climb * 1.5,
    harden: 8,
    candidates: 4,
  };
  return spec;
}

function base(partial: Partial<LevelSpec> & { w: number; h: number; pieces: number }): LevelSpec {
  return {
    flames: 1,
    pivots: 0,
    fixed: 0,
    prisms: 0,
    glass: 0,
    mixing: false,
    oneways: 0,
    sleepers: 0,
    walls: 0,
    diyas: [1, 1],
    difficulty: 3,
    harden: 0,
    candidates: 3,
    ...partial,
  };
}

/**
 * Builds from a spec, relaxing it step by step if the seed cannot meet it:
 * fewer extras first, never the idea a lesson level is there to teach.
 */
export function buildLevel(spec: LevelSpec, seed: number, id: string, lesson?: Lesson): Level {
  const steps: ((s: LevelSpec) => LevelSpec)[] = [
    (s) => s,
    (s) => ({ ...s, sleepers: Math.min(s.sleepers, 1), oneways: Math.min(s.oneways, 1) }),
    (s) => ({
      ...s,
      mixing: lesson === 'mixing' ? s.mixing : false,
      flames: lesson === 'twoFlames' ? s.flames : 1,
      sleepers: lesson === 'sleeper' ? 1 : 0,
      oneways: lesson === 'oneway' ? 1 : 0,
    }),
    (s) => ({ ...s, pieces: Math.max(2, s.pieces - 1), walls: Math.max(0, s.walls - 2) }),
  ];
  let current = spec;
  for (let i = 0; i < steps.length; i++) {
    current = steps[i]!(current);
    const built = generate(current, (seed + i * 0x9e3779b1) >>> 0, id, lesson);
    if (built) return built.level;
  }
  throw new Error(`Could not build level ${id}`);
}

/** Level `n` built afresh: hand-made for the early lessons, otherwise from its seed. */
export function freshLevel(n: number): Level {
  const id = String(n);
  const hand = HANDMADE[n];
  return hand
    ? parseBoard(id, hand.rows, hand.lesson)
    : buildLevel(specFor(n), levelSeed(n), id, lessonAt(n));
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

/** Board sizes and ideas of a chapter, for the level map. */
export function chapterLevels(chapter: number): number[] {
  const first = chapter * CHAPTER_SIZE + 1;
  return Array.from({ length: CHAPTER_SIZE }, (_, i) => first + i);
}
