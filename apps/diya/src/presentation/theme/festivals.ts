import type { FestivalId } from '@/domain/entities/Festival';
import { BLUE, RED, WHITE, YELLOW } from '@/domain/entities/Board';

export type LampStyle = 'diya' | 'bulb' | 'lantern' | 'candle' | 'paper';

/** How the board looks under one festival. Rules never change; only light and lamps do. */
export interface BoardLook {
  readonly id: FestivalId;
  readonly lamp: LampStyle;
  /** Board gradient, top to bottom, under each app light. Always a night sky so light can glow. */
  readonly night: readonly [string, string];
  readonly dusk: readonly [string, string];
  /** Floor tiles and the dots between them. */
  readonly tile: string;
  readonly dot: string;
  /** The frame and every metal piece (brass, silver). */
  readonly metal: readonly [string, string];
  readonly wall: readonly [string, string];
  readonly wallEdge: string;
  /** White light under this festival: warm gold for Diwali, icy for Christmas. */
  readonly white: string;
  /** The lamp body before its colour band (clay, glass, brass, wax, paper). */
  readonly body: string;
  /** Sparks and fireworks on a win. */
  readonly sparks: readonly string[];
  /** A little scene in the corners of the board frame. */
  readonly motif: 'rangoli' | 'snow' | 'crescent' | 'star' | 'cloud';
}

export const LOOKS: Readonly<Record<FestivalId, BoardLook>> = {
  diwali: {
    id: 'diwali',
    lamp: 'diya',
    night: ['#1a0c2e', '#2c1242'],
    dusk: ['#251a58', '#4a2862'],
    tile: 'rgba(255, 210, 150, 0.035)',
    dot: 'rgba(255, 214, 160, 0.28)',
    metal: ['#ffe2a0', '#b9772a'],
    wall: ['#4a2a4f', '#2b1834'],
    wallEdge: 'rgba(255, 196, 120, 0.28)',
    white: '#ffe6a6',
    body: '#c4623a',
    sparks: ['#ffd27a', '#ff9f43', '#ff6b9a', '#fff1c4'],
    motif: 'rangoli',
  },
  christmas: {
    id: 'christmas',
    lamp: 'bulb',
    night: ['#081a2c', '#0f2d2e'],
    dusk: ['#1a2f56', '#244a55'],
    tile: 'rgba(200, 240, 255, 0.035)',
    dot: 'rgba(210, 240, 255, 0.3)',
    metal: ['#f2f6fb', '#8394a8'],
    wall: ['#24414f', '#13262f'],
    wallEdge: 'rgba(235, 248, 255, 0.55)',
    white: '#f2fbff',
    body: '#dfe6ee',
    sparks: ['#ff5a5f', '#52e08a', '#ffd84a', '#ffffff'],
    motif: 'snow',
  },
  eid: {
    id: 'eid',
    lamp: 'lantern',
    night: ['#0b1531', '#16264c'],
    dusk: ['#1f2d62', '#3a3670'],
    tile: 'rgba(200, 220, 255, 0.035)',
    dot: 'rgba(255, 230, 170, 0.28)',
    metal: ['#ffe7a6', '#a87b2c'],
    wall: ['#2a3460', '#18203f'],
    wallEdge: 'rgba(255, 226, 150, 0.3)',
    white: '#fff0c4',
    body: '#c9a14a',
    sparks: ['#ffe08a', '#9fd8ff', '#ffffff', '#ffc4e1'],
    motif: 'crescent',
  },
  hanukkah: {
    id: 'hanukkah',
    lamp: 'candle',
    night: ['#0a1535', '#16225e'],
    dusk: ['#1f2e6e', '#323c78'],
    tile: 'rgba(190, 210, 255, 0.04)',
    dot: 'rgba(200, 220, 255, 0.3)',
    metal: ['#eef3ff', '#7d8db5'],
    wall: ['#26306a', '#161d45'],
    wallEdge: 'rgba(210, 225, 255, 0.35)',
    white: '#fff5d4',
    body: '#eef2fb',
    sparks: ['#9fc6ff', '#ffffff', '#ffd86b', '#c7d8ff'],
    motif: 'star',
  },
  lantern: {
    id: 'lantern',
    lamp: 'paper',
    night: ['#1f0913', '#3c1020'],
    dusk: ['#401634', '#5e213a'],
    tile: 'rgba(255, 200, 170, 0.04)',
    dot: 'rgba(255, 210, 160, 0.3)',
    metal: ['#ffe2a0', '#b47b2c'],
    wall: ['#4e1a2c', '#2c0e19'],
    wallEdge: 'rgba(255, 190, 120, 0.3)',
    white: '#ffd9a2',
    body: '#d8402e',
    sparks: ['#ffcf5a', '#ff7043', '#ffe9b0', '#ff9db0'],
    motif: 'cloud',
  },
};

/** Coloured light and lamp colours. The same under every festival: colour is a rule. */
export const LIGHT = {
  red: '#ff5560',
  yellow: '#ffd94a',
  blue: '#4fa6ff',
  orange: '#ff9a2e',
  green: '#4fe08c',
  purple: '#b87bff',
} as const;

/** The colour a mask of light shows as, under a look. */
export function lightColour(mask: number, look: BoardLook): string {
  switch (mask) {
    case WHITE:
      return look.white;
    case RED:
      return LIGHT.red;
    case YELLOW:
      return LIGHT.yellow;
    case BLUE:
      return LIGHT.blue;
    case RED | YELLOW:
      return LIGHT.orange;
    case YELLOW | BLUE:
      return LIGHT.green;
    case RED | BLUE:
      return LIGHT.purple;
    default:
      return '#ffffff';
  }
}
