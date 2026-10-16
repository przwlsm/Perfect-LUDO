/**
 * A writing system Akshar teaches, with its letters grouped the way a
 * primer teaches them. The data is plain and pure; every script needs a
 * native speaker's review before launch (docs/PLAN.md).
 *
 * Romanisation: the Indic scripts follow ISO 15919 letter values (ā, ṭ, ṇ,
 * ś, ṣ, ṛ…), with example words written as they are said (a final
 * unspoken "a" dropped in Hindi, Bengali, Gujarati and Punjabi). Urdu uses
 * the letters' common names and a simple romanisation with long vowels
 * marked.
 */
export type ScriptId =
  | 'devanagari'
  | 'tamil'
  | 'kannada'
  | 'telugu'
  | 'bengali'
  | 'gujarati'
  | 'gurmukhi'
  | 'malayalam'
  | 'urdu';

export type ScriptFont =
  | 'Baloo2'
  | 'BalooThambi2'
  | 'BalooTamma2'
  | 'BalooTammudu2'
  | 'BalooDa2'
  | 'BalooBhai2'
  | 'BalooPaaji2'
  | 'BalooChettan2'
  | 'BalooBhaijaan2';

export type GroupId = 'vowels' | 'consonants' | 'letters';

export interface Letter {
  /** One Unicode code point: what is traced. */
  readonly char: string;
  /** How the letter is read aloud, romanised (Urdu: the letter's name). */
  readonly translit: string;
  /** Urdu only: the sound the letter usually makes. */
  readonly sound?: string;
  /** An everyday word that contains the letter, usually starting with it. */
  readonly word: string;
  readonly wordTranslit: string;
  /** Key into the glossary of English meanings (i18n `glossary.<key>`). */
  readonly meaning: string;
}

export interface LetterGroup {
  readonly id: GroupId;
  readonly letters: readonly Letter[];
}

export interface Script {
  readonly id: ScriptId;
  /** The script's name written in itself. */
  readonly native: string;
  /** Speech voices to try, best first (BCP 47). */
  readonly voices: readonly string[];
  /** The Baloo 2 family drawn for this script (all SIL Open Font License). */
  readonly font: ScriptFont;
  /** "Well done!" in the script, with its romanisation: the three-star stamp. */
  readonly praise: readonly [string, string];
  readonly rtl: boolean;
  /** Unicode block the letters live in, for checks. */
  readonly block: readonly [number, number];
  readonly groups: readonly LetterGroup[];
}

/** A compact way to write a letter in the data files. */
export function letter(
  char: string,
  translit: string,
  word: string,
  wordTranslit: string,
  meaning: string,
  sound?: string,
): Letter {
  return sound === undefined
    ? { char, translit, word, wordTranslit, meaning }
    : { char, translit, sound, word, wordTranslit, meaning };
}

/** Every letter of a script in teaching order. */
export function lettersOf(script: Script): readonly Letter[] {
  return script.groups.flatMap((g) => g.letters);
}

/** A stable id for one letter across the app: `tamil:க`. */
export function letterKey(script: ScriptId, char: string): string {
  return `${script}:${char}`;
}
