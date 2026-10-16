import type { Phrase } from '@/domain/content/types';
import { makeQuiz, percent } from './quiz';

function phrase(i: number, scene = i < 6 ? 'auto' : 'shopping'): Phrase {
  return {
    key: `kn:${scene}.${i}`,
    lang: 'kn',
    lineId: `${scene}.${i}`,
    scene: scene as Phrase['scene'],
    speaker: 'you',
    native: `ನ${i}`,
    roman: `Na ${i}`,
    en: `Meaning ${i}.`,
    hi: `अर्थ ${i}।`,
    extra: false,
  };
}

const POOL = Array.from({ length: 12 }, (_, i) => phrase(i));

describe('quiz', () => {
  it('is the same quiz for the same seed, and a different one for another', () => {
    const a = makeQuiz(POOL, 7, { count: 8, canListen: true });
    const b = makeQuiz(POOL, 7, { count: 8, canListen: true });
    const c = makeQuiz(POOL, 8, { count: 8, canListen: true });
    expect(a).toEqual(b);
    expect(a.map((q) => q.answer.key)).not.toEqual(c.map((q) => q.answer.key));
  });

  it('asks distinct phrases, each with four distinct choices including the answer', () => {
    const quiz = makeQuiz(POOL, 3, { count: 8, canListen: true });
    expect(quiz).toHaveLength(8);
    expect(new Set(quiz.map((q) => q.answer.key)).size).toBe(8);
    for (const q of quiz) {
      expect(q.options).toHaveLength(4);
      expect(q.options[q.correct]).toBe(q.answer);
      expect(new Set(q.options.map((o) => o.en)).size).toBe(4);
      expect(new Set(q.options.map((o) => o.native)).size).toBe(4);
    }
  });

  it('prefers wrong choices from the same scene', () => {
    const quiz = makeQuiz(POOL, 11, { count: 12, canListen: false });
    for (const q of quiz) {
      const same = q.options.filter((o) => o.scene === q.answer.scene).length;
      expect(same).toBe(4);
    }
  });

  it('never asks a listening question without a voice, and starts gently', () => {
    for (let seed = 1; seed < 40; seed++) {
      const quiz = makeQuiz(POOL, seed, { count: 8, canListen: false });
      expect(quiz.some((q) => q.kind === 'listen')).toBe(false);
      expect(quiz[0]!.kind).toBe('say');
    }
    const kinds = new Set(
      Array.from({ length: 20 }, (_, s) => makeQuiz(POOL, s, { count: 8, canListen: true }))
        .flat()
        .map((q) => q.kind),
    );
    expect([...kinds].sort()).toEqual(['listen', 'meaning', 'say']);
  });

  it('skips look-alike distractors (same meaning or same text)', () => {
    const twin = { ...phrase(1), key: 'kn:auto.99', lineId: 'auto.99' };
    const quiz = makeQuiz([phrase(1)], 1, {
      count: 1,
      canListen: false,
      distractors: [twin, ...POOL],
    });
    expect(quiz[0]!.options.some((o) => o.key === 'kn:auto.99')).toBe(false);
    expect(quiz[0]!.options).toHaveLength(4);
  });

  it('works with small pools', () => {
    const quiz = makeQuiz(POOL.slice(0, 2), 1, { count: 8, canListen: true });
    expect(quiz).toHaveLength(2);
    for (const q of quiz) expect(q.options).toHaveLength(2);
  });

  it('percent rounds and survives zero', () => {
    expect(percent(5, 8)).toBe(63);
    expect(percent(0, 0)).toBe(0);
  });
});
