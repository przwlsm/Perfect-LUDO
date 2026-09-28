import type { TextStyle } from 'react-native';

/**
 * Outfit, the design system's single typeface, one family name per weight.
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
} as const;

/**
 * The Outfit file for a style's weight. Custom fonts carry their weight in
 * the file, so the matching family is chosen here rather than asking the
 * platform to fake boldness on top of the regular file.
 */
export function familyForWeight(weight: TextStyle['fontWeight']): string {
  switch (String(weight ?? '400')) {
    case '900':
    case 'black':
      return FONT.black;
    case '800':
    case 'heavy':
      return FONT.extrabold;
    case '700':
    case 'bold':
      return FONT.bold;
    case '600':
    case 'semibold':
      return FONT.semibold;
    case '500':
    case 'medium':
      return FONT.medium;
    default:
      return FONT.regular;
  }
}
