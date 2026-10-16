/**
 * Akshar's two lights: Paper (cream writing paper, deep indigo ink, a
 * marigold accent) and Slate (a chalk slate, chalk-white writing, a warm
 * chalk-yellow accent). Screens never write a raw colour; they read these
 * tokens. Text colours meet WCAG AA (4.5:1) on `background` and `surface`
 * in both (checked in palette.test.ts).
 */
export interface Palette {
  readonly scheme: 'paper' | 'slate';
  readonly background: string;
  readonly surface: string;
  readonly surfaceRaised: string;
  readonly border: string;
  readonly glass: string;
  readonly glassBorder: string;
  readonly text: string;
  readonly muted: string;
  readonly faint: string;
  /** Buttons and selected things. */
  readonly accent: string;
  readonly onAccent: string;
  /** The accent as text on background/surface (contrast-safe). */
  readonly accentText: string;
  /** Stars and gentle highlights. */
  readonly star: string;
  readonly starEmpty: string;
  /** The three-star stamp and the odd warm word. */
  readonly vermilion: string;
  readonly success: string;
  readonly danger: string;
  readonly shadow: string;
  /** Soft tints behind script cards, one per script in picker order. */
  readonly tints: readonly string[];
}

export const PAPER: Palette = {
  scheme: 'paper',
  background: '#f6efe2',
  surface: '#fffaf1',
  surfaceRaised: '#f9f1e3',
  border: 'rgba(40, 36, 90, 0.11)',
  glass: 'rgba(255, 250, 241, 0.86)',
  glassBorder: 'rgba(40, 36, 90, 0.12)',
  text: '#1e1f4b',
  muted: '#585673',
  faint: '#8e8aa1',
  accent: '#2d3487',
  onAccent: '#fffaf1',
  accentText: '#2d3487',
  star: '#d98a00',
  starEmpty: '#ddd3c0',
  vermilion: '#c2410c',
  success: '#1f7a55',
  danger: '#b42318',
  shadow: 'rgba(70, 50, 20, 0.14)',
  tints: [
    '#fbe3c8',
    '#e3ecf9',
    '#f6e0e4',
    '#e1f0e6',
    '#f3e6fa',
    '#fff0c9',
    '#dff1f4',
    '#f9e2d2',
    '#e6e8f8',
  ],
};

export const SLATE: Palette = {
  scheme: 'slate',
  background: '#161c1f',
  surface: '#1f272b',
  surfaceRaised: '#283237',
  border: 'rgba(240, 238, 228, 0.09)',
  glass: 'rgba(31, 39, 43, 0.86)',
  glassBorder: 'rgba(240, 238, 228, 0.12)',
  text: '#f2efe4',
  muted: '#b4bcb8',
  faint: '#7d8986',
  accent: '#f2cf63',
  onAccent: '#1d2326',
  accentText: '#f2cf63',
  star: '#f5c242',
  starEmpty: '#3a464b',
  vermilion: '#ff8a6b',
  success: '#7fd6a8',
  danger: '#ff9a8f',
  shadow: 'rgba(0, 0, 0, 0.4)',
  tints: [
    '#33291f',
    '#1f2a38',
    '#352329',
    '#1e3127',
    '#2c2337',
    '#352f1c',
    '#1c3034',
    '#36271f',
    '#24273a',
  ],
};

export const FONTS = {
  display: 'Fraunces_600SemiBold',
  displayItalic: 'Fraunces_600SemiBold_Italic',
  displayBold: 'Fraunces_700Bold',
  body: 'Nunito_500Medium',
  bodyBold: 'Nunito_700Bold',
  bodyHeavy: 'Nunito_800ExtraBold',
} as const;
