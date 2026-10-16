import { dailySeed } from 'app-kit';
import { yourPhrases } from '@/domain/content/catalogue';
import { LANG_IDS } from '@/domain/content/languages';
import type { LangId, Phrase, SceneId } from '@/domain/content/types';

/** Folds text for searching: lower case, no accents, hyphens or punctuation. */
export function fold(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[’'`-]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Also forgiving about doubled letters: "eli" finds "Ell-li", "hogbek" finds "hogbeku". */
function squeeze(s: string): string {
  return s.replace(/([a-z])\1+/g, '$1');
}

export interface SearchHit {
  readonly phrase: Phrase;
  /** Lower is better. */
  readonly rank: number;
}

/**
 * Searches English meanings (and Hindi ones, and the native text) and the
 * romanisation. Every word of the query must match somewhere.
 */
export function searchPhrases(phrases: readonly Phrase[], query: string): Phrase[] {
  const raw = query.trim();
  if (!raw) return [...phrases];
  const q = fold(raw);
  const words = q.split(' ').filter(Boolean);
  const hits: SearchHit[] = [];
  for (const p of phrases) {
    const en = fold(p.en);
    const roman = fold(p.roman);
    const romanSq = squeeze(roman);
    const native = p.native.includes(raw) || p.hi.includes(raw);
    const matchesWord = (w: string) =>
      en.includes(w) || roman.includes(w) || romanSq.includes(squeeze(w));
    if (!native && (words.length === 0 || !words.every(matchesWord))) continue;
    const rank =
      native || en.startsWith(q) || roman.startsWith(q)
        ? 0
        : en.includes(q) || roman.includes(q)
          ? 1
          : 2;
    hits.push({ phrase: p, rank });
  }
  return hits.sort((a, b) => a.rank - b.rank).map((h) => h.phrase);
}

/**
 * Today's phrase: the same for everyone learning the language today,
 * chosen from what you say in the free scenes.
 */
export function phraseOfTheDay(lang: LangId, scenes: readonly SceneId[], now: Date): Phrase | null {
  const pool = scenes.flatMap((s) => yourPhrases(lang, s));
  if (pool.length === 0) return null;
  const seed = dailySeed(now, LANG_IDS.indexOf(lang) + 1);
  return pool[seed % pool.length]!;
}

/** Rough spoken syllables in a romanised line (vowel groups). */
export function syllables(roman: string): number {
  return Math.max(1, (roman.toLowerCase().match(/[aeiouy]+/g) ?? []).length);
}

/**
 * How long to leave for the learner to say a line aloud (shadowing and
 * "Your turn"): enough for a beginner, never a rush.
 */
export function pauseFor(p: Pick<Phrase, 'roman'>, slow: boolean): number {
  const ms = 1600 + syllables(p.roman) * (slow ? 380 : 300);
  return Math.min(9000, Math.round(ms / 100) * 100);
}

/** How long a line stays highlighted when there is no voice to read it. */
export function readingTime(p: Pick<Phrase, 'roman'>): number {
  return Math.min(6000, 1200 + syllables(p.roman) * 260);
}
