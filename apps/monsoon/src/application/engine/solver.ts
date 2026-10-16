import { isFixed, opposite, openings, period, type Level } from '@/domain/entities/Board';
import { flow, neighbour, partOfSide, waterBit } from './flow';

/**
 * Finds the ways a board can be turned to be solved.
 *
 * Each tile has a domain: the rotations it may still take (a straight has
 * two that differ, a bend four, a fixed tile one). Two ideas do the work:
 *
 * 1. Edge matching. Water can only pass where both neighbours are open, and
 *    no open end may face a closed side, a rock or the edge of the board.
 *    So every side shared by two cells is either open on both or closed on
 *    both; whenever a cell's remaining rotations all agree about one side,
 *    the neighbour must agree too. This propagates until nothing changes.
 * 2. Islands. Tiles that are settled and joined form pieces of network. A
 *    piece that is closed off (no unsettled tile can still join it) must
 *    hold a spring, or its channels would stay dry; and any piece holding
 *    two waters, or a field of the other water, is already wrong.
 *
 * When propagation stalls, it guesses the tile with the fewest rotations
 * left and backtracks. Every complete board is checked with the real flow
 * rules (dams included). Deterministic, and budgeted by search nodes.
 */
export interface SolveOptions {
  /** Stop after this many solutions (2 is enough to know whether a board is unique). */
  readonly limit?: number;
  /** Cells whose rotation is already decided (hinted tiles). */
  readonly pinned?: ReadonlyMap<number, number>;
  /** Search nodes before giving up. */
  readonly maxNodes?: number;
}

export interface SolveResult {
  /** Each solution's rotations, normalised to the tile's distinct facings (0..period-1). */
  readonly solutions: number[][];
  /** Guesses made: a measure of how much deduction alone could not settle. */
  readonly nodes: number;
  /** False when the node budget ran out before the search finished. */
  readonly complete: boolean;
}

interface Compiled {
  readonly level: Level;
  readonly n: number;
  /** open[a * 4 + r]: openings of cell a at rotation r. */
  readonly open: Uint8Array;
  /** nb[a * 4 + d]: neighbour of a towards d, -1 off the board or at a rock. */
  readonly nb: Int32Array;
  /** Bits for the rotations each cell can take at all. */
  readonly full: Uint8Array;
  /** Per part: water bit of a spring there, else 0. */
  readonly spring: Uint8Array;
  /** Per part: water bit a field there needs, else 0. */
  readonly need: Uint8Array;
  readonly isNet: Uint8Array;
}

function compile(level: Level): Compiled {
  const n = level.tiles.length;
  const open = new Uint8Array(n * 4);
  const nb = new Int32Array(n * 4);
  const full = new Uint8Array(n);
  const spring = new Uint8Array(n * 2);
  const need = new Uint8Array(n * 2);
  const isNet = new Uint8Array(n);
  level.tiles.forEach((tile, a) => {
    const p = period(tile);
    full[a] =
      tile.kind === 'rock' ? 1 : isFixed(tile) ? 1 << ((level.start[a] ?? 0) % p) : (1 << p) - 1;
    isNet[a] = tile.kind === 'rock' ? 0 : 1;
    for (let r = 0; r < 4; r++) open[a * 4 + r] = openings(tile, r);
    for (let d = 0; d < 4; d++) {
      const b = neighbour(level, a, d);
      nb[a * 4 + d] = b >= 0 && level.tiles[b]!.kind !== 'rock' ? b : -1;
    }
    if (tile.kind === 'source') spring[a * 2] = waterBit(tile.water);
    if (tile.kind === 'field') need[a * 2] = waterBit(tile.water);
  });
  return { level, n, open, nb, full, spring, need, isNet };
}

/** Rotations in `dom` whose side `d` is open (want = true) or closed. */
function keepSide(c: Compiled, a: number, dom: number, d: number, want: boolean): number {
  let out = 0;
  for (let r = 0; r < 4; r++) {
    if (!(dom & (1 << r))) continue;
    const isOpen = (c.open[a * 4 + r]! & (1 << d)) !== 0;
    if (isOpen === want) out |= 1 << r;
  }
  return out;
}

/** Arc consistency over shared sides. Returns false on a contradiction. */
function propagate(c: Compiled, dom: Uint8Array, queue: number[]): boolean {
  const inQueue = new Uint8Array(c.n);
  for (const a of queue) inQueue[a] = 1;
  while (queue.length) {
    const a = queue.pop()!;
    inQueue[a] = 0;
    const da = dom[a]!;
    for (let d = 0; d < 4; d++) {
      let canOpen = false;
      let canClose = false;
      for (let r = 0; r < 4; r++) {
        if (!(da & (1 << r))) continue;
        if (c.open[a * 4 + r]! & (1 << d)) canOpen = true;
        else canClose = true;
      }
      const b = c.nb[a * 4 + d]!;
      if (b < 0) {
        if (!canClose) return false;
        if (canOpen) {
          const next = keepSide(c, a, dom[a]!, d, false);
          if (!next) return false;
          if (next !== dom[a]) {
            dom[a] = next;
            if (!inQueue[a]) {
              inQueue[a] = 1;
              queue.push(a);
            }
          }
        }
        continue;
      }
      if (canOpen && canClose) continue;
      const db = dom[b]!;
      const next = keepSide(c, b, db, opposite(d), canOpen);
      if (!next) return false;
      if (next !== db) {
        dom[b] = next;
        if (!inQueue[b]) {
          inQueue[b] = 1;
          queue.push(b);
        }
      }
    }
  }
  return true;
}

