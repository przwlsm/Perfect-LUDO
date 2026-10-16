/**
 * Diya has two lights. Night: deep violet sky, marigold gold. Dusk: a pale,
 * warm page with the board kept as a twilight window, so beams still glow.
 * Screens never write a raw colour; they read these tokens.
 *
 * Text colours meet WCAG AA (4.5:1) on `background`, `surface` and
 * `surfaceRaised` in both lights (checked in palette.test.ts).
 */
export interface Palette {
  readonly scheme: 'night' | 'dusk';
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
  readonly accent: string;
  readonly onAccent: string;
  /** Accent used as text on background and surfaces. */
  readonly accentText: string;
  readonly good: string;
  readonly danger: string;
  /** The home sky, top to bottom. */
  readonly sky: readonly [string, string, string];
  readonly star: string;
  readonly shadow: string;
}

export const NIGHT: Palette = {
  scheme: 'night',
  background: '#120a1f',
  surface: '#1d1231',
  surfaceRaised: '#291b43',
  glass: 'rgba(30, 18, 52, 0.72)',
  glassBorder: 'rgba(255, 214, 150, 0.16)',
  border: 'rgba(255, 226, 180, 0.11)',
  text: '#fff4e4',
  muted: '#d0bfdc',
  faint: '#8d78a6',
  accent: '#ffb53f',
  onAccent: '#2b1500',
  accentText: '#ffc965',
  good: '#7ce3b5',
  danger: '#ff9a9a',
  sky: ['#0b0616', '#1f0f36', '#43204f'],
  star: '#fff1d2',
  shadow: 'rgba(0, 0, 0, 0.5)',
};

export const DUSK: Palette = {
  scheme: 'dusk',
  background: '#fbf2e6',
  surface: '#ffffff',
  surfaceRaised: '#fff6ea',
  glass: 'rgba(255, 250, 242, 0.84)',
  glassBorder: 'rgba(70, 40, 90, 0.12)',
  border: 'rgba(70, 40, 90, 0.10)',
  text: '#2a1538',
  muted: '#5f4b6e',
  faint: '#9a88a6',
  accent: '#f2a23a',
  onAccent: '#2b1500',
  accentText: '#984700',
  good: '#167a5b',
  danger: '#b42318',
  sky: ['#ffe2c2', '#f8cfd6', '#d6d0f0'],
  star: '#ffffff',
  shadow: 'rgba(80, 40, 90, 0.18)',
};

export const FONTS = {
  display: 'Fraunces_600SemiBold',
  displayBold: 'Fraunces_700Bold',
  body: 'Nunito_500Medium',
  bodyBold: 'Nunito_700Bold',
  bodyHeavy: 'Nunito_800ExtraBold',
} as const;
