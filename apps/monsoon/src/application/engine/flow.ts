import {
  DX,
  DY,
  opposite,
  openings,
  type Dir,
  type Level,
  type Tile,
} from '@/domain/entities/Board';

/**
 * Water on the board. Every cell has up to two parts (only a bridge has
 * two: its north–south channel below and its east–west channel above);
 * part `p` of cell `a` is index `a * 2 + p`.
 */

/** Water bits on a part: 1 = rain, 2 = tank, 3 = both (mixed, which is wrong). */
export const RAIN_BIT = 1;
export const TANK_BIT = 2;

export function waterBit(water: number): number {
  return water === 0 ? RAIN_BIT : TANK_BIT;
}

/** The openings of each part for a set of rotations. */
export function partMasks(level: Level, rot: ArrayLike<number>): Uint8Array {
  const masks = new Uint8Array(level.tiles.length * 2);
  level.tiles.forEach((tile, a) => {
    if (tile.kind === 'bridge') {
      masks[a * 2] = 0b0101;
      masks[a * 2 + 1] = 0b1010;
    } else masks[a * 2] = openings(tile, rot[a] ?? 0);
  });
  return masks;
}

/** The part of a cell that a side belongs to: a bridge's east–west channel is part 1. */
export function partOfSide(tile: Tile, d: number): 0 | 1 {
  return tile.kind === 'bridge' && (d & 1) === 1 ? 1 : 0;
}

/** The part of cell `a` that opens towards `d`, or -1. */
export function partToward(masks: Uint8Array, a: number, d: number): number {
  if (masks[a * 2]! & (1 << d)) return a * 2;
  if (masks[a * 2 + 1]! & (1 << d)) return a * 2 + 1;
  return -1;
}

/** The neighbour of `a` towards `d`, or -1 off the board. */
export function neighbour(level: Pick<Level, 'w' | 'h'>, a: number, d: number): number {
  const x = (a % level.w) + DX[d]!;
  const y = Math.floor(a / level.w) + DY[d]!;
  if (x < 0 || y < 0 || x >= level.w || y >= level.h) return -1;
  return y * level.w + x;
}

/** The side a dam lets water out of, for its rotation. */
export function damOutlet(tile: Tile & { kind: 'dam' }, r: number): Dir {
  return ((tile.out + r) & 3) as Dir;
}

export interface Leak {
  readonly at: number;
  readonly dir: Dir;
  /** Which waters spill there (bits). */
  readonly water: number;
}

export type FieldState = 'dry' | 'wet' | 'wrong';

export interface Flow {
  readonly masks: Uint8Array;
  /** Per part: which waters reach it (bits). */
  readonly wet: Uint8Array;
  /** Per part: steps from the spring that first watered it; -1 when dry. */
  readonly order: Int16Array;
  /** Per part: the side water first came in by; -1 at a spring or when dry. */
  readonly entry: Int8Array;
  /** Open channel ends that water spills from. */
  readonly leaks: readonly Leak[];
  /** Dams that water pushes against from the wrong side while nothing feeds them properly. */
  readonly blocked: readonly number[];
  /** Per field cell: its state. */
  readonly fields: ReadonlyMap<number, FieldState>;
  readonly fieldsWet: number;
  readonly fieldsTotal: number;
  /** Channel parts with no water at all. */
  readonly dry: number;
  /** Parts carrying both waters. */
  readonly mixed: number;
  /** Every channel carries water, nothing spills or mixes, and every field has its own water. */
  readonly solved: boolean;
}

/**
 * Floods water out from every spring through connected channel ends.
 * Water passes between neighbours only where both have an opening facing
 * each other; a check-dam lets it in only on its inlet side and out only on
 * its outlet side. Water reaching an opening with nothing to meet it spills.
 */