function single(dom: number): number {
  // Index of the only bit, or -1 when there are several.
  if (dom === 0 || dom & (dom - 1)) return -1;
  return 31 - Math.clz32(dom);
}

/**
 * Pieces of settled network. Fails when a closed piece has no spring, or any
 * piece holds both waters or a field of the other water.
 */
function islandsOk(c: Compiled, dom: Uint8Array): boolean {
  const n = c.n;
  const parent = new Int32Array(n * 2);
  for (let i = 0; i < n * 2; i++) parent[i] = i;
  const find = (x: number): number => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]!]!;
      x = parent[x]!;
    }
    return x;
  };
  const tiles = c.level.tiles;
  const rotOf = new Int8Array(n);
  for (let a = 0; a < n; a++) rotOf[a] = c.isNet[a] ? single(dom[a]!) : -1;
  for (let a = 0; a < n; a++) {
    const r = rotOf[a]!;
    if (r < 0) continue;
    const m = c.open[a * 4 + r]!;
    // Only east and south, so each shared side is joined once.
    for (const d of [1, 2]) {
      if (!(m & (1 << d))) continue;
      const b = c.nb[a * 4 + d]!;
      if (b < 0 || rotOf[b]! < 0) continue;
      const pa = a * 2 + partOfSide(tiles[a]!, d);
      const pb = b * 2 + partOfSide(tiles[b]!, opposite(d));
      const ra = find(pa);
      const rb = find(pb);
      if (ra !== rb) parent[ra] = rb;
    }
  }
  const springs = new Uint8Array(n * 2);
  const needs = new Uint8Array(n * 2);
  const open = new Uint8Array(n * 2);
  const used = new Uint8Array(n * 2);
  for (let a = 0; a < n; a++) {
    const r = rotOf[a]!;
    if (r < 0) continue;
    const m = c.open[a * 4 + r]!;
    const parts = tiles[a]!.kind === 'bridge' ? 2 : 1;
    for (let k = 0; k < parts; k++) {
      const root = find(a * 2 + k);
      used[root] = 1;
      springs[root] = springs[root]! | c.spring[a * 2 + k]!;
      needs[root] = needs[root]! | c.need[a * 2 + k]!;
    }
    for (let d = 0; d < 4; d++) {
      if (!(m & (1 << d))) continue;
      const b = c.nb[a * 4 + d]!;
      if (b >= 0 && rotOf[b]! < 0) open[find(a * 2 + partOfSide(tiles[a]!, d))] = 1;
    }
  }
  for (let p = 0; p < n * 2; p++) {
    if (!used[p] || find(p) !== p) continue;
    const s = springs[p]!;
    if (s === 3) return false;
    if (needs[p]! === 3) return false;
    if (s && needs[p]! && s !== needs[p]) return false;
    if (!open[p] && !s) return false;
  }
  return true;
}

export function solve(level: Level, options: SolveOptions = {}): SolveResult {
  const limit = options.limit ?? 2;
  const maxNodes = options.maxNodes ?? 200_000;
  const c = compile(level);
  const dom = Uint8Array.from(c.full);
  if (options.pinned) {
    for (const [a, r] of options.pinned) {
      const tile = level.tiles[a];
      if (!tile) continue;
      dom[a] = 1 << ((r & 3) % period(tile));
    }
  }
  const solutions: number[][] = [];
  let nodes = 0;
  let complete = true;

  const all: number[] = [];
  for (let a = 0; a < c.n; a++) if (c.isNet[a]) all.push(a);
  if (!propagate(c, dom, [...all]) || !islandsOk(c, dom)) {
    return { solutions, nodes, complete };
  }

  const search = (d: Uint8Array): void => {
    if (solutions.length >= limit) return;
    if (nodes >= maxNodes) {
      complete = false;
      return;
    }
    // The open cell with the fewest rotations left, preferring one next to settled tiles.
    let best = -1;
    let bestScore = Infinity;
    for (const a of all) {
      const da = d[a]!;
      if (single(da) >= 0) continue;
      let size = 0;
      for (let m = da; m; m &= m - 1) size++;
      let settledNear = 0;
      for (let k = 0; k < 4; k++) {
        const b = c.nb[a * 4 + k]!;
        if (b < 0 || single(d[b]!) >= 0) settledNear++;
      }
      const score = size * 8 - settledNear;
      if (score < bestScore) {
        bestScore = score;
        best = a;
      }
    }
    if (best < 0) {
      const rot = Array.from(d, (x, a) => (c.isNet[a] ? single(x) : 0));
      if (flow(level, rot).solved) solutions.push(rot);
      return;
    }
    const db = d[best]!;
    for (let r = 0; r < 4; r++) {
      if (!(db & (1 << r))) continue;
      nodes++;
      const next = Uint8Array.from(d);
      next[best] = 1 << r;
      if (propagate(c, next, [best]) && islandsOk(c, next)) search(next);
      if (solutions.length >= limit || nodes >= maxNodes) {
        if (nodes >= maxNodes && solutions.length < limit) complete = false;
        return;
      }
    }
  };
  search(dom);
  return { solutions, nodes, complete };
}

/** Number of solutions, counting at most `limit` (2: "one" or "more than one"). */
export function countSolutions(level: Level, limit = 2): number {
  return solve(level, { limit }).solutions.length;
}
