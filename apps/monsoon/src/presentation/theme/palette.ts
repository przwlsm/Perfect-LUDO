/**
 * Monsoon Fields has two lights. Dusk: a stormy evening, slate-teal clouds
 * and silver rain. Morning: a bright monsoon morning, mist and new green.
 * Screens never write a raw colour; they read these tokens.
 *
 * Text colours meet WCAG AA (4.5:1) on `background`, `surface` and
 * `surfaceRaised` in both lights (checked in palette.test.ts).
 */
export interface Palette {
  readonly scheme: 'dusk' | 'morning';
  readonly background: string;
  readonly surface: string;
  readonly surfaceRaised: string;
  /** Translucent glass over the sky. */
  readonly glass: string;
  readonly glassBorder: string;
  readonly border: string;
  readonly text: string;
  readonly muted: string;
  /** Decorative only (icons, rules), never body text. */
  readonly faint: string;
  /** Young rice green: buttons and highlights. */
  readonly accent: string;
  readonly onAccent: string;
  /** Accent used as text on background and surfaces. */
  readonly accentText: string;
  /** Rain water, as text and icons. */
  readonly water: string;
  /** The cloud budget, as text and icons. */
  readonly cloud: string;
  /** Stars and hints: decorative gold, never body text. */
  readonly gold: string;
  readonly good: string;
  readonly danger: string;
  /** The sky behind the home screen, top to bottom. */
  readonly sky: readonly [string, string, string];
  readonly cloudFill: string;
  readonly rain: string;
  readonly shadow: string;
}

export const DUSK: Palette = {
  scheme: 'dusk',
  background: '#0c1a1d',
  surface: '#13272a',
  surfaceRaised: '#1b3437',
  glass: 'rgba(19, 39, 42, 0.76)',
  glassBorder: 'rgba(190, 232, 220, 0.16)',
  border: 'rgba(200, 236, 226, 0.11)',
  text: '#eef7f2',
  muted: '#b3cbc3',
  faint: '#6c8b84',
  accent: '#9ad468',
  onAccent: '#0f260b',
  accentText: '#b1e388',
  water: '#8ccfff',
  cloud: '#c9d8e4',
  gold: '#ffcf5a',
  good: '#8fe3b0',
  danger: '#ffa294',
  sky: ['#081214', '#152a2f', '#2e444a'],
  cloudFill: '#3a5157',
  rain: 'rgba(214, 230, 240, 0.5)',
  shadow: 'rgba(0, 0, 0, 0.5)',
};

export const MORNING: Palette = {
  scheme: 'morning',
  background: '#edf5f0',
  surface: '#ffffff',
  surfaceRaised: '#f1f7f2',
  glass: 'rgba(255, 255, 255, 0.84)',
  glassBorder: 'rgba(20, 64, 52, 0.12)',
  border: 'rgba(20, 64, 52, 0.10)',
  text: '#10302a',
  muted: '#43605a',
  faint: '#93aaa3',
  accent: '#7cc35a',
  onAccent: '#0d2a0b',
  accentText: '#2c722b',
  water: '#1d6fa8',
  cloud: '#4a6272',
  gold: '#f0ad1c',
  good: '#15734c',
  danger: '#b42318',
  sky: ['#c4e2ef', '#e2f0ea', '#f6f2df'],
  cloudFill: '#ffffff',
  rain: 'rgba(60, 110, 140, 0.32)',
  shadow: 'rgba(20, 64, 52, 0.16)',
};

export const FONTS = {
  display: 'Fredoka_600SemiBold',
  displayBold: 'Fredoka_700Bold',
  body: 'Nunito_500Medium',
  bodyBold: 'Nunito_700Bold',
  bodyHeavy: 'Nunito_800ExtraBold',
} as const;
