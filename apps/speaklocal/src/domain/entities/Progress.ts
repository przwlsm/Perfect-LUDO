import { dailyStreak, localDay } from 'app-kit';
import { isSceneId } from '../content/scenes';
import type { LangId, SceneId } from '../content/types';

/** One phrase in spaced review (SM-2-lite; the maths lives in application/review). */
export interface ReviewCard {
  /** How fast the interval grows (1.3–3). */
  readonly ease: number;
  /** Days until the next review after the last one. */
  readonly interval: number;
  /** Local day index when it is next due. */
  readonly due: number;
  /** Correct reviews in a row. */
  readonly reps: number;
  readonly lapses: number;
}

export interface SceneRecord {
  /** Listened to the whole conversation. */
  readonly heard: boolean;
  /** Spoke your lines in "Your turn". */
  readonly spoke: boolean;
  /** Best quiz score, 0–100. */
  readonly quizBest: number;
}

/**
 * What the learner has done. Lives on the device only; recordings are
 * files, listed separately.
 */
export interface Progress {
  /** Local days (YYYY-MM-DD) with any practice, newest last. */
  readonly days: readonly string[];
  /** `<lang>:<scene>` → what was done in it. */
  readonly scenes: Readonly<Record<string, SceneRecord>>;
  /** Phrase keys heard or said at least once. */
  readonly practised: readonly string[];
  readonly answered: number;
  readonly correct: number;
  readonly favourites: readonly string[];
  /** Phrase key → its review card. */
  readonly cards: Readonly<Record<string, ReviewCard>>;
  /** The scene opened last, to continue from home. */
  readonly lastScene: SceneId | null;
}

export const NO_PROGRESS: Progress = {
  days: [],
  scenes: {},
  practised: [],
  answered: 0,
  correct: 0,
  favourites: [],
  cards: {},
  lastScene: null,
};

export const NO_SCENE: SceneRecord = { heard: false, spoke: false, quizBest: 0 };

export function sceneKey(lang: LangId, scene: SceneId): string {
  return `${lang}:${scene}`;
}

export function sceneRecord(p: Progress, lang: LangId, scene: SceneId): SceneRecord {
  return p.scenes[sceneKey(lang, scene)] ?? NO_SCENE;
}

/** 0–3: heard it, spoke it, passed its quiz (70%+). */
export function sceneStars(r: SceneRecord): number {
  return (r.heard ? 1 : 0) + (r.spoke ? 1 : 0) + (r.quizBest >= 70 ? 1 : 0);
}

/** The local day as a whole number, for review intervals. */
export function dayIndex(now: Date): number {
  return Math.round(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86_400_000);
}

/** Marks today as a practice day. */
export function touchDay(p: Progress, now: Date): Progress {
  const day = localDay(now);
  return p.days.includes(day) ? p : { ...p, days: [...p.days, day].slice(-400) };
}

export function markScene(
  p: Progress,
  lang: LangId,
  scene: SceneId,
  patch: Partial<SceneRecord>,
  now: Date,
): Progress {
  const k = sceneKey(lang, scene);
  const before = p.scenes[k] ?? NO_SCENE;
  const next: SceneRecord = {
    heard: before.heard || patch.heard === true,
    spoke: before.spoke || patch.spoke === true,
    quizBest: Math.max(before.quizBest, Math.round(patch.quizBest ?? 0)),
  };
  return touchDay({ ...p, scenes: { ...p.scenes, [k]: next } }, now);
}

export function markPractised(p: Progress, keys: readonly string[], now: Date): Progress {
  const have = new Set(p.practised);
  const fresh = keys.filter((k) => !have.has(k));
  const q = fresh.length ? { ...p, practised: [...p.practised, ...fresh] } : p;
  return touchDay(q, now);
}

export function toggleFavourite(p: Progress, key: string): Progress {
  return p.favourites.includes(key)
    ? { ...p, favourites: p.favourites.filter((k) => k !== key) }
    : { ...p, favourites: [...p.favourites, key] };
}

export function streak(p: Progress, now: Date): number {
  return dailyStreak({ stars: {}, dailies: p.days }, now);
}

const num = (x: unknown, lo = 0) =>
  typeof x === 'number' && Number.isFinite(x) ? Math.max(lo, x) : lo;
const strings = (x: unknown) =>
  Array.isArray(x) ? x.filter((d): d is string => typeof d === 'string') : [];

export function parseProgress(raw: string | null): Progress {
  if (!raw) return NO_PROGRESS;
  try {
    const v = JSON.parse(raw) as Partial<Record<keyof Progress, unknown>>;
    const scenes: Record<string, SceneRecord> = {};
    if (v.scenes && typeof v.scenes === 'object') {
      for (const [k, r] of Object.entries(v.scenes as Record<string, Partial<SceneRecord>>)) {
        if (!r || typeof r !== 'object') continue;
        scenes[k] = {
          heard: r.heard === true,
          spoke: r.spoke === true,
          quizBest: Math.min(100, num(r.quizBest)),
        };
      }
    }
    const cards: Record<string, ReviewCard> = {};
    if (v.cards && typeof v.cards === 'object') {
      for (const [k, c] of Object.entries(v.cards as Record<string, Partial<ReviewCard>>)) {
        if (!c || typeof c !== 'object' || typeof c.due !== 'number') continue;
        cards[k] = {
          ease: Math.min(3, Math.max(1.3, num(c.ease, 1.3))),
          interval: num(c.interval),
          due: c.due,
          reps: num(c.reps),
          lapses: num(c.lapses),
        };
      }
    }
    return {
      days: strings(v.days),
      scenes,
      practised: [...new Set(strings(v.practised))],
      answered: num(v.answered),
      correct: num(v.correct),
      favourites: [...new Set(strings(v.favourites))],
      cards,
      lastScene: isSceneId(v.lastScene) ? v.lastScene : null,
    };
  } catch {
    return NO_PROGRESS;
  }
}
