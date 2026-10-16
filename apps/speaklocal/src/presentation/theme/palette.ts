import type { BubbleId } from '@/domain/entities/Bubbles';

/**
 * Speak Local's two lights: Day (a warm, sunlit street: cream, ink-navy
 * text, auto-rickshaw yellow and a teal like a fresh-painted shutter) and
 * Dusk (the city as the lights come on: deep blue-navy, warm cream text,
 * the same yellow glowing brighter). Screens never write a raw colour;
 * they read these tokens. Text colours meet WCAG AA on `background` and
 * `surface` (palette.test.ts).
 */
export interface Palette {
  readonly scheme: 'day' | 'dusk';
  readonly background: string;
  readonly surface: string;
  readonly surfaceRaised: string;
  readonly border: string;
  readonly glass: string;
  readonly glassBorder: string;
  readonly text: string;
  readonly muted: string;
  readonly faint: string;
  /** Auto-rickshaw yellow: primary buttons and highlights. */
  readonly accent: string;
  readonly onAccent: string;
  /** An accent colour that reads as text on background and surface. */
  readonly accentText: string;
  /** Teal: your side of the conversation, secondary actions. */
  readonly teal: string;
  readonly onTeal: string;
  readonly success: string;
  readonly danger: string;
  readonly shadow: string;
  /** The line being spoken right now. */
  readonly highlight: string;
  readonly track: string;
  /** Sky gradient behind skylines, top to horizon. */
  readonly sky: readonly [string, string, string];
  readonly sun: string;
  readonly cityFar: string;
  readonly cityNear: string;
  readonly windows: string;
}

export const DAY: Palette = {
  scheme: 'day',
  background: '#fbf5ea',
  surface: '#ffffff',
  surfaceRaised: '#f5eddf',
  border: 'rgba(19, 35, 58, 0.11)',
  glass: 'rgba(255, 255, 255, 0.86)',
  glassBorder: 'rgba(19, 35, 58, 0.12)',
  text: '#13233a',
  muted: '#55617a',
  faint: '#8a93a3',
  accent: '#f7b500',
  onAccent: '#13233a',
  accentText: '#0b6b63',
  teal: '#0f7b72',
  onTeal: '#ffffff',
  success: '#1d7a4b',
  danger: '#b42318',
  shadow: 'rgba(60, 45, 20, 0.13)',
  highlight: '#fff1c2',
  track: '#e9dfcd',
  sky: ['#8fd0e6', '#ffd9a8', '#ffb98a'],
  sun: '#ffe7a3',
  cityFar: '#d8a98f',
  cityNear: '#7b5a63',
  windows: '#ffe18a',
};

export const DUSK: Palette = {
  scheme: 'dusk',
  background: '#10233a',
  surface: '#172f4b',
  surfaceRaised: '#1f3b5c',
  border: 'rgba(246, 239, 226, 0.10)',
  glass: 'rgba(23, 47, 75, 0.88)',
  glassBorder: 'rgba(246, 239, 226, 0.14)',
  text: '#f6efe2',
  muted: '#b9c5d4',
  faint: '#8091a8',
  accent: '#ffc53d',
  onAccent: '#10233a',
  accentText: '#ffd36b',
  teal: '#2bb3a3',
  onTeal: '#07211f',
  success: '#7fdcaa',
  danger: '#ff9a8f',
  shadow: 'rgba(0, 0, 0, 0.38)',
  highlight: '#33496b',
  track: '#2a4467',
  sky: ['#1b2550', '#5b3a6e', '#f08a5d'],
  sun: '#ffd27a',
  cityFar: '#3c3962',
  cityNear: '#151a35',
  windows: '#ffc94d',
};

export interface BubbleLook {
  readonly bg: string;
  readonly fg: string;
  /** Romanisation and meaning on the bubble. */
  readonly sub: string;
}

/** Your side of the chat, per chat-colour theme and light. */
export const BUBBLE_LOOKS: Readonly<Record<BubbleId, { day: BubbleLook; dusk: BubbleLook }>> = {
  classic: {
    day: { bg: '#0d6f67', fg: '#ffffff', sub: '#dcf4f0' },
    dusk: { bg: '#11655d', fg: '#ffffff', sub: '#d3efea' },
  },
  marigold: {
    day: { bg: '#f7b500', fg: '#13233a', sub: '#2f2a1b' },
    dusk: { bg: '#ffc53d', fg: '#10233a', sub: '#33291a' },
  },
  monsoon: {
    day: { bg: '#3a5794', fg: '#ffffff', sub: '#e0e8fb' },
    dusk: { bg: '#3f5fa0', fg: '#ffffff', sub: '#e3eaff' },
  },
  jasmine: {
    day: { bg: '#fff4d6', fg: '#3a3324', sub: '#5c5134' },
    dusk: { bg: '#f3e8c8', fg: '#2b261a', sub: '#4f4630' },
  },
  chilli: {
    day: { bg: '#b8400e', fg: '#ffffff', sub: '#ffe6d9' },
    dusk: { bg: '#b0400f', fg: '#ffffff', sub: '#ffe3d3' },
  },
};

export const FONTS = {
  display: 'Fraunces_600SemiBold',
  displayItalic: 'Fraunces_600SemiBold_Italic',
  displayBold: 'Fraunces_700Bold',
  body: 'Nunito_500Medium',
  bodyBold: 'Nunito_700Bold',
  bodyHeavy: 'Nunito_800ExtraBold',
} as const;
