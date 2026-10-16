import type { ScriptFont } from '@/domain/entities/Script';

/**
 * The Baloo 2 family files, one SemiBold per script (SIL Open Font
 * License 1.1). The same files are loaded twice: by expo-font for
 * ordinary text, and by Skia for the outlines the learner traces.
 */
export const SCRIPT_FONT_FILES: Readonly<Record<ScriptFont, number>> = {
  Baloo2: require('@expo-google-fonts/baloo-2/600SemiBold/Baloo2_600SemiBold.ttf'),
  BalooThambi2: require('@expo-google-fonts/baloo-thambi-2/600SemiBold/BalooThambi2_600SemiBold.ttf'),
  BalooTamma2: require('@expo-google-fonts/baloo-tamma-2/600SemiBold/BalooTamma2_600SemiBold.ttf'),
  BalooTammudu2: require('@expo-google-fonts/baloo-tammudu-2/600SemiBold/BalooTammudu2_600SemiBold.ttf'),
  BalooDa2: require('@expo-google-fonts/baloo-da-2/600SemiBold/BalooDa2_600SemiBold.ttf'),
  BalooBhai2: require('@expo-google-fonts/baloo-bhai-2/600SemiBold/BalooBhai2_600SemiBold.ttf'),
  BalooPaaji2: require('@expo-google-fonts/baloo-paaji-2/600SemiBold/BalooPaaji2_600SemiBold.ttf'),
  BalooChettan2: require('@expo-google-fonts/baloo-chettan-2/600SemiBold/BalooChettan2_600SemiBold.ttf'),
  BalooBhaijaan2: require('@expo-google-fonts/baloo-bhaijaan-2/600SemiBold/BalooBhaijaan2_600SemiBold.ttf'),
};

/** The font family name expo-font registers each file under. */
export function scriptFamily(font: ScriptFont): string {
  return `${font}_600SemiBold`;
}

/** Everything expo-font loads at start: the script faces under their family names. */
export const SCRIPT_FONT_MAP: Readonly<Record<string, number>> = Object.fromEntries(
  Object.entries(SCRIPT_FONT_FILES).map(([font, file]) => [scriptFamily(font as ScriptFont), file]),
);

/** Outlines are read at this size; 1 font unit is then about 1 px. */
export const OUTLINE_SIZE = 1000;
