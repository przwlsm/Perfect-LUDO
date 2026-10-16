import { CROSS, LINE, NO_CLUE, UNKNOWN, type Puzzle, type Tier } from '@/domain/entities/Board';
import { gridOf, hEdge, vEdge, type Grid } from './grid';
import type { Marks } from './rules';

/**
 * The solver works the way a person does: it repeats a handful of sure
 * deductions until nothing changes, and only then looks further.
 *
 * Tier 1 (counting): a number with all its lines crosses its other sides; a
 * number that needs every open side takes them; a dot never has one or
 * three lines; a small loop is never closed early.
 * Tier 2 (patterns): corners and pinches (a dot with only two open ways,
 * both around the same 1 or 3), a line entering a 1 or a 3 at a corner,
 * neighbouring 3s and diagonal 3s.
 * Tier 3 (looking ahead): if marking an edge one way breaks a rule after a
 * round of tier 1–2 deductions, it must be the other way.
 * Tier 4: guessing with backtracking (used only to count solutions).
 */

/** The cell whose corner the two edges make, or -1. */
export function cornerCell(g: Grid, a: number, b: number): number {
  for (let i = 0; i < 2; i++) {
    const c = g.edgeCells[a * 2 + i]!;
    if (c >= 0 && (g.edgeCells[b * 2] === c || g.edgeCells[b * 2 + 1] === c)) return c;
  }
  return -1;
}

/** Sure lines and crosses that follow from pairs of 3s alone, before anything is drawn. */
export function pairPatterns(
  p: Puzzle,
): {
  kind: 'adjacent3' | 'diagonal3';
  cells: [number, number];
  lines: number[];
  crosses: number[];
}[] {
  const g = gridOf(p.rows, p.cols);
  const three = (r: number, c: number) =>
    r >= 0 && c >= 0 && r < p.rows && c < p.cols && p.clues[r * p.cols + c] === 3;
  const out: ReturnType<typeof pairPatterns> = [];
  for (let r = 0; r < p.rows; r++) {
    for (let c = 0; c < p.cols; c++) {
      if (!three(r, c)) continue;
      const cell = r * p.cols + c;
      if (three(r, c + 1)) {
        const crosses: number[] = [];
        if (r > 0) crosses.push(vEdge(g, r - 1, c + 1));
        if (r < p.rows - 1) crosses.push(vEdge(g, r + 1, c + 1));
        out.push({
          kind: 'adjacent3',
          cells: [cell, cell + 1],
          lines: [vEdge(g, r, c), vEdge(g, r, c + 1), vEdge(g, r, c + 2)],
          crosses,
        });
      }
      if (three(r + 1, c)) {
        const crosses: number[] = [];
        if (c > 0) crosses.push(hEdge(g, r + 1, c - 1));
        if (c < p.cols - 1) crosses.push(hEdge(g, r + 1, c + 1));
        out.push({
          kind: 'adjacent3',
          cells: [cell, cell + p.cols],
          lines: [hEdge(g, r, c), hEdge(g, r + 1, c), hEdge(g, r + 2, c)],
          crosses,
        });
      }
      if (three(r + 1, c + 1)) {
        out.push({
          kind: 'diagonal3',
          cells: [cell, cell + p.cols + 1],
          lines: [hEdge(g, r, c), vEdge(g, r, c), hEdge(g, r + 2, c + 1), vEdge(g, r + 1, c + 2)],
          crosses: [],
        });
      }
      if (three(r + 1, c - 1)) {
        out.push({
          kind: 'diagonal3',
          cells: [cell, cell + p.cols - 1],
          lines: [
            hEdge(g, r, c),
            vEdge(g, r, c + 1),
            hEdge(g, r + 2, c - 1),
            vEdge(g, r + 1, c - 1),
          ],
          crosses: [],
        });
      }
    }
  }
  return out;
}

/** Union-find over dots, for telling loops from paths. */
function findRoot(parent: Int32Array, x: number): number {
  while (parent[x] !== x) {
    parent[x] = parent[parent[x]!]!;
    x = parent[x]!;
  }
  return x;
}

