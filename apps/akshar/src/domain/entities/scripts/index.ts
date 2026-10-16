import type { Letter, Script, ScriptId } from '../Script';
import { lettersOf } from '../Script';
import { BENGALI } from './bengali';
import { DEVANAGARI } from './devanagari';
import { GUJARATI } from './gujarati';
import { GURMUKHI } from './gurmukhi';
import { KANNADA } from './kannada';
import { MALAYALAM } from './malayalam';
import { TAMIL } from './tamil';
import { TELUGU } from './telugu';
import { URDU } from './urdu';

/** Every script, in the order the picker shows them. */
export const SCRIPTS: readonly Script[] = [
  DEVANAGARI,
  TAMIL,
  KANNADA,
  TELUGU,
  BENGALI,
  GUJARATI,
  GURMUKHI,
  MALAYALAM,
  URDU,
];

export const SCRIPT_IDS: readonly ScriptId[] = SCRIPTS.map((s) => s.id);

export function isScriptId(v: unknown): v is ScriptId {
  return typeof v === 'string' && (SCRIPT_IDS as readonly string[]).includes(v);
}

export function scriptById(id: ScriptId): Script {
  return SCRIPTS.find((s) => s.id === id)!;
}

/** The letter at `index` in teaching order, or undefined past the end. */
export function letterAt(id: ScriptId, index: number): Letter | undefined {
  return lettersOf(scriptById(id))[index];
}
