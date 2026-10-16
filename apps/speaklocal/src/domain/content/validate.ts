import { LANGUAGES } from './languages';
import type { Entry, LangId } from './types';

/**
 * The rules every line of content keeps, as code, so tests (and the people
 * writing content) find mistakes before a learner does.
 *
 * Romanisation scheme (all languages): plain ASCII letters that read the
 * way Indians already type their languages in chats. Long vowels doubled
 * (aa, ee, oo), no diacritics, hyphens to split a long word into chunks
 * you can say ("Ell-li hog-beku?"), the same words as the native line, and
 * the same sentence punctuation.
 */

const ZWJ = 0x200d;
const ZWNJ = 0x200c;
const DANDA = 0x0964;
const DOUBLE_DANDA = 0x0965;
/** Punctuation allowed in native text besides the script itself. */
const NATIVE_PUNCT = new Set([
  ' ',
  ',',
  '.',
  '?',
  '!',
  '-',
  '‘',
  '’',
  '“',
  '”',
  "'",
  '"',
  ':',
  '…',
]);

const ROMAN = /^[A-Za-z][A-Za-z' ,.?!-]*$/;

function inBlock(cp: number, [lo, hi]: readonly [number, number]): boolean {
  return cp >= lo && cp <= hi;
}

/** Characters of `text` that do not belong in `lang`'s native script. */
export function strayNativeChars(lang: LangId, text: string): string[] {
  const { block } = LANGUAGES[lang];
  const stray: string[] = [];
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    if (inBlock(cp, block) || cp === ZWJ || cp === ZWNJ || NATIVE_PUNCT.has(ch)) {
      // Native digits are not used: numbers are written as words, as they are said.
      const digit = cp >= block[0] + 0x66 && cp <= block[0] + 0x6f;
      if (digit) stray.push(ch);
      continue;
    }
    if (cp === DANDA || cp === DOUBLE_DANDA) continue;
    stray.push(ch);
  }
  return stray;
}

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean);

/** The sentence-ending mark of a line, normalised (danda counts as a full stop). */
export function endMark(s: string): '?' | '!' | '.' | '' {
  const last = s.trim().slice(-1);
  if (last === '?' || last === '!') return last;
  if (last === '.' || last === '।') return '.';
  return '';
}

const count = (s: string, re: RegExp) => (s.match(re) ?? []).length;

/** Every problem with one entry; empty when it is fine. */
export function entryProblems(lang: LangId, id: string, entry: Entry): string[] {
  const [native, roman, extra] = entry;
  const p: string[] = [];
  const at = `${lang} ${id}`;
  if (!native.trim()) p.push(`${at}: empty native text`);
  if (!roman.trim()) p.push(`${at}: empty romanisation`);
  if (native !== native.trim() || /\s{2,}/.test(native)) p.push(`${at}: stray spaces in native`);
  if (roman !== roman.trim() || /\s{2,}/.test(roman)) p.push(`${at}: stray spaces in romanisation`);
  const stray = strayNativeChars(lang, native);
  if (stray.length)
    p.push(`${at}: characters outside the script: ${[...new Set(stray)].join(' ')}`);
  if (!ROMAN.test(roman))
    p.push(`${at}: romanisation must be plain letters and , . ? ! ' - (“${roman}”)`);
  if (!/^[A-Z]/.test(roman)) p.push(`${at}: romanisation starts with a capital (“${roman}”)`);
  if (/(^|\s)-|-($|[\s,.?!])|--/.test(roman))
    p.push(`${at}: hyphen must sit inside a word (“${roman}”)`);
  if (/([aeiou])\1\1/i.test(roman)) p.push(`${at}: tripled vowel (“${roman}”)`);
  const nw = words(native).length;
  const rw = words(roman).length;
  if (nw !== rw) p.push(`${at}: ${nw} native words but ${rw} romanised (“${native}” / “${roman}”)`);
  if (endMark(native) !== endMark(roman))
    p.push(`${at}: ending punctuation differs (“${native}” / “${roman}”)`);
  if (count(native, /\?/g) !== count(roman, /\?/g)) p.push(`${at}: question marks differ`);
  if (count(native, /!/g) !== count(roman, /!/g)) p.push(`${at}: exclamation marks differ`);
  if (count(native, /[.।]/g) !== count(roman, /\./g)) p.push(`${at}: full stops differ`);
  // A new sentence inside a line starts with a capital, as the first does.
  for (const m of roman.matchAll(/[.?!]\s+(\S)/g)) {
    if (!/[A-Z]/.test(m[1]!)) p.push(`${at}: capital after a sentence end (“${roman}”)`);
  }
  if (extra) {
    if (extra.note !== undefined && !/^[A-Z‘“'"]/.test(extra.note.trim()))
      p.push(`${at}: note should be a sentence`);
    if (extra.note !== undefined && extra.note.trim().length < 8) p.push(`${at}: note too short`);
    if ((extra.en === undefined) !== (extra.hi === undefined))
      p.push(`${at}: an English override needs its Hindi twin (and back)`);
    if (extra.en !== undefined && !extra.en.trim()) p.push(`${at}: empty English override`);
    if (extra.hi !== undefined && strayNativeChars('hi', extra.hi).length)
      p.push(`${at}: Hindi override must be in Devanagari`);
  }
  return p;
}