/**
 * Works out everything tiers 1–2 can, in place. `seed` lists the edges that
 * just changed (all cells and dots are checked when it is omitted).
 * Returns false when the marks break a rule (a contradiction).
 */
export function propagate(p: Puzzle, marks: Marks, tier: Tier, seed?: readonly number[]): boolean {
  const g = gridOf(p.rows, p.cols);
  const clues = p.clues;
  const patterns = tier >= 2;
  const cellQ: number[] = [];
  const dotQ: number[] = [];
  const inCell = new Uint8Array(g.cellCount);
  const inDot = new Uint8Array(g.dotCount);
  const touch = (e: number) => {
    for (let k = 0; k < 2; k++) {
      const c = g.edgeCells[e * 2 + k]!;
      if (c >= 0 && !inCell[c]) {
        inCell[c] = 1;
        cellQ.push(c);
      }
      const d = g.edgeDots[e * 2 + k]!;
      if (!inDot[d]) {
        inDot[d] = 1;
        dotQ.push(d);
      }
    }
  };
  if (seed) {
    for (const e of seed) touch(e);
  } else {
    for (let c = 0; c < g.cellCount; c++) {
      inCell[c] = 1;
      cellQ.push(c);
    }
    for (let d = 0; d < g.dotCount; d++) {
      inDot[d] = 1;
      dotQ.push(d);
    }
  }
  /** Sets an edge; false if it already holds the other mark. */
  const set = (e: number, v: number): boolean => {
    const m = marks[e];
    if (m === v) return true;
    if (m !== UNKNOWN) return false;
    marks[e] = v;
    touch(e);
    return true;
  };

  for (;;) {
    while (cellQ.length || dotQ.length) {
      while (cellQ.length) {
        const cell = cellQ.pop()!;
        inCell[cell] = 0;
        const clue = clues[cell]!;
        if (clue === NO_CLUE) continue;
        let lines = 0;
        let open = 0;
        for (let k = 0; k < 4; k++) {
          const m = marks[g.cellEdges[cell * 4 + k]!];
          if (m === LINE) lines++;
          else if (m === UNKNOWN) open++;
        }
        if (lines > clue || lines + open < clue) return false;
        if (open === 0) continue;
        if (lines === clue || lines + open === clue) {
          const v = lines === clue ? CROSS : LINE;
          for (let k = 0; k < 4; k++) {
            const e = g.cellEdges[cell * 4 + k]!;
            if (marks[e] === UNKNOWN) {
              marks[e] = v;
              touch(e);
            }
          }
        }
      }
      while (dotQ.length && !cellQ.length) {
        const dot = dotQ.pop()!;
        inDot[dot] = 0;
        const edges = g.dotEdges[dot]!;
        let lines = 0;
        let open = 0;
        let a = -1;
        let b = -1;
        let lineEdge = -1;
        for (const e of edges) {
          const m = marks[e];
          if (m === LINE) {
            lines++;
            lineEdge = e;
          } else if (m === UNKNOWN) {
            open++;
            if (a < 0) a = e;
            else b = e;
          }
        }
        if (lines > 2 || (lines === 1 && open === 0)) return false;
        if (open === 0) continue;
        if (lines === 2 || (lines === 0 && open === 1)) {
          for (const e of edges) if (marks[e] === UNKNOWN && !set(e, CROSS)) return false;
          continue;
        }
        if (lines === 1 && open === 1) {
          if (!set(a, LINE)) return false;
          continue;
        }
        if (!patterns || open !== 2) continue;
        const cell = cornerCell(g, a, b);
        if (cell < 0) continue;
        const clue = clues[cell]!;
        if (lines === 0) {
          // A pinch: the line turns here around this cell, or stays away.
          if (clue === 3) {
            if (!set(a, LINE) || !set(b, LINE)) return false;
          } else if (clue === 1) {
            if (!set(a, CROSS) || !set(b, CROSS)) return false;
          }
        } else if (lineEdge >= 0 && (clue === 1 || clue === 3)) {
          // A line arrives at this corner from outside and must leave by
          // exactly one of the cell's two sides here.
          for (let k = 0; k < 4; k++) {
            const e = g.cellEdges[cell * 4 + k]!;
            if (e !== a && e !== b && !set(e, clue === 3 ? LINE : CROSS)) return false;
          }
        }
      }
    }

    // Loops: a closed loop must be the only line; never close one early.
    const parent = new Int32Array(g.dotCount);
    for (let d = 0; d < g.dotCount; d++) parent[d] = d;
    let unknowns = 0;
    for (let e = 0; e < g.edgeCount; e++) {
      const m = marks[e];
      if (m === UNKNOWN) unknowns++;
      if (m !== LINE) continue;
      const x = findRoot(parent, g.edgeDots[e * 2]!);
      const y = findRoot(parent, g.edgeDots[e * 2 + 1]!);
      if (x !== y) parent[x] = y;
    }
    const edgesIn = new Int32Array(g.dotCount);
    const dotsIn = new Int32Array(g.dotCount);
    for (let e = 0; e < g.edgeCount; e++) {
      if (marks[e] === LINE) edgesIn[findRoot(parent, g.edgeDots[e * 2]!)]!++;
    }
    for (let d = 0; d < g.dotCount; d++) {
      for (const e of g.dotEdges[d]!) {
        if (marks[e] === LINE) {
          dotsIn[findRoot(parent, d)]!++;
          break;
        }
      }
    }
    let closed = -1;
    let pieces = 0;
    for (let d = 0; d < g.dotCount; d++) {
      if (parent[d] !== d || edgesIn[d] === 0) continue;
      pieces++;
      if (edgesIn[d] === dotsIn[d]) closed = d;
    }
    if (closed >= 0) {
      if (pieces > 1) return false;
      // The loop is closed: everything else is empty, and every number must agree.
      for (let e = 0; e < g.edgeCount; e++) if (marks[e] === UNKNOWN) marks[e] = CROSS;
      return cluesExact(g, clues, marks);
    }
    if (unknowns === 0) return false; // Pieces of line that never close.
    let changed = false;
    for (let e = 0; e < g.edgeCount; e++) {
      if (marks[e] !== UNKNOWN) continue;
      const x = g.edgeDots[e * 2]!;
      const y = g.edgeDots[e * 2 + 1]!;
      if (findRoot(parent, x) !== findRoot(parent, y)) continue;
      // Closing this edge makes a loop. That is wrong unless the loop would be
      // the whole answer; when it would be, nothing follows for sure (the line
      // might also go on elsewhere), so the edge is left open.
      if (pieces === 1 && closesWinning(g, clues, marks, e)) continue;
      marks[e] = CROSS;
      touch(e);
      changed = true;
    }
    if (!changed) return true;
  }
}

