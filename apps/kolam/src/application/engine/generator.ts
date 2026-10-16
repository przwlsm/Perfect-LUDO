import { random } from 'app-kit';
import { LINE, NO_CLUE, type Puzzle, type Tier } from '@/domain/entities/Board';
import { gridOf } from './grid';
import { loopOrder, type Marks } from './rules';
import { countSolutions, gradePuzzle, solveLogic } from './solver';

export interface GenSpec {
  readonly rows: number;
  readonly cols: number;
  /**
   * The hardest idea a solver may need: clues are only removed while tiers
   * up to this one still solve the board (4 = any unique board).
   */
  readonly tier: Tier;
  /** Keep at least this share of the numbers (0–1); more numbers, gentler board. */
  readonly keep?: number;
  /** Share of the cells inside the loop, as [min, max]. */
  readonly fill?: readonly [number, number];
}

export interface Generated {
  readonly puzzle: Puzzle;
  /** The one answer (LINE on loop edges, 0 elsewhere). */
  readonly solution: Marks;
  /** The easiest tier that solves it. */
  readonly tier: Tier;
}

/**
 * Builds a puzzle from a seed (the same seed always gives the same board):
 *
 * 1. Grow a random region of cells, one neighbour at a time, keeping both
 *    the region and everything outside it connected. Its boundary is then
 *    one closed loop: the answer.
 * 2. Number every cell by how many of its sides the loop uses.
 * 3. Take numbers away in a random order, putting each back if the board
 *    stops being solvable by the allowed ideas (which also keeps the answer
 *    unique).
 */
export function generate(spec: GenSpec, seed: number): Generated {
  const rnd = random(seed);
  for (let attempt = 0; ; attempt++) {
    const inside = growRegion(spec, rnd);
    const solution = boundary(spec.rows, spec.cols, inside);
    const full: Puzzle = { rows: spec.rows, cols: spec.cols, clues: cluesFor(spec, solution) };
    if (!loopOrder(full, solution)) continue; // Never happens for a sound region; be safe.
    const puzzle = thin(full, spec, rnd);
    if (!puzzle && attempt < 8) continue;
    const final = puzzle ?? full;
    return { puzzle: final, solution, tier: gradePuzzle(final) };
  }
}

function shuffle<T>(list: T[], rnd: () => number): T[] {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [list[i], list[j]] = [list[j]!, list[i]!];
  }
  return list;
}

function neighbours(rows: number, cols: number, cell: number): number[] {
  const r = Math.floor(cell / cols);
  const c = cell % cols;
  const out: number[] = [];
  if (r > 0) out.push(cell - cols);
  if (r < rows - 1) out.push(cell + cols);
  if (c > 0) out.push(cell - 1);
  if (c < cols - 1) out.push(cell + 1);
  return out;
}

/** True when every cell outside the region can reach the board's edge through outside cells. */
function outsideConnected(rows: number, cols: number, inside: Uint8Array): boolean {
  const n = rows * cols;
  const seen = new Uint8Array(n);
  const stack: number[] = [];
  let outside = 0;
  for (let cell = 0; cell < n; cell++) {
    if (inside[cell]) continue;
    outside++;
    const r = Math.floor(cell / cols);
    const c = cell % cols;
    if (r === 0 || c === 0 || r === rows - 1 || c === cols - 1) {
      seen[cell] = 1;
      stack.push(cell);
    }
  }
  let reached = stack.length;
  while (stack.length) {
    const cell = stack.pop()!;
    for (const m of neighbours(rows, cols, cell)) {
      if (inside[m] || seen[m]) continue;
      seen[m] = 1;
      reached++;
      stack.push(m);
    }
  }
  return reached === outside;
}

/**
 * A wandering region: cells with only one neighbour inside are favoured,
 * so the region grows arms and the loop around it winds.
 */
function growRegion(spec: GenSpec, rnd: () => number): Uint8Array {
  const { rows, cols } = spec;
  const n = rows * cols;
  const [lo, hi] = spec.fill ?? [0.42, 0.6];
  const target = Math.max(2, Math.round(n * (lo + rnd() * (hi - lo))));
  const inside = new Uint8Array(n);
  const r0 = rows > 2 ? 1 + Math.floor(rnd() * (rows - 2)) : 0;
  const c0 = cols > 2 ? 1 + Math.floor(rnd() * (cols - 2)) : 0;
  inside[r0 * cols + c0] = 1;
  let size = 1;
  while (size < target) {
    const weighted: { cell: number; weight: number }[] = [];
    for (let cell = 0; cell < n; cell++) {
      if (inside[cell]) continue;
      let touching = 0;
      for (const m of neighbours(rows, cols, cell)) if (inside[m]) touching++;
      if (touching === 0) continue;
      weighted.push({ cell, weight: touching === 1 ? 4 : touching === 2 ? 1.2 : 0.35 });
    }
    let added = false;
    while (weighted.length) {
      const total = weighted.reduce((s, w) => s + w.weight, 0);
      let pick = rnd() * total;
      let index = 0;
      while (index < weighted.length - 1 && pick >= weighted[index]!.weight) {
        pick -= weighted[index]!.weight;
        index++;
      }
      const { cell } = weighted.splice(index, 1)[0]!;
      inside[cell] = 1;
      if (outsideConnected(rows, cols, inside)) {
        added = true;
        size++;
        break;
      }
      inside[cell] = 0;
    }
    if (!added) break;
  }
  return inside;
}

/** The region's boundary as loop marks. */
function boundary(rows: number, cols: number, inside: Uint8Array): Marks {
  const g = gridOf(rows, cols);
  const marks = new Uint8Array(g.edgeCount);
  for (let e = 0; e < g.edgeCount; e++) {
    const a = g.edgeCells[e * 2]!;
    const b = g.edgeCells[e * 2 + 1]!;
    const ia = a >= 0 && inside[a] === 1;
    const ib = b >= 0 && inside[b] === 1;
    if (ia !== ib) marks[e] = LINE;
  }
  return marks;
}

function cluesFor(spec: GenSpec, solution: Marks): number[] {
  const g = gridOf(spec.rows, spec.cols);
  return Array.from({ length: g.cellCount }, (_, cell) => {
    let n = 0;
    for (let k = 0; k < 4; k++) if (solution[g.cellEdges[cell * 4 + k]!] === LINE) n++;
    return n;
  });
}

/** True when the allowed ideas still solve the board (and so its answer is unique). */
export function solvableWithin(p: Puzzle, tier: Tier): boolean {
  if (tier <= 3) return solveLogic(p, tier).solved;
  return countSolutions(p, 2) === 1;
}

function thin(full: Puzzle, spec: GenSpec, rnd: () => number): Puzzle | null {
  if (!solvableWithin(full, spec.tier)) return null;
  const clues = full.clues.slice();
  const n = clues.length;
  const minKeep = Math.ceil(n * (spec.keep ?? 0));
  let kept = n;
  const order = shuffle(
    Array.from({ length: n }, (_, i) => i),
    rnd,
  );
  for (const cell of order) {
    if (kept <= minKeep) break;
    const saved = clues[cell]!;
    clues[cell] = NO_CLUE;
    if (solvableWithin({ rows: full.rows, cols: full.cols, clues }, spec.tier)) kept--;
    else clues[cell] = saved;
  }
  return { rows: full.rows, cols: full.cols, clues };
}
