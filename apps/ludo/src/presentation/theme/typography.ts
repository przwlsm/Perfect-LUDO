import type { TextStyle } from 'react-native';
import type { Script } from '../i18n/languages';

type Weight = 'regular' | 'medium' | 'semibold' | 'bold' | 'extrabold' | 'black';

/**
 * Outfit, the design system's Latin typeface, one family name per weight.
 * These are the keys the fonts are registered under in the root layout, so
 * they are the same on Android, iOS and web.
 */
export const FONT = {
  regular: 'Outfit_400Regular',
  medium: 'Outfit_500Medium',
  semibold: 'Outfit_600SemiBold',
  bold: 'Outfit_700Bold',
  extrabold: 'Outfit_800ExtraBold',
  black: 'Outfit_900Black',
} as const satisfies Record<Weight, string>;

/**
 * A Baloo family bundled in three weights (400, 600, 800) to keep the app
 * small: regular and medium share 400, semibold and bold share 600, and the
 * two heaviest share 800. Headings, buttons and body text stay distinct.
 */
function threeWeights(family: string): Record<Weight, string> {
  return {
    regular: `${family}_400Regular`,
    medium: `${family}_400Regular`,
    semibold: `${family}_600SemiBold`,
    bold: `${family}_600SemiBold`,
    extrabold: `${family}_800ExtraBold`,
    black: `${family}_800ExtraBold`,
  };
}

/**
 * Per writing system, the family for each weight. Baloo 2 is a rounded,
 * playful face with Latin and Devanagari designed together, so a Hindi
 * screen keeps one consistent voice (numbers and brand words included). Its
 * sister families draw the other scripts in the same style. Hindi, the
 * largest audience after English, keeps all five weights; Baloo stops at
 * 800, so "black" maps to its heaviest cut.
 */
export const FONTS_BY_SCRIPT: Record<Script, Record<Weight, string>> = {
  latin: FONT,
  devanagari: {
    regular: 'Baloo2_400Regular',
    medium: 'Baloo2_500Medium',
    semibold: 'Baloo2_600SemiBold',
    bold: 'Baloo2_700Bold',
    extrabold: 'Baloo2_800ExtraBold',
    black: 'Baloo2_800ExtraBold',
  },
  bengali: threeWeights('BalooDa2'),
  tamil: threeWeights('BalooThambi2'),
  telugu: threeWeights('BalooTammudu2'),
  gujarati: threeWeights('BalooBhai2'),
  kannada: threeWeights('BalooTamma2'),
  arabic: threeWeights('BalooBhaijaan2'),
};

/**
 * Size and spacing adjustments per script, applied on top of each style.
 * Indic marks sit above and below the line, so those scripts need more line
 * height than Latin at the same size; Baloo also draws larger than Outfit.
 * Tamil and Telugu words run long, so they are set a touch smaller.
 */
export const SCRIPT_METRICS: Record<Script, { fontScale: number; lineHeightScale: number }> = {
  latin: { fontScale: 1, lineHeightScale: 1 },
  devanagari: { fontScale: 0.94, lineHeightScale: 1.22 },
  bengali: { fontScale: 0.94, lineHeightScale: 1.22 },
  gujarati: { fontScale: 0.94, lineHeightScale: 1.2 },
  kannada: { fontScale: 0.92, lineHeightScale: 1.25 },
  telugu: { fontScale: 0.9, lineHeightScale: 1.25 },
  tamil: { fontScale: 0.88, lineHeightScale: 1.2 },
  arabic: { fontScale: 0.95, lineHeightScale: 1.18 },
};

/** Tracked uppercase labels, set in a script without case, grow by this much. */
const LABEL_SCALE = 1.12;

function weightOf(weight: TextStyle['fontWeight']): Weight {
  switch (String(weight ?? '400')) {
    case '900':
    case 'black':
      return 'black';
    case '800':
    case 'heavy':
      return 'extrabold';
    case '700':
    case 'bold':
      return 'bold';
    case '600':
    case 'semibold':
      return 'semibold';
    case '500':
    case 'medium':
      return 'medium';
    default:
      return 'regular';
  }
}

/**
 * The font file for a style's weight in a given script. Custom fonts carry
 * their weight in the file, so the matching family is chosen here rather than
 * asking the platform to fake boldness on top of the regular file.
 */
export function familyForWeight(weight: TextStyle['fontWeight'], script: Script = 'latin'): string {
  return FONTS_BY_SCRIPT[script][weightOf(weight)];
}

/**
 * The style overrides that render `flat` in `script`: the right family, the
 * weight cleared (it lives in the file), and size/line height adjusted.
 */
export function scriptTextStyle(flat: TextStyle, script: Script): TextStyle {
  const { fontScale, lineHeightScale } = SCRIPT_METRICS[script];
  const style: TextStyle = {
    fontFamily: familyForWeight(flat.fontWeight, script),
    fontWeight: 'normal',
  };
  if (script === 'latin') return style;
  // Tracking pulls apart the headline (shirorekha) that joins Devanagari
  // letters, so the wide-spaced uppercase labels lose it in other scripts.
  // Those small labels get their weight from capitals and tracking in Latin;
  // scripts without case need a little more size instead to stay legible.
  const label = Boolean(flat.letterSpacing);
  const scale = label ? LABEL_SCALE : fontScale;
  if (label) style.letterSpacing = 0;
  if (typeof flat.fontSize === 'number') style.fontSize = flat.fontSize * scale;
  if (typeof flat.lineHeight === 'number') {
    style.lineHeight = flat.lineHeight * scale * lineHeightScale;
  }
  return style;
}