/** Would adding edge `e` as the last line satisfy every number? */
function closesWinning(g: Grid, clues: readonly number[], marks: Marks, e: number): boolean {
  for (let cell = 0; cell < g.cellCount; cell++) {
    const clue = clues[cell]!;
    if (clue === NO_CLUE) continue;
    let n = 0;
    for (let k = 0; k < 4; k++) {
      const f = g.cellEdges[cell * 4 + k]!;
      if (marks[f] === LINE || f === e) n++;
    }
    if (n !== clue) return false;
  }
  return true;
}

function cluesExact(g: Grid, clues: readonly number[], marks: Marks): boolean {
  for (let cell = 0; cell < g.cellCount; cell++) {
    const clue = clues[cell]!;
    if (clue === NO_CLUE) continue;
    let n = 0;
    for (let k = 0; k < 4; k++) if (marks[g.cellEdges[cell * 4 + k]!] === LINE) n++;
    if (n !== clue) return false;
  }
  return true;
}

/** Marks every pattern from pairs of 3s. False on a contradiction. */
export function applyPairs(p: Puzzle, marks: Marks): boolean {
  for (const pattern of pairPatterns(p)) {
    for (const e of pattern.lines) {
      if (marks[e] === CROSS) return false;
      marks[e] = LINE;
    }
    for (const e of pattern.crosses) {
      if (marks[e] === LINE) return false;
      marks[e] = CROSS;
    }
  }
  return true;
}

export function isComplete(marks: Marks): boolean {
  for (let e = 0; e < marks.length; e++) if (marks[e] === UNKNOWN) return false;
  return true;
}

