/**
 * The board of a Monsoon Fields puzzle: a hillside grid of stone channels,
 * springs fed by rain clouds, fields that need water, and rocks. Pure data;
 * the rules that move water live in `application`.
 *
 * Directions and openings: 0 = north, 1 = east, 2 = south, 3 = west
 * (clockwise). A channel's openings are a 4-bit mask, bit `d` open towards
 * direction `d`. A tile's `mask` is its solved orientation; turning it `r`
 * quarter turns clockwise opens `rotateMask(mask, r)`.
 */

export type Dir = 0 | 1 | 2 | 3;
export const DX: readonly number[] = [0, 1, 0, -1];
export const DY: readonly number[] = [-1, 0, 1, 0];
export const DIRS: readonly Dir[] = [0, 1, 2, 3];

export function opposite(d: number): Dir {
  return ((d + 2) & 3) as Dir;
}

/** The mask turned `r` quarter turns clockwise (north opens east). */
export function rotateMask(mask: number, r: number): number {
  const k = r & 3;
  return ((mask << k) | (mask >> (4 - k))) & 15;
}

export function bitCount(mask: number): number {
  let n = 0;
  for (let m = mask; m; m &= m - 1) n++;
  return n;
}

/**
 * Two waters. Rain from the clouds feeds rice paddies; water from the old
 * temple tank feeds lotus ponds. They must never mix.
 */
export type Water = 0 | 1;
export const RAIN: Water = 0;
export const TANK: Water = 1;

/** What a cell holds. */
export type Tile =
  | { readonly kind: 'rock' }
  /** A stone channel: a dead end (one opening), straight, bend, tee or cross. */
  | { readonly kind: 'pipe'; readonly mask: number; readonly fixed: boolean }
  /** A spring under a rain cloud (rain) or the temple tank (tank). Water starts here. */
  | {
      readonly kind: 'source';
      readonly mask: number;
      readonly water: Water;
      readonly fixed: boolean;
    }
  /** A paddy (rain) or a lotus pond (tank). Each must be watered with its own water. */
  | {
      readonly kind: 'field';
      readonly mask: number;
      readonly water: Water;
      readonly fixed: boolean;
    }
  /** Two channels crossing at different heights: north–south below, east–west above. Never turns. */
  | { readonly kind: 'bridge' }
  /** A check-dam: a straight channel that lets water through only towards `out` (when unturned). */
  | { readonly kind: 'dam'; readonly out: Dir; readonly fixed: boolean };

export type TileKind = Tile['kind'];

/** The one-line lesson shown the first time a new idea appears. */
export type Lesson = 'rotate' | 'spills' | 'clouds' | 'fixed' | 'bridges' | 'dams' | 'twoWaters';

export const LESSON_ORDER: readonly Lesson[] = [
  'rotate',
  'spills',
  'clouds',
  'fixed',
  'bridges',
  'dams',
  'twoWaters',
];

export interface Level {
  /** "12" for a level, "d212" for a daily puzzle. */
  readonly id: string;
  readonly w: number;
  readonly h: number;
  /** Row-major, `w * h` long. */
  readonly tiles: readonly Tile[];
  /** Each cell's starting rotation (quarter turns clockwise from its solved orientation). */
  readonly start: readonly number[];
  /** Turns before the clouds pass (a soft limit, only for the third star); null before it is taught. */
  readonly budget: number | null;
  readonly lesson?: Lesson;
}

/**
 * How many different ways round a tile can face: a straight looks the same
 * after half a turn, a cross and a bridge after any turn. A check-dam has
 * four (its arrow tells them apart).
 */
export function period(tile: Tile): 1 | 2 | 4 {
  switch (tile.kind) {
    case 'rock':
    case 'bridge':
      return 1;
    case 'dam':
      return 4;
    default:
      if (rotateMask(tile.mask, 1) === tile.mask) return 1;
      if (rotateMask(tile.mask, 2) === tile.mask) return 2;
      return 4;
  }
}

/** Whether the player can turn a tile at all (fixed tiles, rocks, crosses and bridges never change). */
export function turnable(tile: Tile): boolean {
  switch (tile.kind) {
    case 'rock':
    case 'bridge':
      return false;
    default:
      return !tile.fixed && period(tile) > 1;
  }
}

export function isFixed(tile: Tile): boolean {
  return tile.kind !== 'rock' && tile.kind !== 'bridge' && tile.fixed;
}

/** Openings of a tile turned `r` quarter turns (a bridge opens all four ways). */
export function openings(tile: Tile, r: number): number {
  switch (tile.kind) {
    case 'rock':
      return 0;
    case 'bridge':
      return 15;
    case 'dam':
      return rotateMask((1 << tile.out) | (1 << opposite(tile.out)), r);
    default:
      return rotateMask(tile.mask, r);
  }
}

/** The tile's openings before any turn (a dam: its straight; a bridge: all four). */
export function baseMask(tile: Tile): number {
  return openings(tile, 0);
}

/** True when rotations `a` and `b` leave the tile looking (and working) the same. */
export function sameFacing(tile: Tile, a: number, b: number): boolean {
  const p = period(tile);
  return (((a - b) % p) + p) % p === 0;
}

/** Taps (each a quarter turn clockwise) to go from rotation `from` to rotation `to`. */
export function tapsBetween(tile: Tile, from: number, to: number): number {
  const p = period(tile);
  return (((to - from) % p) + p) % p;
}

export function fieldCount(level: Level): number {
  return level.tiles.filter((t) => t.kind === 'field').length;
}

/** True when the level has fields of both waters. */
export function hasTwoWaters(level: Level): boolean {
  const waters = new Set<number>();
  for (const t of level.tiles) if (t.kind === 'field' || t.kind === 'source') waters.add(t.water);
  return waters.size > 1;
}

/** Turns the level needs at the least, if the player turns only tiles that need it. */
export function turnsToSolve(level: Level): number {
  let n = 0;
  level.tiles.forEach((tile, at) => {
    if (turnable(tile)) n += tapsBetween(tile, level.start[at] ?? 0, 0);
  });
  return n;
}
