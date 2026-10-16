import type { CardLanguage } from '@/domain/entities/Language';
import type { OccasionId } from '@/domain/entities/Occasion';
import { bn } from './bn';
import { en } from './en';
import { gu } from './gu';
import { hi } from './hi';
import { kn } from './kn';
import { mr } from './mr';
import { ta } from './ta';
import { te } from './te';
import type { LanguagePack, MessageSet } from './types';
import { ur } from './ur';

export type { LanguagePack, MessageSet } from './types';

/**
 * Original card words for every occasion, written for Utsav. English and
 * Hindi have the most; every pack other than English is marked "needs
 * native review" in docs/PLAN.md until a native speaker has read it.
 */
export const MESSAGES: Readonly<Record<CardLanguage, LanguagePack>> = {
  en,
  hi,
  mr,
  ta,
  te,
  kn,
  bn,
  gu,
  ur,
};

export function messagesFor(occasion: OccasionId, language: CardLanguage): MessageSet {
  return MESSAGES[language].occasions[occasion];
}

/** The sign-off line for a sender, or '' when there is no name. */
export function signOff(language: CardLanguage, name: string): string {
  const trimmed = name.trim();
  return trimmed ? MESSAGES[language].signOff.replace('{name}', trimmed) : '';
}

/**
 * The starting words for a new card. `seed` picks among the suggestions, so
 * different templates of one occasion do not all open with the same line.
 */
export function defaultWords(
  occasion: OccasionId,
  language: CardLanguage,
  seed = 0,
): { headline: string; message: string } {
  const set = messagesFor(occasion, language);
  const pick = <T>(list: readonly T[]) => list[Math.abs(seed) % list.length]!;
  return { headline: set.headlines[0]!, message: pick(set.messages) };
}

/**
 * The next suggestion after `current` (wrapping), for the "another line"
 * button. Unknown text starts from the first suggestion.
 */
export function nextSuggestion(list: readonly string[], current: string): string {
  if (list.length === 0) return current;
  const at = list.indexOf(current);
  return list[(at + 1) % list.length]!;
}