export function flow(level: Level, rot: ArrayLike<number>): Flow {
  const n = level.tiles.length;
  const masks = partMasks(level, rot);
  const wet = new Uint8Array(n * 2);
  const order = new Int16Array(n * 2).fill(-1);
  const entry = new Int8Array(n * 2).fill(-1);
  const leakBits = new Map<number, number>();
  /** Dam cell → waters that pushed at its outlet. */
  const pushed = new Map<number, number>();
  const queue = new Int32Array(n * 2);
  const steps = new Int16Array(n * 2);

  level.tiles.forEach((tile, s) => {
    if (tile.kind !== 'source') return;
    const bit = waterBit(tile.water);
    const start = s * 2;
    if (wet[start]! & bit) return; // another spring of this water already reached it
    let head = 0;
    let tail = 0;
    wet[start] = wet[start]! | bit;
    order[start] = 0;
    entry[start] = -1;
    steps[start] = 0;
    queue[tail++] = start;
    while (head < tail) {
      const p = queue[head++]!;
      const a = p >> 1;
      const here = level.tiles[a]!;
      const m = here.kind === 'dam' ? 1 << damOutlet(here, rot[a] ?? 0) : masks[p]!;
      for (let d = 0; d < 4; d++) {
        if (!(m & (1 << d))) continue;
        const b = neighbour(level, a, d);
        const q = b < 0 ? -1 : partToward(masks, b, opposite(d));
        if (q < 0) {
          const key = a * 4 + d;
          leakBits.set(key, (leakBits.get(key) ?? 0) | bit);
          continue;
        }
        const other = level.tiles[b]!;
        if (other.kind === 'dam' && opposite(d) === damOutlet(other, rot[b] ?? 0)) {
          pushed.set(b, (pushed.get(b) ?? 0) | bit);
          continue;
        }
        if (wet[q]! & bit) continue;
        wet[q] = wet[q]! | bit;
        const k = steps[p]! + 1;
        steps[q] = k;
        if (order[q]! < 0 || order[q]! > k) {
          order[q] = k;
          entry[q] = opposite(d);
        }
        queue[tail++] = q;
      }
    }
  });

  const leaks: Leak[] = [];
  for (const [key, water] of leakBits) leaks.push({ at: key >> 2, dir: (key & 3) as Dir, water });
  leaks.sort((x, y) => x.at - y.at || x.dir - y.dir);
  // A dam is blocked only when water pushes at its outlet and none comes in by its inlet.
  const blocked: number[] = [];
  for (const [at, bits] of pushed) if ((wet[at * 2]! & bits) !== bits) blocked.push(at);
  blocked.sort((x, y) => x - y);

  const fields = new Map<number, FieldState>();
  let fieldsWet = 0;
  let fieldsTotal = 0;
  let dry = 0;
  let mixed = 0;
  level.tiles.forEach((tile, a) => {
    if (tile.kind === 'rock') return;
    const parts = tile.kind === 'bridge' ? 2 : 1;
    for (let k = 0; k < parts; k++) {
      const w = wet[a * 2 + k]!;
      if (w === 0) dry++;
      if (w === 3) mixed++;
    }
    if (tile.kind === 'field') {
      fieldsTotal++;
      const w = wet[a * 2]!;
      const state: FieldState = w === 0 ? 'dry' : w === waterBit(tile.water) ? 'wet' : 'wrong';
      if (state === 'wet') fieldsWet++;
      fields.set(a, state);
    }
  });
  const solved = dry === 0 && mixed === 0 && leaks.length === 0 && fieldsWet === fieldsTotal;
  return {
    masks,
    wet,
    order,
    entry,
    leaks,
    blocked,
    fields,
    fieldsWet,
    fieldsTotal,
    dry,
    mixed,
    solved,
  };
}

/** Whether every tile at `rot` makes a solved board. */
export function isSolved(level: Level, rot: ArrayLike<number>): boolean {
  return flow(level, rot).solved;
}

/** The solved orientation's rotations (every tile at 0). */
export function solvedRotations(level: Level): number[] {
  return level.tiles.map(() => 0);
}
