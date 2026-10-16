/**
 * Kolam has two lights. Dawn: rice-flour white on dark wet earth, the hour
 * a kolam is drawn, with a marigold glow. Courtyard: a swept ochre and cream
 * courtyard in daylight, the line a deep red-brown. Screens never write a
 * raw colour; they read these tokens.
 *
 * Text tokens meet WCAG AA (4.5:1) on `background`, `surface` and
 * `surfaceRaised`, and numbers on the board floor (see palette.test.ts).
 */
export interface Palette {
  readonly scheme: 'dawn' | 'courtyard';
  readonly background: string;
  readonly surface: string;
  readonly surfaceRaised: string;
  readonly border: string;
  /** Translucent panel over the floor. */
  readonly glass: string;
  readonly glassBorder: string;
  readonly text: string;
  readonly muted: string;
  /** Decorative only (icons, rules); never body text. */
  readonly faint: string;
  /** Marigold by dawn, kumkum red in the courtyard: the main action. */
  readonly accent: string;
  readonly onAccent: string;
  /** Accent used as text on background and surfaces (contrast-safe). */
  readonly accentText: string;
  /** The second colour (kumkum by dawn, turmeric in the courtyard). */
  readonly second: string;
  readonly onSecond: string;
  readonly secondText: string;
  readonly successText: string;
  readonly danger: string;
  /** The home backdrop, top to bottom. */
  readonly sky: readonly [string, string, string];
  /** The board's floor, centre to edge. */
  readonly floor: readonly [string, string];
  /** Numbers on the board. */
  readonly clue: string;
  /** A number that has all its lines (quieter). */
  readonly clueDone: string;
  /** A number that can no longer be right. */
  readonly clueError: string;
  /** The "no line here" mark (the line colour is the theme's). */
  readonly cross: string;
  readonly hintGlow: string;
  /** Marigold petals. */
  readonly petals: readonly string[];
  readonly shadow: string;
  readonly scrim: string;
}

export const DAWN: Palette = {
  scheme: 'dawn',
  background: '#1b120c',
  surface: '#271a12',
  surfaceRaised: '#34241a',
  border: 'rgba(255, 228, 196, 0.11)',
  glass: 'rgba(39, 26, 18, 0.82)',
  glassBorder: 'rgba(255, 228, 196, 0.14)',
  text: '#f8efe2',
  muted: '#d6c4ae',
  faint: '#8b7461',
  accent: '#f4a01c',
  onAccent: '#2a1406',
  accentText: '#ffc163',
  second: '#ff8a65',
  onSecond: '#2a0c04',
  secondText: '#ffa486',
  successText: '#a6e3ad',
  danger: '#ff8f80',
  sky: ['#4a2b1c', '#25170f', '#160e09'],
  floor: ['#3a2519', '#1f140d'],
  clue: '#f5e8d4',
  clueDone: 'rgba(245, 232, 212, 0.4)',
  clueError: '#ff7262',
  cross: 'rgba(247, 240, 227, 0.42)',
  hintGlow: '#ffd27a',
  petals: ['#f4a01c', '#ff7b2e', '#ffc94a', '#e8562a'],
  shadow: 'rgba(6, 2, 0, 0.5)',
  scrim: 'rgba(12, 6, 2, 0.62)',
};

export const COURTYARD: Palette = {
  scheme: 'courtyard',
  background: '#f6ead3',
  surface: '#fdf7ea',
  surfaceRaised: '#f0e0c3',
  border: 'rgba(90, 40, 20, 0.13)',
  glass: 'rgba(253, 247, 234, 0.9)',
  glassBorder: 'rgba(90, 40, 20, 0.14)',
  text: '#381a0e',
  muted: '#664633',
  faint: '#b49676',
  accent: '#a83a17',
  onAccent: '#ffffff',
  accentText: '#9a3412',
  second: '#e3a21a',
  onSecond: '#2a1406',
  secondText: '#7a4b00',
  successText: '#2c6630',
  danger: '#b3261e',
  sky: ['#f8d9a4', '#f6e6cb', '#f6ead3'],
  floor: ['#f2e1c0', '#e3c99c'],
  clue: '#3a1a0e',
  clueDone: 'rgba(58, 26, 14, 0.36)',
  clueError: '#c22818',
  cross: 'rgba(123, 45, 26, 0.45)',
  hintGlow: '#e09a12',
  petals: ['#f4a01c', '#e8622a', '#ffc23a', '#d9481f'],
  shadow: 'rgba(90, 50, 20, 0.16)',
  scrim: 'rgba(40, 18, 8, 0.45)',
};

export const FONTS = {
  display: 'Fraunces_600SemiBold',
  displayBold: 'Fraunces_700Bold',
  body: 'Nunito_500Medium',
  bodyBold: 'Nunito_700Bold',
  bodyHeavy: 'Nunito_800ExtraBold',
} as const;
