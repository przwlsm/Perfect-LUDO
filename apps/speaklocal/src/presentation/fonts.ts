import { LANGUAGES, type ScriptFont } from '@/domain/content/languages';
import type { LangId } from '@/domain/content/types';

/**
 * The Baloo 2 family faces, one per script (SIL Open Font License 1.1):
 * loaded by expo-font for ordinary text and by Skia for shared phrase cards.
 */
export const SCRIPT_FONT_FILES: Readonly<Record<ScriptFont, number>> = {
  Baloo2: require('@expo-google-fonts/baloo-2/600SemiBold/Baloo2_600SemiBold.ttf'),
  BalooTamma2: require('@expo-google-fonts/baloo-tamma-2/600SemiBold/BalooTamma2_600SemiBold.ttf'),
  BalooThambi2: require('@expo-google-fonts/baloo-thambi-2/600SemiBold/BalooThambi2_600SemiBold.ttf'),
  BalooTammudu2: require('@expo-google-fonts/baloo-tammudu-2/600SemiBold/BalooTammudu2_600SemiBold.ttf'),
  BalooDa2: require('@expo-google-fonts/baloo-da-2/600SemiBold/BalooDa2_600SemiBold.ttf'),
  BalooChettan2: require('@expo-google-fonts/baloo-chettan-2/600SemiBold/BalooChettan2_600SemiBold.ttf'),
};

/** The family name expo-font registers each face under. */
export function scriptFamily(font: ScriptFont): string {
  return `${font}_600SemiBold`;
}

export function familyFor(lang: LangId): string {
  return scriptFamily(LANGUAGES[lang].font);
}

/** Everything expo-font loads at start for the scripts. */
export const SCRIPT_FONT_MAP: Readonly<Record<string, number>> = Object.fromEntries(
  Object.entries(SCRIPT_FONT_FILES).map(([font, file]) => [scriptFamily(font as ScriptFont), file]),
);
