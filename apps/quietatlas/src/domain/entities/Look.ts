import type { ToyId } from './Toy';

/**
 * A look is purely cosmetic: the colours a toy draws with, the sheet a
 * bubble wrap is made of, the metal of a bowl. Every toy has free looks and
 * is fully playable with them; premium looks come with Plus, or for a day
 * after a rewarded video the player chose to watch.
 */
export interface Look {
  readonly id: string;
  readonly toy: ToyId;
  readonly premium: boolean;
  /** What the toy paints or tints with, in the order it offers them. */
  readonly colors: readonly string[];
  /** The surface the toy sits on. */
  readonly background: string;
  /** Second surface tone for gradients, textures and glow. */
  readonly backgroundEdge: string;
}

const look = (
  toy: ToyId,
  id: string,
  premium: boolean,
  background: string,
  backgroundEdge: string,
  colors: readonly string[],
): Look => ({ id, toy, premium, background, backgroundEdge, colors });

export const LOOKS: readonly Look[] = [
  // Rangoli: coloured powder on a dark courtyard floor.
  look('rangoli', 'rangoli.diwali', false, '#2a1712', '#120a08', [
    '#ffb21e',
    '#ff5a36',
    '#e83f8f',
    '#2ec4b6',
    '#fff3d6',
  ]),
  look('rangoli', 'rangoli.pongal', false, '#3b1d16', '#1a0c09', [
    '#fff7e8',
    '#f7c548',
    '#e4572e',
    '#76b041',
    '#9b5de5',
  ]),
  look('rangoli', 'rangoli.holi', false, '#251a33', '#120c1a', [
    '#ff4fa3',
    '#ffd23f',
    '#3bceac',
    '#3a86ff',
    '#8338ec',
  ]),
  look('rangoli', 'rangoli.peacock', true, '#0c1f26', '#05090c', [
    '#0fa3b1',
    '#1b4965',
    '#9bc53d',
    '#f9c80e',
    '#d6f6ff',
  ]),
  look('rangoli', 'rangoli.temple', true, '#1d1208', '#0b0603', [
    '#ffd56b',
    '#e9a23b',
    '#b5651d',
    '#fff1c1',
    '#8c1c13',
  ]),
  look('rangoli', 'rangoli.moon', true, '#101626', '#05070d', [
    '#e0e7ff',
    '#a5b4fc',
    '#c4b5fd',
    '#99f6e4',
    '#fef9c3',
  ]),

  // Ebru: inks floating on thickened water.
  look('ebru', 'ebru.istanbul', false, '#efe6d2', '#d9ccb0', [
    '#1f4e9c',
    '#c8102e',
    '#e3a72f',
    '#2a7f62',
    '#fbf6ea',
  ]),
  look('ebru', 'ebru.tulip', false, '#f4ece0', '#e2d3bd', [
    '#d7263d',
    '#f46036',
    '#2e294e',
    '#1b998b',
    '#fdf0d5',
  ]),
  look('ebru', 'ebru.bosphorus', true, '#e8eef2', '#c9d6df', [
    '#003049',
    '#0a9396',
    '#94d2bd',
    '#ee9b00',
    '#ffffff',
  ]),
  look('ebru', 'ebru.sultan', true, '#1c1530', '#0e0a1c', [
    '#f2c14e',
    '#f78154',
    '#4d9078',
    '#b4436c',
    '#e9e3ff',
  ]),
  look('ebru', 'ebru.ottoman', true, '#f3e9dc', '#dbc7a8', [
    '#5f0f40',
    '#9a031e',
    '#fb8b24',
    '#0f4c5c',
    '#f7f3e9',
  ]),

  // Water calligraphy: wet strokes on a stone slab.
  look('calligraphy', 'calligraphy.slate', false, '#d9d4c7', '#bfb8a6', ['#2b2a28']),
  look('calligraphy', 'calligraphy.jade', false, '#cfe0d4', '#a9c6b3', ['#1f3b2d']),
  look('calligraphy', 'calligraphy.night', true, '#2d3142', '#1b1e2b', ['#e9ecf5']),
  look('calligraphy', 'calligraphy.sakura', true, '#f2dfe1', '#dfbfc4', ['#5b2333']),

  // Bubble wrap: the sheet's tint.
  look('bubbles', 'bubbles.clear', false, '#dfe9f3', '#b8cbe0', ['#ffffff']),
  look('bubbles', 'bubbles.mint', false, '#d7f2e3', '#a8dcc0', ['#e9fff3']),
  look('bubbles', 'bubbles.rainbow', true, '#f3eefe', '#d8cdf7', [
    '#ff8fab',
    '#ffd166',
    '#8be9b5',
    '#7cc6fe',
    '#b9a7ff',
  ]),
  look('bubbles', 'bubbles.night', true, '#121633', '#070917', ['#7df9ff', '#ff6ec7', '#c1ff72']),

  // Singing bowl: the metal.
  look('bowl', 'bowl.bronze', false, '#1a1410', '#0b0806', ['#c8893b', '#7a4a1d', '#f1c27d']),
  look('bowl', 'bowl.brass', false, '#17150d', '#090805', ['#d9b44a', '#8a6d1d', '#fff0a8']),
  look('bowl', 'bowl.crystal', true, '#0f1724', '#05080f', ['#dce9ff', '#8fa8d6', '#ffffff']),
  look('bowl', 'bowl.jade', true, '#0d1a14', '#040a07', ['#5fb38a', '#1f5c41', '#c6f5dc']),

  // Candle breath: the wax and the room's glow.
  look('candle', 'candle.hygge', false, '#1f1712', '#0b0806', ['#f7eedd', '#ffb347']),
  look('candle', 'candle.winter', false, '#141b26', '#070a10', ['#eef3fb', '#ffc978']),
  look('candle', 'candle.rose', true, '#26161b', '#0e0809', ['#f6d6db', '#ff9e7a']),
  look('candle', 'candle.forest', true, '#121d16', '#060b08', ['#e7efdc', '#ffd27f']),
];

export function looksFor(toy: ToyId): readonly Look[] {
  return LOOKS.filter((l) => l.toy === toy);
}

export function lookById(id: string): Look | undefined {
  return LOOKS.find((l) => l.id === id);
}

/** The look a toy opens with before the player has chosen one. */
export function defaultLook(toy: ToyId): Look {
  return looksFor(toy)[0]!;
}
