/**
 * Themes are purely cosmetic: every board plays the same in every theme.
 * Classic is free; the others come with Plus, or for a day after a video
 * the player chose to watch.
 */
export interface LookInk {
  /** The line's colours, cycled piece by piece along the loop (one for most themes). */
  readonly line: readonly string[];
  /** The rice dots of the grid. */
  readonly dot: string;
  /** The dots and flowers that bloom inside the finished kolam. */
  readonly bloom: readonly string[];
  /** The floor under the board (centre, edge); null keeps the light's own earth. */
  readonly floor: readonly [string, string] | null;
  /** A thin highlight along the line (gold leaf). */
  readonly sheen: string | null;
}

export type LookId = 'classic' | 'pongal' | 'margazhi' | 'moonlit' | 'gold';

export interface KolamLook {
  readonly id: LookId;
  readonly premium: boolean;
  /** Dark light: on wet earth before sunrise. */
  readonly dawn: LookInk;
  /** Light light: on a swept ochre courtyard. */
  readonly courtyard: LookInk;
}

const MARIGOLD = ['#f4a01c', '#e8622a', '#ffd166'];

export const LOOKS: readonly KolamLook[] = [
  {
    id: 'classic',
    premium: false,
    dawn: {
      line: ['#f7f0e3'],
      dot: '#e9dcc6',
      bloom: ['#f7f0e3', ...MARIGOLD],
      floor: null,
      sheen: null,
    },
    courtyard: {
      line: ['#7b2d1a'],
      dot: '#8d5b3a',
      bloom: ['#7b2d1a', '#d9571f', '#e09a12'],
      floor: null,
      sheen: null,
    },
  },
  {
    id: 'pongal',
    premium: true,
    dawn: {
      line: ['#f5b82e', '#f5b82e', '#e2463a'],
      dot: '#e8d9b8',
      bloom: ['#7cc456', '#e2463a', '#f5b82e'],
      floor: null,
      sheen: null,
    },
    courtyard: {
      line: ['#9a5c00', '#9a5c00', '#b3261e'],
      dot: '#8d6a3a',
      bloom: ['#3f7d22', '#b3261e', '#c98a00'],
      floor: null,
      sheen: null,
    },
  },
  {
    id: 'margazhi',
    premium: true,
    dawn: {
      line: ['#ff7aa8', '#ffb43a', '#6fd6a8', '#8fb0ff', '#ff8a52'],
      dot: '#eadbc9',
      bloom: ['#ff7aa8', '#ffb43a', '#6fd6a8', '#8fb0ff'],
      floor: null,
      sheen: null,
    },
    courtyard: {
      line: ['#b0245c', '#a85a00', '#127a55', '#3a4fb0', '#b5421a'],
      dot: '#8d6a4a',
      bloom: ['#b0245c', '#d98a00', '#127a55', '#3a4fb0'],
      floor: null,
      sheen: null,
    },
  },
  {
    id: 'moonlit',
    premium: true,
    dawn: {
      line: ['#dce8ff'],
      dot: '#a9b8d8',
      bloom: ['#dce8ff', '#b9a8ff', '#ffe9a8'],
      floor: ['#1d2340', '#0e1122'],
      sheen: null,
    },
    courtyard: {
      line: ['#2c3c78'],
      dot: '#6a76a0',
      bloom: ['#2c3c78', '#6a4fc0', '#b08a1a'],
      floor: ['#eef0f7', '#d9dcea'],
      sheen: null,
    },
  },
  {
    id: 'gold',
    premium: true,
    dawn: {
      line: ['#e9b949'],
      dot: '#c9a66a',
      bloom: ['#ffd877', '#e9b949', '#f7f0e3'],
      floor: ['#2a1a12', '#140c08'],
      sheen: '#fff2c4',
    },
    courtyard: {
      line: ['#946100'],
      dot: '#a3824e',
      bloom: ['#946100', '#c98a00', '#7b2d1a'],
      floor: null,
      sheen: '#f5d27a',
    },
  },
];

export function lookById(id: string): KolamLook {
  return LOOKS.find((l) => l.id === id) ?? LOOKS[0]!;
}
