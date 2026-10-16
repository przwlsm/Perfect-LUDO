import type { ReviewCard } from '@/domain/entities/Progress';

/**
 * SM-2-lite spaced repetition. A phrase comes back for review the day you
 * miss it, then after 1, 3, then ~2.5× more days each time you know it.
 * "Hard" grows the gap gently and "Easy" leaps ahead. Days are local day
 * indices (see `dayIndex`), so a review is due all day, whatever the hour.
 */
export type Grade = 'again' | 'hard' | 'good' | 'easy';

export const START_EASE = 2.5;
export const MIN_EASE = 1.3;
export const MAX_EASE = 3;
export const MAX_INTERVAL = 180;

const clampEase = (e: number) => Math.min(MAX_EASE, Math.max(MIN_EASE, Math.round(e * 100) / 100));

/** A phrase newly added to review: due today. */
export function newCard(today: number): ReviewCard {
  return { ease: START_EASE, interval: 0, due: today, reps: 0, lapses: 0 };
}

export function grade(card: ReviewCard, g: Grade, today: number): ReviewCard {
  if (g === 'again') {
    return {
      ease: clampEase(card.ease - 0.2),
      interval: 0,
      due: today,
      reps: 0,
      lapses: card.lapses + 1,
    };
  }
  let interval: number;
  let ease = card.ease;
  if (g === 'hard') {
    interval = Math.max(1, Math.round(card.interval * 1.2));
    ease -= 0.15;
  } else if (g === 'good') {
    interval = card.reps === 0 ? 1 : card.reps === 1 ? 3 : Math.round(card.interval * card.ease);
  } else {
    interval = card.reps === 0 ? 3 : Math.round(Math.max(card.interval, 1) * card.ease * 1.3);
    ease += 0.15;
  }
  interval = Math.min(MAX_INTERVAL, Math.max(1, interval));
  return {
    ease: clampEase(ease),
    interval,
    due: today + interval,
    reps: card.reps + 1,
    lapses: card.lapses,
  };
}

/** Keys of cards due on `today` (or overdue), most overdue first. */
export function dueKeys(cards: Readonly<Record<string, ReviewCard>>, today: number): string[] {
  return Object.entries(cards)
    .filter(([, c]) => c.due <= today)
    .sort(([ka, a], [kb, b]) => a.due - b.due || ka.localeCompare(kb))
    .map(([k]) => k);
}

/**
 * The result of a quiz answer on the review deck: a miss puts the phrase
 * in review (due today); a hit moves an existing card on, and leaves
 * phrases that were never in review alone.
 */
export function afterAnswer(
  cards: Readonly<Record<string, ReviewCard>>,
  key: string,
  correct: boolean,
  today: number,
): Readonly<Record<string, ReviewCard>> {
  const card = cards[key];
  if (correct) {
    if (!card || card.due > today) return cards;
    return { ...cards, [key]: grade(card, 'good', today) };
  }
  return { ...cards, [key]: grade(card ?? newCard(today), 'again', today) };
}
