/**
 * Utsav has two lights. Night: a rich aubergine-maroon evening lit with
 * gold. Ivory: warm paper with saffron and magenta. Screens never write a
 * raw colour; they read these tokens so both stay in step.
 *
 * Text colours meet WCAG AA (4.5:1) on `background`, `surface` and
 * `surfaceRaised` in both (checked in palette.test.ts).
 */
export interface Palette {
  readonly scheme: 'night' | 'ivory';
  readonly background: string;
  readonly surface: string;
  readonly surfaceRaised: string;
  /** Translucent glass over a card or a glow. */
  readonly glass: string;
  readonly glassBorder: string;
  /** A bar pinned over scrolling content: opaque, so words behind never show through. */
  readonly bar: string;
  readonly border: string;
  readonly text: string;
  readonly muted: string;
  readonly faint: string;
  /** Buttons and selection. */
  readonly accent: string;
  readonly onAccent: string;
  /** Accent used as text on background/surface. */
  readonly accentText: string;
  /** The second festive colour (magenta), as text. */
  readonly magentaText: string;
  readonly success: string;
  readonly danger: string;
  /** The soft glow behind the home header, top to bottom. */
  readonly glow: readonly [string, string];
  readonly shadow: string;
  /** Placeholder behind a card still being drawn. */
  readonly shimmer: string;
}

export const NIGHT: Palette = {
  scheme: 'night',
  background: '#1a0a14',
  surface: '#26111f',
  surfaceRaised: '#331828',
  glass: 'rgba(26, 10, 20, 0.72)',
  glassBorder: 'rgba(255, 214, 150, 0.16)',
  bar: '#1a0a14',
  border: 'rgba(255, 214, 150, 0.12)',
  text: '#fbf1e4',
  muted: '#d6bfca',
  faint: '#a88d9b',
  accent: '#f2b84b',
  onAccent: '#2a1500',
  accentText: '#ffcd6e',
  magentaText: '#ff8fbd',
  success: '#86dcb8',
  danger: '#ff9a9a',
  glow: ['#4d1534', '#1a0a14'],
  shadow: 'rgba(0, 0, 0, 0.5)',
  shimmer: '#2e1525',
};

export const IVORY: Palette = {
  scheme: 'ivory',
  background: '#fff8ee',
  surface: '#ffffff',
  surfaceRaised: '#fff1df',
  glass: 'rgba(255, 250, 242, 0.84)',
  glassBorder: 'rgba(120, 50, 20, 0.12)',
  bar: '#fff8ee',
  border: 'rgba(120, 50, 20, 0.12)',
  text: '#2b1418',
  muted: '#664a4d',
  faint: '#8f7673',
  accent: '#f08a24',
  onAccent: '#2a1200',
  accentText: '#a34a00',
  magentaText: '#a3124f',
  success: '#1d7a55',
  danger: '#b42318',
  glow: ['#ffe1c2', '#fff8ee'],
  shadow: 'rgba(110, 50, 30, 0.16)',
  shimmer: '#f6e7d6',
};

export const FONTS = {
  display: 'Fraunces_600SemiBold',
  displayBold: 'Fraunces_700Bold',
  body: 'Nunito_500Medium',
  bodyBold: 'Nunito_700Bold',
  bodyHeavy: 'Nunito_800ExtraBold',
  /** The wordmark. */
  brand: 'YatraOne_400Regular',
} as const;
