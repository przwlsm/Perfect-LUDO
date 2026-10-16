import { random } from 'app-kit';
import type { CupSpec, Lesson, Level } from '@/domain/entities/Level';
import { generate, parFor, type LevelSpec } from '../engine/generator';
import { route } from '../engine/solver';
import { positionOf } from '../engine/state';
import { decodeLevel } from './codec';
import { SHIPPED } from './shipped';

export const LEVEL_COUNT = 300;
export const CHAPTER_SIZE = 15;
export const CHAPTER_COUNT = LEVEL_COUNT / CHAPTER_SIZE;

/** Where each new idea first appears, with its one-line lesson. */
export const LESSONS: readonly { readonly level: number; readonly lesson: Lesson }[] = [
  { level: 1, lesson: 'pour' },
  { level: 2, lesson: 'match' },
  { level: 3, lesson: 'serve' },
  { level: 16, lesson: 'froth' },
  { level: 31, lesson: 'oneSpare' },
  { level: 46, lesson: 'lid' },
  { level: 61, lesson: 'tall' },
  { level: 76, lesson: 'spice' },
];

export function lessonAt(n: number): Lesson | undefined {
  return LESSONS.find((l) => l.level === n)?.lesson;
}

/** The seed of level `n`: fixed forever, so a level is the same counter on every phone. */
export function levelSeed(n: number): number {
  let h = (n * 2654435761 + 0x9e3779b9) >>> 0;
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d) >>> 0;
  h ^= h >>> 12;
  return h >>> 0;
}

export function chapterOf(n: number): number {
  return Math.min(CHAPTER_COUNT - 1, Math.floor((n - 1) / CHAPTER_SIZE));
}

export function chapterLevels(chapter: number): number[] {
  const first = chapter * CHAPTER_SIZE + 1;
  return Array.from({ length: CHAPTER_SIZE }, (_, i) => first + i);
}

/**
 * What each chapter of fifteen is about. Ingredients climb through a
 * chapter (lo → hi) and the next chapter opens a little gentler; every
 * chapter has its own twist, first one idea at a time, then mixed.
 */
interface ChapterPlan {
  /** Ordinary ingredients at the chapter's first and last level. */
  readonly ing: readonly [number, number];
  readonly spares: number;
  /** Froth layers at the first and last level. */
  readonly froth?: readonly [number, number];
  readonly lids?: readonly [number, number];
  readonly tall?: number;
  readonly spices?: number;
  /** Chance (per level) of a twist the chapter does not feature, from level 91 on. */
  readonly extra?: number;
}

const PLANS: readonly ChapterPlan[] = [
  /* 1  First boil      */ { ing: [3, 5], spares: 2 },
  /* 2  Under the froth */ { ing: [4, 6], spares: 2, froth: [1, 3] },
  /* 3  One spare cup   */ { ing: [3, 5], spares: 1 },
  /* 4  Lids on         */ { ing: [5, 7], spares: 2, lids: [1, 2] },
  /* 5  The tall glass  */ { ing: [5, 7], spares: 1, tall: 1 },
  /* 6  Spice shelf     */ { ing: [4, 6], spares: 2, spices: 1 },
  /* 7  Morning rush    */ { ing: [6, 8], spares: 2, froth: [2, 3], extra: 0.2 },
  /* 8  Monsoon tea     */ { ing: [6, 8], spares: 2, lids: [1, 2], extra: 0.2 },
  /* 9  Tall order      */ { ing: [6, 8], spares: 1, tall: 1, froth: [1, 2], extra: 0.15 },
  /* 10 Two spices      */ { ing: [5, 7], spares: 2, spices: 2, extra: 0.15 },
  /* 11 Station chai    */ { ing: [4, 6], spares: 1, froth: [1, 2], extra: 0.15 },
  /* 12 Lantern hour    */ { ing: [7, 9], spares: 2, froth: [3, 4], lids: [1, 1], extra: 0.2 },
  /* 13 Copper pot      */ { ing: [7, 9], spares: 1, tall: 1, lids: [1, 1], extra: 0.2 },
  /* 14 Festival crowd  */ { ing: [8, 10], spares: 2, extra: 0.35 },
  /* 15 Deep froth      */ { ing: [7, 9], spares: 2, froth: [4, 6], extra: 0.2 },
  /* 16 Spice market    */ { ing: [6, 8], spares: 2, spices: 2, froth: [1, 3], extra: 0.2 },
  /* 17 Last train      */ { ing: [5, 6], spares: 1, lids: [1, 1], extra: 0.15 },
  /* 18 Tin-roof rain   */ { ing: [7, 9], spares: 1, tall: 1, spices: 1, froth: [1, 2] },
  /* 19 Wedding order   */ { ing: [9, 10], spares: 2, extra: 0.45 },
  /* 20 Master's stall  */ { ing: [8, 10], spares: 2, froth: [2, 4], extra: 0.5 },
];

