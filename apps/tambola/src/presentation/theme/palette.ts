/**
 * Tambola Party has two lights. Night is a festive evening: deep plum and
 * indigo lit by marigold lamps and pink fairy lights. Day is warm cream
 * paper printed in magenta and gold, like a ticket book. Screens never write
 * a raw colour; they read these tokens.
 *
 * Text tokens meet WCAG AA (4.5:1) on `background`, `surface` and
 * `surfaceRaised` in both lights (see palette.test.ts).
 */
export interface Palette {
  readonly scheme: 'night' | 'day';
  readonly background: string;
  readonly surface: string;
  readonly surfaceRaised: string;
  readonly border: string;
  /** Translucent panel over the festive backdrop. */
  readonly glass: string;
  readonly glassBorder: string;
  readonly text: string;
  readonly muted: string;
  /** Decorative only (icons, rules); never body text. */
  readonly faint: string;
  /** The main action colour and the text that sits on it. */
  readonly accent: string;
  readonly onAccent: string;
  /** Accent used as text on background/surface (contrast-safe). */
  readonly accentText: string;
  /** The second festive colour (pink at night, gold by day). */
  readonly second: string;
  readonly onSecond: string;
  readonly secondText: string;
  readonly success: string;
  readonly successText: string;
  readonly danger: string;
  /** Backdrop gradient, top to bottom. */
  readonly sky: readonly [string, string, string];
  /** Fairy-light bulbs. */
  readonly bulbs: readonly string[];
  readonly wire: string;
  /** The 1–90 board. */
  readonly boardIdle: string;
  readonly boardIdleText: string;
  readonly boardLit: string;
  readonly boardLitText: string;
  readonly shadow: string;
  readonly scrim: string;
}

export const NIGHT: Palette = {
  scheme: 'night',
  background: '#1a0a29',
  surface: '#26113a',
  surfaceRaised: '#341a4c',
  border: 'rgba(255, 214, 170, 0.13)',
  glass: 'rgba(38, 17, 58, 0.78)',
  glassBorder: 'rgba(255, 214, 170, 0.16)',
  text: '#fff4e6',
  muted: '#d6c2dc',
  faint: '#8f7a9e',
  accent: '#ffb627',
  onAccent: '#2a1238',
  accentText: '#ffc95c',
  second: '#ff5d9e',
  onSecond: '#2a0716',
  secondText: '#ff8fbd',
  success: '#4dd6a6',
  successText: '#6fe3bb',
  danger: '#ff8f8f',
  sky: ['#33104d', '#1f0a33', '#140620'],
  bulbs: ['#ffd166', '#ff5d8f', '#4dd6c4', '#ffb627', '#c58bff', '#ff8a3d'],
  wire: 'rgba(245, 212, 138, 0.45)',
  boardIdle: '#2e1644',
  boardIdleText: '#bfa9cc',
  boardLit: '#ffb627',
  boardLitText: '#2a1238',
  shadow: 'rgba(5, 0, 12, 0.5)',
  scrim: 'rgba(10, 2, 20, 0.62)',
};

export const DAY: Palette = {
  scheme: 'day',
  background: '#fbf3e4',
  surface: '#fffaf2',
  surfaceRaised: '#f5e8d2',
  border: 'rgba(110, 30, 70, 0.13)',
  glass: 'rgba(255, 250, 242, 0.86)',
  glassBorder: 'rgba(110, 30, 70, 0.14)',
  text: '#2a1238',
  muted: '#62445c',
  faint: '#b49aa8',
  accent: '#b0174f',
  onAccent: '#ffffff',
  accentText: '#a3134a',
  second: '#e9a813',
  onSecond: '#2a1238',
  secondText: '#7d5000',
  success: '#12806a',
  successText: '#0d6e5a',
  danger: '#b42318',
  sky: ['#ffe9c7', '#fbefdc', '#fbf3e4'],
  bulbs: ['#e9a813', '#d81b60', '#1f9e8a', '#ff8a3d', '#8e44ad', '#e0457b'],
  wire: 'rgba(120, 60, 40, 0.35)',
  boardIdle: '#f2e3c9',
  boardIdleText: '#6d5466',
  boardLit: '#b0174f',
  boardLitText: '#ffffff',
  shadow: 'rgba(90, 40, 60, 0.16)',
  scrim: 'rgba(40, 10, 30, 0.45)',
};

export const FONTS = {
  display: 'Fredoka_600SemiBold',
  displayBold: 'Fredoka_700Bold',
  body: 'Nunito_500Medium',
  bodyBold: 'Nunito_700Bold',
  bodyHeavy: 'Nunito_800ExtraBold',
  /** Devanagari (Hindi number words). */
  hindi: 'Baloo2_700Bold',
} as const;

/** Ball colours by column (1–9, 10–19, … 80–90), like a real Tambola set. */
export const BALL_COLORS: readonly (readonly [string, string])[] = [
  ['#ff5d5d', '#b3202a'],
  ['#ff9f43', '#c25a0a'],
  ['#ffd166', '#c98a00'],
  ['#5ed39a', '#1b8a55'],
  ['#4dc9f0', '#1678a8'],
  ['#6c8cff', '#3048b8'],
  ['#b07cff', '#6a35c4'],
  ['#ff6fb5', '#b81f6e'],
  ['#ffb627', '#c2410c'],
];
