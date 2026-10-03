/**
 * The app's colour tokens, one set per appearance. Screens never write a raw
 * colour for chrome (text, borders, fills, overlays): they use these, so
 * day and night mode stay consistent and readable.
 *
 * Game colours (player pieces, the board's cream tiles, dice finishes) are
 * the same in both modes: they are the game, not the chrome around it.
 */
export type Scheme = 'light' | 'dark';

export interface Palette {
  readonly scheme: Scheme;
  /** Page background when no board theme applies (crash screen, splash). */
  readonly background: string;
  /** Primary, secondary and tertiary text. All pass 4.5:1 on every surface. */
  readonly text: string;
  readonly muted: string;
  readonly subtle: string;
  /** Hairline borders and dividers. */
  readonly line: string;
  /** A stronger border, e.g. an input or an unselected chip. */
  readonly border: string;
  /** Faint and stronger fills laid over a surface (chips, wells, pressed rows). */
  readonly fill: string;
  readonly fillStrong: string;
  /** Android press ripple on neutral controls. */
  readonly ripple: string;
  /** Dims the page behind a dialog. */
  readonly scrim: string;
  /** Drop-shadow colour for cards and raised controls. */
  readonly shadow: string;
  /** Semantic colours, tuned per mode to stay legible as text. */
  readonly green: string;
  readonly gold: string;
  readonly violet: string;
  readonly danger: string;
  readonly blue: string;
  readonly blueSoft: string;
  readonly gem: string;
  /** Surface tiers, lowest to highest. */
  readonly surfaceLow: string;
  readonly surfaceHigh: string;
  readonly surfaceHighest: string;
  /** Off state of switches and other controls: 3:1 on cards, as controls need. */
  readonly track: string;
  /** Deep inset fields (inputs, wells). */
  readonly inset: string;
  /** Secondary button body, its bottom rim, and its gradient top to bottom. */
  readonly navy: string;
  readonly navyRim: string;
  readonly secondary: readonly [string, string, string];
  /** Text on a secondary button. */
  readonly secondaryText: string;
  /** Destructive secondary button gradient. */
  readonly dangerSecondary: readonly [string, string, string];
  /** Text on a coloured (green/blue/violet) badge or button. */
  readonly onColor: string;
}

/** Night: the original Neo-Arcade look. */
export const DARK: Palette = {
  scheme: 'dark',
  background: '#0e1322',
  text: '#dee1f7',
  muted: '#c2c6d6',
  subtle: '#9ca0ac',
  line: '#ffffff14',
  border: '#ffffff26',
  fill: '#ffffff0a',
  fillStrong: '#ffffff17',
  ripple: '#ffffff1f',
  scrim: '#030612cc',
  shadow: '#00000040',
  green: '#4edea3',
  gold: '#ffb95f',
  violet: '#aa8efa',
  danger: '#ff8795',
  blue: '#689fff',
  blueSoft: '#adc6ff',
  gem: '#c084fc',
  surfaceLow: '#161b2a',
  surfaceHigh: '#252939',
  surfaceHighest: '#2f3445',
  track: '#6a7190',
  inset: '#111728',
  navy: '#232d4b',
  navyRim: '#111625',
  secondary: ['#303c66', '#232d4b', '#1c2440'],
  secondaryText: '#dee1f7',
  dangerSecondary: ['#472436', '#3a1d2a', '#2c1620'],
  onColor: '#ffffff',
};

/**
 * Day, built on the 60-30-10 rule:
 *  - 60% bright ivory page and white cards, lifted by soft navy shadows;
 *  - 30% royal navy, the same navy as night: text, secondary buttons, the
 *    hero card and the active tab, so day and night read as one brand;
 *  - 10% marigold gold and the four Ludo colours, kept for what should pop
 *    (play buttons, coins, game-mode tiles).
 * Semantic colours are deep enough to read as text on white.
 */
export const LIGHT: Palette = {
  scheme: 'light',
  background: '#fbf8f2',
  text: '#16204a',
  muted: '#424a6b',
  subtle: '#5c6385',
  line: '#16204a14',
  border: '#16204a26',
  fill: '#16204a08',
  fillStrong: '#16204a12',
  ripple: '#16204a1a',
  scrim: '#0b1230a6',
  shadow: '#16204a24',
  green: '#077a4e',
  gold: '#985300',
  violet: '#6440c8',
  danger: '#c0233b',
  blue: '#1d55c9',
  blueSoft: '#2a5fc4',
  gem: '#8232c0',
  surfaceLow: '#f3f1f8',
  surfaceHigh: '#e9e7f1',
  surfaceHighest: '#dddbe8',
  track: '#878da6',
  inset: '#f2f3f9',
  navy: '#1e2a5e',
  navyRim: '#0f1738',
  secondary: ['#2b3a7a', '#1e2a5e', '#172150'],
  secondaryText: '#ffffff',
  dangerSecondary: ['#fff4f5', '#fde5e8', '#f8d6db'],
  onColor: '#ffffff',
};

export const PALETTES: Record<Scheme, Palette> = { light: LIGHT, dark: DARK };
