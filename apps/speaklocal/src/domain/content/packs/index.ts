import type { LangId, LanguagePack } from '../types';
import { BENGALI } from './bengali';
import { HINDI } from './hindi';
import { KANNADA } from './kannada';
import { MALAYALAM } from './malayalam';
import { MARATHI } from './marathi';
import { TAMIL } from './tamil';
import { TELUGU } from './telugu';

/** Every language's lines. Each pack must cover every scene (content.test.ts checks). */
export const PACKS_BY_LANG: Readonly<Record<LangId, LanguagePack>> = {
  kn: KANNADA,
  ta: TAMIL,
  te: TELUGU,
  mr: MARATHI,
  bn: BENGALI,
  ml: MALAYALAM,
  hi: HINDI,
};