function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

/** The shape of level `n`. */
export function specFor(n: number): LevelSpec {
  const c = chapterOf(n);
  const plan = PLANS[c]!;
  const k = (n - 1) % CHAPTER_SIZE;
  const climb = k / (CHAPTER_SIZE - 1);
  const r = random(levelSeed(n) ^ 0x5bd1e995);
  const chance = (p: number) => r() < p;
  const lesson = lessonAt(n);
  const ingredients = n <= 5 ? 3 : n <= 9 ? 4 : lerp(plan.ing[0], plan.ing[1], climb);

  let froth = plan.froth ? lerp(plan.froth[0], plan.froth[1], climb) : 0;
  let lids = plan.lids ? lerp(plan.lids[0], plan.lids[1], climb) : 0;
  let tall = plan.tall ?? 0;
  let spices = plan.spices ?? 0;
  // From level 91, chapters borrow an earlier idea now and then.
  if (plan.extra && chance(plan.extra)) {
    const pick = Math.floor(r() * 3);
    if (pick === 0 && froth === 0) froth = 2;
    else if (pick === 1 && lids === 0) lids = 1;
    else if (spices === 0) spices = 1;
  }
  if (plan.spares === 1 && tall === 0) {
    // One spare cup is tight; keep such levels to a handful of ingredients.
    spices = Math.min(spices, 1);
  }
  const plain = Math.max(2, ingredients - spices);
  const total = plain + spices;
  // A route a little longer than the counter strictly needs as the chapter climbs.
  const target = Math.round(total * (2.6 + 0.9 * climb) + (plan.spares === 1 ? 2 : 0) + lids);
  return {
    ingredients: plain,
    pool: Math.min(11, Math.max(plain, 3 + Math.floor(n / 10))),
    spices,
    spares: plan.spares,
    tall,
    tallFill: tall ? 4 + (climb > 0.5 ? 1 : 0) : 4,
    froth: lesson === 'froth' ? 1 : froth,
    lids: lesson === 'lid' ? 1 : lids,
    lidPours: n < 60 ? [4, 6] : [3, 8],
    maxSame: n <= 15 || plan.spares === 1 ? 3 : 2,
    target,
    candidates: n <= 15 ? 3 : 5,
    budget: 40_000,
  };
}

/** The first two levels are set by hand: they teach with nothing else going on. */
const HANDMADE: Readonly<Record<number, readonly (readonly number[])[]>> = {
  1: [[0, 0, 0, 1], [1, 1, 1, 0], []],
  2: [[0, 1, 1, 0], [1, 0, 0, 1], [], []],
};

function handmade(n: number, layers: readonly (readonly number[])[]): Level {
  const cups: CupSpec[] = layers.map((l) => ({ cap: 4, lid: 0, layers: [...l] }));
  const best = route(positionOf({ cups }), 10_000).path.length;
  return { id: String(n), cups, best, par: parFor(best), lesson: lessonAt(n) };
}

/**
 * Builds from a spec, relaxing it step by step if the seed cannot meet it:
 * more room first, never the idea a lesson level is there to teach.
 */
export function buildLevel(spec: LevelSpec, seed: number, id: string, lesson?: Lesson): Level {
  const steps: ((s: LevelSpec) => LevelSpec)[] = [
    (s) => s,
    (s) => ({ ...s, maxSame: 3, candidates: Math.max(2, s.candidates - 2) }),
    (s) => ({ ...s, ingredients: Math.max(2, s.ingredients - 1) }),
    (s) => ({ ...s, spares: s.spares + 1, lids: Math.min(1, s.lids) }),
  ];
  let current = spec;
  for (let i = 0; i < steps.length; i++) {
    current = steps[i]!(current);
    const built = generate(current, (seed + i * 0x9e3779b1) >>> 0, id, lesson);
    if (built) return built.level;
  }
  throw new Error(`Could not build level ${id}`);
}

/** Level `n` built afresh from its seed (what `npm run levels` bakes). */
export function freshLevel(n: number): Level {
  const hand = HANDMADE[n];
  return hand ? handmade(n, hand) : buildLevel(specFor(n), levelSeed(n), String(n), lessonAt(n));
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
