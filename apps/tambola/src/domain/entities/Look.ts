/**
 * Looks are purely cosmetic. Every ticket plays the same in every look; the
 * free ones are complete, and premium ones come with Plus or for a day after
 * a rewarded video the player chose to watch.
 */
export type Ornament = 'plain' | 'bunting' | 'lights' | 'paisley' | 'neon' | 'feathers';

export interface TicketTheme {
  readonly id: string;
  readonly premium: boolean;
  /** The ticket's card. */
  readonly paper: string;
  /** Cells without a number. */
  readonly blank: string;
  /** Cells with a number. */
  readonly cell: string;
  /** The numbers: always at least 7:1 on `cell`. */
  readonly ink: string;
  readonly header: string;
  readonly headerInk: string;
  readonly rule: string;
  readonly ornament: Ornament;
  /** The ornament's lights and flourishes. */
  readonly sparkle: readonly string[];
}

export type DabShape = 'dot' | 'ring' | 'star' | 'heart' | 'flower';

export interface Dabber {
  readonly id: string;
  readonly premium: boolean;
  readonly shape: DabShape;
  readonly color: string;
  /** The number on top of the dab: at least 4.5:1 on `color` (rings keep the ticket's ink). */
  readonly onColor: string;
}

export const TICKET_THEMES: readonly TicketTheme[] = [
  {
    id: 'classic',
    premium: false,
    paper: '#fff8ec',
    blank: '#f7e6c8',
    cell: '#ffffff',
    ink: '#2a1238',
    header: '#b0174f',
    headerInk: '#ffffff',
    rule: '#e8cfa2',
    ornament: 'bunting',
    sparkle: ['#f4a300', '#b0174f', '#1f8a70'],
  },
  {
    id: 'kitty',
    premium: false,
    paper: '#fff0f6',
    blank: '#ffd9e8',
    cell: '#ffffff',
    ink: '#3f0b28',
    header: '#c2185b',
    headerInk: '#ffffff',
    rule: '#f6b3cd',
    ornament: 'plain',
    sparkle: ['#ffb627', '#ff6fa5'],
  },
  {
    id: 'diwali',
    premium: true,
    paper: '#2a0f3d',
    blank: '#3d1857',
    cell: '#fff6e0',
    ink: '#3a0d0d',
    header: '#ff9f1c',
    headerInk: '#2a0f3d',
    rule: '#ffcf5c',
    ornament: 'lights',
    sparkle: ['#ffd166', '#ff7b54', '#ffe8a3', '#ff5d8f'],
  },
  {
    id: 'wedding',
    premium: true,
    paper: '#6e0c1c',
    blank: '#86192b',
    cell: '#fff8e7',
    ink: '#4f0812',
    header: '#d9a93c',
    headerInk: '#3d0710',
    rule: '#e8c468',
    ornament: 'paisley',
    sparkle: ['#f3d27a', '#ffe9b0'],
  },
  {
    id: 'neon',
    premium: true,
    paper: '#0d0b1f',
    blank: '#17143a',
    cell: '#221d4d',
    ink: '#f7f7ff',
    header: '#00e5ff',
    headerInk: '#0d0b1f',
    rule: '#ff2fd1',
    ornament: 'neon',
    sparkle: ['#ff2fd1', '#00e5ff', '#b6ff3b'],
  },
  {
    id: 'peacock',
    premium: true,
    paper: '#07343a',
    blank: '#0e4b53',
    cell: '#f2fbf8',
    ink: '#0b2e33',
    header: '#c9a227',
    headerInk: '#08262a',
    rule: '#2fb3a8',
    ornament: 'feathers',
    sparkle: ['#2fb3a8', '#c9a227', '#3a6ee8'],
  },
];

export const DABBERS: readonly Dabber[] = [
  { id: 'marigold', premium: false, shape: 'dot', color: '#ff8f00', onColor: '#2b1300' },
  { id: 'rani', premium: false, shape: 'dot', color: '#d81b60', onColor: '#ffffff' },
  { id: 'leaf', premium: false, shape: 'dot', color: '#2e7d32', onColor: '#ffffff' },
  { id: 'star', premium: true, shape: 'star', color: '#ffc400', onColor: '#3a2500' },
  { id: 'heart', premium: true, shape: 'heart', color: '#d42a45', onColor: '#ffffff' },
  { id: 'ring', premium: true, shape: 'ring', color: '#00a8c6', onColor: '#00a8c6' },
  { id: 'flower', premium: true, shape: 'flower', color: '#8e24aa', onColor: '#ffffff' },
];

/** The fun-call voice: the caller reads each number's rhyme aloud as well as the number. */
export const FUN_VOICE = { id: 'voice.fun', premium: true } as const;

export function themeById(id: string | null | undefined): TicketTheme {
  return TICKET_THEMES.find((t) => t.id === id) ?? TICKET_THEMES[0]!;
}

export function dabberById(id: string | null | undefined): Dabber {
  return DABBERS.find((d) => d.id === id) ?? DABBERS[0]!;
}
