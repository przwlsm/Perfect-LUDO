/**
 * The atlas: every calm toy, where in the world it comes from, and the
 * destinations still on their way. Playable toys are always free to play;
 * money only ever buys looks (palettes, sheets, bowls) and removes the small
 * watermark on shared pictures.
 */
export type ToyId = 'rangoli' | 'ebru' | 'calligraphy' | 'bubbles' | 'bowl' | 'candle';

export type ComingSoonId =
  'kintsugi' | 'papel' | 'zellige' | 'kente' | 'lantern' | 'snowglobe' | 'stones' | 'matryoshka';

export interface Place {
  /** ISO 3166-1 alpha-2 country code, used for the flag. */
  readonly country: string;
  /** Degrees, north positive. */
  readonly lat: number;
  /** Degrees, east positive. */
  readonly lon: number;
}

export interface Toy extends Place {
  readonly id: ToyId;
  /** A single emoji that stands for the toy on cards, stamps and pins. */
  readonly emblem: string;
  /** The toy's own light, used for its pin, card glow and stamp ink. */
  readonly hue: string;
}

export interface Destination extends Place {
  readonly id: ComingSoonId;
  readonly emblem: string;
}

export const TOYS: readonly Toy[] = [
  { id: 'rangoli', country: 'IN', lat: 21, lon: 78, emblem: '🌸', hue: '#ff8a3d' },
  { id: 'ebru', country: 'TR', lat: 41, lon: 29, emblem: '🌊', hue: '#4f8dff' },
  { id: 'calligraphy', country: 'CN', lat: 34, lon: 108, emblem: '🖌️', hue: '#7fd1c7' },
  { id: 'bubbles', country: 'US', lat: 40.9, lon: -74.2, emblem: '🫧', hue: '#9fd8ff' },
  { id: 'bowl', country: 'NP', lat: 27.7, lon: 85.3, emblem: '🔔', hue: '#e5b25d' },
  { id: 'candle', country: 'DK', lat: 55.7, lon: 12.6, emblem: '🕯️', hue: '#ffcf70' },
];

export const COMING_SOON: readonly Destination[] = [
  { id: 'kintsugi', country: 'JP', lat: 35.7, lon: 139.7, emblem: '🏺' },
  { id: 'papel', country: 'MX', lat: 19.4, lon: -99.1, emblem: '🎏' },
  { id: 'zellige', country: 'MA', lat: 34, lon: -5, emblem: '✴️' },
  { id: 'kente', country: 'GH', lat: 6.7, lon: -1.6, emblem: '🧶' },
  { id: 'lantern', country: 'TH', lat: 18.8, lon: 99, emblem: '🏮' },
  { id: 'snowglobe', country: 'AT', lat: 48.2, lon: 16.4, emblem: '❄️' },
  { id: 'stones', country: 'GB', lat: 56.5, lon: -4.2, emblem: '🪨' },
  { id: 'matryoshka', country: 'RU', lat: 56.3, lon: 38.1, emblem: '🪆' },
];

export function toyById(id: string): Toy | undefined {
  return TOYS.find((toy) => toy.id === id);
}

export function isToyId(id: string): id is ToyId {
  return TOYS.some((toy) => toy.id === id);
}

/** A country code as its flag emoji (regional indicator pair). */
export function flagOf(country: string): string {
  const base = 0x1f1e6 - 'A'.charCodeAt(0);
  return String.fromCodePoint(
    ...country
      .toUpperCase()
      .split('')
      .map((c) => base + c.charCodeAt(0)),
  );
}

/**
 * The toy of the day: the same for everyone on a given local date, cycling
 * through every toy before any repeats.
 */
export function toyOfTheDay(date: Date): Toy {
  const day = Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000,
  );
  return TOYS[((day % TOYS.length) + TOYS.length) % TOYS.length]!;
}
