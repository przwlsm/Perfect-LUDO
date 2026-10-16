/**
 * Chai Sort has two lights. Evening: a stall after dark, string lights over
 * a wooden counter, marigold accents. Morning: sun on a terracotta counter,
 * cream walls. Screens never write a raw colour; they read these tokens.
 *
 * Text colours meet WCAG AA (4.5:1) on `background`, `surface` and
 * `surfaceRaised` in both lights (checked in palette.test.ts).
 */
export interface Palette {
  readonly scheme: 'evening' | 'morning';
  readonly background: string;
  readonly surface: string;
  readonly surfaceRaised: string;
  /** Translucent card over the stall scene. */
  readonly glass: string;
  readonly glassBorder: string;
  readonly border: string;
  readonly text: string;
  readonly muted: string;
  /** Decorative only (icons, rules), never body text. */
  readonly faint: string;
  readonly accent: string;
  readonly onAccent: string;
  /** Accent used as text on background and surfaces. */
  readonly accentText: string;
  readonly good: string;
  readonly danger: string;
  readonly shadow: string;
  /** The stall behind the counter, top to bottom. */
  readonly sky: readonly [string, string, string];
  /** The counter the cups stand on: top edge, face, shadow line. */
  readonly counter: readonly [string, string, string];
  /** String-light bulbs (evening) or the sun's glow (morning). */
  readonly glow: string;
  /** Steam over a finished cup. */
  readonly steam: string;
}

export const EVENING: Palette = {
  scheme: 'evening',
  background: '#1a100a',
  surface: '#271910',
  surfaceRaised: '#342217',
  glass: 'rgba(39, 25, 16, 0.82)',
  glassBorder: 'rgba(255, 210, 160, 0.16)',
  border: 'rgba(255, 220, 180, 0.12)',
  text: '#fff3e3',
  muted: '#dcc5ad',
  faint: '#8c7360',
  accent: '#f2a541',
  onAccent: '#2a1400',
  accentText: '#ffc673',
  good: '#93dcae',
  danger: '#ffa08c',
  shadow: 'rgba(0, 0, 0, 0.5)',
  sky: ['#120a10', '#25131b', '#3a1f1a'],
  counter: ['#8a4e2c', '#5c321c', '#2c170c'],
  glow: '#ffd27a',
  steam: 'rgba(255, 244, 228, 0.55)',
};

export const MORNING: Palette = {
  scheme: 'morning',
  background: '#fbf1e4',
  surface: '#ffffff',
  surfaceRaised: '#fff4e7',
  glass: 'rgba(255, 249, 240, 0.88)',
  glassBorder: 'rgba(120, 60, 20, 0.14)',
  border: 'rgba(120, 60, 20, 0.11)',
  text: '#2d170a',
  muted: '#664330',
  faint: '#b49377',
  accent: '#c4531d',
  onAccent: '#ffffff',
  accentText: '#a3400f',
  good: '#1c7448',
  danger: '#b42318',
  shadow: 'rgba(120, 60, 20, 0.16)',
  sky: ['#fff3dc', '#ffe3bd', '#f9cfa0'],
  counter: ['#e08a5c', '#c4673b', '#8e4322'],
  glow: '#fff1c4',
  steam: 'rgba(150, 105, 75, 0.5)',
};

export const FONTS = {
  display: 'Fredoka_600SemiBold',
  displayBold: 'Fredoka_700Bold',
  body: 'Nunito_500Medium',
  bodyBold: 'Nunito_700Bold',
  bodyHeavy: 'Nunito_800ExtraBold',
} as const;
