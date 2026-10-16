/**
 * Quiet Atlas has two lights: Dusk (a deep indigo evening sky lit by
 * saffron lamps) and Dawn (warm paper under a peach sunrise). Screens never
 * write a raw colour; they read these tokens, so both schemes stay in step.
 *
 * Text colours meet WCAG AA (4.5:1) on `background` and `surface` in both.
 */
export interface Palette {
  readonly scheme: 'dusk' | 'dawn';
  readonly background: string;
  readonly surface: string;
  readonly surfaceRaised: string;
  /** Translucent glass over a toy or the sky. */
  readonly glass: string;
  readonly glassBorder: string;
  readonly border: string;
  readonly text: string;
  readonly muted: string;
  readonly faint: string;
  readonly accent: string;
  readonly onAccent: string;
  /** Accent used as text on background/surface (contrast-safe). */
  readonly accentText: string;
  readonly teal: string;
  readonly rose: string;
  readonly danger: string;
  /** Home sky, top to bottom. */
  readonly sky: readonly [string, string, string];
  readonly star: string;
  /** The globe's sea, edge glow and land dots. */
  readonly sea: readonly [string, string];
  readonly seaGlow: string;
  readonly land: string;
  readonly shadow: string;
}

export const DUSK: Palette = {
  scheme: 'dusk',
  background: '#0d0f22',
  surface: '#171a35',
  surfaceRaised: '#20244a',
  glass: 'rgba(16, 18, 40, 0.62)',
  glassBorder: 'rgba(255, 255, 255, 0.12)',
  border: 'rgba(255, 255, 255, 0.09)',
  text: '#f6f1e7',
  muted: '#b3b4d0',
  faint: '#7c7ea3',
  accent: '#ffb547',
  onAccent: '#2a1700',
  accentText: '#ffc46b',
  teal: '#62d6c6',
  rose: '#ff8aa6',
  danger: '#ff8f8f',
  sky: ['#0b0d20', '#231b4b', '#4a2b5f'],
  star: '#fff6dc',
  sea: ['#1d3a6e', '#0b1636'],
  seaGlow: 'rgba(120, 170, 255, 0.35)',
  land: '#ffd89a',
  shadow: 'rgba(0, 0, 0, 0.45)',
};

export const DAWN: Palette = {
  scheme: 'dawn',
  background: '#f8f2e7',
  surface: '#ffffff',
  surfaceRaised: '#fffaf1',
  glass: 'rgba(255, 252, 245, 0.78)',
  glassBorder: 'rgba(40, 30, 70, 0.10)',
  border: 'rgba(40, 30, 70, 0.10)',
  text: '#1f1b3a',
  muted: '#5c5878',
  faint: '#8d89a6',
  accent: '#f2a03d',
  onAccent: '#2a1700',
  accentText: '#a2560b',
  teal: '#1c8478',
  rose: '#c2416a',
  danger: '#b42318',
  sky: ['#fde3c4', '#f8d5dc', '#dbe7f8'],
  star: '#ffffff',
  sea: ['#8fc3f0', '#4f86c6'],
  seaGlow: 'rgba(255, 255, 255, 0.7)',
  land: '#fff4dc',
  shadow: 'rgba(60, 40, 80, 0.18)',
};

export const FONTS = {
  display: 'Fraunces_600SemiBold',
  displayBold: 'Fraunces_700Bold',
  body: 'Nunito_500Medium',
  bodyBold: 'Nunito_700Bold',
  bodyHeavy: 'Nunito_800ExtraBold',
} as const;