/**
 * Looks one step ahead (tier 3): an edge whose line (or cross) leads to a
 * contradiction after tier 2 deductions takes the other mark. Repeats until
 * nothing more follows. False when the marks themselves are contradictory.
 */
function lookAhead(p: Puzzle, marks: Marks): boolean {
  let progress = true;
  while (progress && !isComplete(marks)) {
    progress = false;
    for (let e = 0; e < marks.length; e++) {
      if (marks[e] !== UNKNOWN) continue;
      for (const v of [LINE, CROSS]) {
        const trial = marks.slice();
        trial[e] = v;
        if (propagate(p, trial, 2, [e])) continue;
        marks[e] = v === LINE ? CROSS : LINE;
        if (!propagate(p, marks, 2, [e])) return false;
        progress = true;
        break;
      }
    }
  }
  return true;
}

export interface LogicResult {
  readonly marks: Marks;
  readonly solved: boolean;
  /** False when the clues contradict each other. */
  readonly consistent: boolean;
}

/** Deduces as much as `tier` allows (up to 3), from a blank board or from `start`. */
export function solveLogic(p: Puzzle, tier: Tier, start?: Marks): LogicResult {
  const marks = start ? start.slice() : new Uint8Array(gridOf(p.rows, p.cols).edgeCount);
  let ok = tier >= 2 ? applyPairs(p, marks) : true;
  ok = ok && propagate(p, marks, tier);
  if (ok && tier >= 3 && !isComplete(marks)) ok = lookAhead(p, marks);
  return { marks, solved: ok && isComplete(marks), consistent: ok };
}

/** The easiest tier that solves the puzzle without guessing; 4 if none does. */
export function gradePuzzle(p: Puzzle): Tier {
  for (const tier of [1, 2, 3] as const) if (solveLogic(p, tier).solved) return tier;
  return 4;
}

/** Picks the edge to guess on: one at the end of a line piece, with the fewest choices. */
function branchEdge(g: Grid, marks: Marks): number {
  let best = -1;
  let bestOpen = 9;
  for (let d = 0; d < g.dotCount; d++) {
    let lines = 0;
    let open = 0;
    let first = -1;
    for (const e of g.dotEdges[d]!) {
      if (marks[e] === LINE) lines++;
      else if (marks[e] === UNKNOWN) {
        open++;
        if (first < 0) first = e;
      }
    }
    if (lines === 1 && open > 0 && open < bestOpen) {
      best = first;
      bestOpen = open;
      if (open === 2) return best;
    }
  }
  if (best >= 0) return best;
  for (let e = 0; e < marks.length; e++) if (marks[e] === UNKNOWN) return e;
  return -1;
}

/**
 * Counts solutions, stopping at `limit`. Uses tier 2 deductions at every
 * step and guesses only when they stall. Solutions found are pushed to `found`.
 */
export function countSolutions(p: Puzzle, limit = 2, found?: Marks[]): number {
  const g = gridOf(p.rows, p.cols);
  const start = new Uint8Array(g.edgeCount);
  if (!applyPairs(p, start)) return 0;
  let count = 0;
  const walk = (marks: Marks, seed?: readonly number[]) => {
    if (!propagate(p, marks, 2, seed)) return;
    const e = branchEdge(g, marks);
    if (e < 0) {
      count++;
      found?.push(marks);
      return;
    }
    for (const v of [LINE, CROSS]) {
      if (count >= limit) return;
      const next = marks.slice();
      next[e] = v;
      walk(next, [e]);
    }
  };
  walk(start);
  return count;
}

/** The puzzle's solution (only lines matter), or null when it has none. */
export function solve(p: Puzzle): Marks | null {
  const logic = solveLogic(p, 3);
  if (logic.solved) return onlyLines(logic.marks);
  const found: Marks[] = [];
  countSolutions(p, 1, found);
  return found[0] ? onlyLines(found[0]) : null;
}

function onlyLines(marks: Marks): Marks {
  const out = new Uint8Array(marks.length);
  for (let e = 0; e < marks.length; e++) if (marks[e] === LINE) out[e] = LINE;
  return out;
}
