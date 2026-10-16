import { dailySeed, random } from 'app-kit';
import type { Progress } from '@/domain/entities/Progress';
import { streak, tally, totalStars } from '@/domain/entities/Progress';
import type { ScriptId } from '@/domain/entities/Script';
import { lettersOf } from '@/domain/entities/Script';
import { SCRIPTS, scriptById } from '@/domain/entities/scripts';

export interface LetterRef {
  readonly script: ScriptId;
  readonly index: number;
}

/**
 * The letter of the day: the same for everyone learning the same scripts
 * on the same date, from one of the learner's scripts.
 */
export function letterOfTheDay(scripts: readonly ScriptId[], now: Date): LetterRef {
  const pool = scripts.length ? scripts : SCRIPTS.map((s) => s.id);
  const rand = random(dailySeed(now, 7));
  const script = pool[Math.floor(rand() * pool.length)]!;
  const count = lettersOf(scriptById(script)).length;
  return { script, index: Math.floor(rand() * count) };
}

/** Where a script's letters go after `index`: wraps to the start. */
export function nextIndex(script: ScriptId, index: number, step: 1 | -1): number {
  const n = lettersOf(scriptById(script)).length;
  return (index + step + n) % n;
}

export type AchievementId =
  | 'firstLetter'
  | 'tenLetters'
  | 'fiftyLetters'
  | 'firstMemory'
  | 'vowels'
  | 'wholeScript'
  | 'twoScripts'
  | 'threeDays'
  | 'sevenDays'
  | 'hundredStars';

export interface Achievement {
  readonly id: AchievementId;
  /** How far along, 0–1. */
  readonly progress: number;
  readonly done: boolean;
}

/**
 * Gentle milestones. Nothing expires and nothing is lost by taking a break:
 * "days" counts days written, not an unbroken run.
 */
export function achievements(p: Progress): Achievement[] {
  const started = Object.keys(p.stars).length;
  const scriptsTouched = new Set(Object.keys(p.stars).map((k) => k.split(':')[0])).size;
  const days = p.days.length;
  let vowels = 0;
  let whole = 0;
  for (const script of SCRIPTS) {
    const group = script.groups.find((g) => g.id === 'vowels');
    if (group) {
      const done = group.letters.filter((l) => (p.stars[`${script.id}:${l.char}`] ?? 0) > 0);
      vowels = Math.max(vowels, done.length / group.letters.length);
    }
    const t = tally(p, script);
    whole = Math.max(whole, t.started / t.letters);
  }
  const items: [AchievementId, number][] = [
    ['firstLetter', Math.min(1, started)],
    ['tenLetters', started / 10],
    ['fiftyLetters', started / 50],
    ['firstMemory', Math.min(1, p.fromMemory)],
    ['vowels', vowels],
    ['wholeScript', whole],
    ['twoScripts', scriptsTouched / 2],
    ['threeDays', days / 3],
    ['sevenDays', days / 7],
    ['hundredStars', totalStars(p) / 100],
  ];
  return items.map(([id, v]) => {
    const progress = Math.max(0, Math.min(1, v));
    return { id, progress, done: progress >= 1 };
  });
}

/** Practice days in the last `weeks` weeks, oldest first, as booleans per day. */
export function recentDays(p: Progress, now: Date, days = 28): boolean[] {
  const set = new Set(p.days);
  const out: boolean[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    out.push(set.has(key));
  }
  return out;
}

export { streak };
