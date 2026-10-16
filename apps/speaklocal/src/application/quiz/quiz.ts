import { random } from 'app-kit';
import type { Phrase } from '@/domain/content/types';

/**
 * Quick quiz questions:
 * - `say`: "How do you say …?" — pick the phrase for an English meaning.
 * - `meaning`: "What does this mean?" — pick the meaning of a phrase.
 * - `listen`: "Tap what you heard" — hear a phrase, pick it (only when the
 *   device has a voice for the language).
 *
 * Fully deterministic for a seed, so a quiz can be rebuilt exactly.
 */
export type QuestionKind = 'say' | 'meaning' | 'listen';

export interface Question {
  readonly kind: QuestionKind;
  readonly answer: Phrase;
  /** The choices, answer included, in display order. */
  readonly options: readonly Phrase[];
  readonly correct: number;
}

export interface QuizOptions {
  readonly count: number;
  readonly canListen: boolean;
  /** Where wrong choices come from (defaults to the pool itself). */
  readonly distractors?: readonly Phrase[];
  readonly choices?: number;
}

function shuffle<T>(items: readonly T[], rnd: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{M}\p{N}]+/gu, '');

/** Wrong choices that cannot be mistaken for the answer: different meaning and text. */
function pickDistractors(answer: Phrase, from: readonly Phrase[], n: number, rnd: () => number) {
  const ok = (p: Phrase) =>
    p.key !== answer.key && norm(p.en) !== norm(answer.en) && p.native !== answer.native;
  const sameScene = shuffle(
    from.filter((p) => ok(p) && p.scene === answer.scene),
    rnd,
  );
  const others = shuffle(
    from.filter((p) => ok(p) && p.scene !== answer.scene),
    rnd,
  );
  const chosen: Phrase[] = [];
  for (const p of [...sameScene, ...others]) {
    if (chosen.length >= n) break;
    if (chosen.some((c) => norm(c.en) === norm(p.en) || c.native === p.native)) continue;
    chosen.push(p);
  }
  return chosen;
}

export function makeQuiz(pool: readonly Phrase[], seed: number, options: QuizOptions): Question[] {
  const rnd = random(seed);
  const from = options.distractors ?? pool;
  const choices = options.choices ?? 4;
  const targets = shuffle(pool, rnd).slice(0, options.count);
  return targets.map((answer, i) => {
    const r = rnd();
    let kind: QuestionKind;
    if (options.canListen) kind = r < 0.4 ? 'say' : r < 0.72 ? 'meaning' : 'listen';
    else kind = r < 0.5 ? 'say' : 'meaning';
    // The first question is always a gentle "how do you say".
    if (i === 0) kind = 'say';
    const wrong = pickDistractors(answer, from, choices - 1, rnd);
    const all = shuffle([answer, ...wrong], rnd);
    return { kind, answer, options: all, correct: all.indexOf(answer) };
  });
}

/** Score as a whole percentage. */
export function percent(correct: number, total: number): number {
  return total <= 0 ? 0 : Math.round((100 * correct) / total);
}
