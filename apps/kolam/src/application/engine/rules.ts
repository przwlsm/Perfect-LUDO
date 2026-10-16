import { CROSS, LINE, NO_CLUE, UNKNOWN, type Puzzle } from '@/domain/entities/Board';
import { gridOf, otherDot, type Grid } from './grid';

/** The marks on every edge of a board (UNKNOWN, LINE or CROSS). */
export type Marks = Uint8Array;

export function emptyMarks(p: Puzzle): Marks {
  return new Uint8Array(gridOf(p.rows, p.cols).edgeCount);
}

export function cellCount(g: Grid, marks: Marks, cell: number, mark: number): number {
  let n = 0;
  for (let k = 0; k < 4; k++) if (marks[g.cellEdges[cell * 4 + k]!] === mark) n++;
  return n;
}

export function dotCount(g: Grid, marks: Marks, dot: number, mark: number): number {
  let n = 0;
  for (const e of g.dotEdges[dot]!) if (marks[e] === mark) n++;
  return n;
}

/**
 * Numbers that can no longer be right: more lines around them than they
 * ask for, or so many sides crossed out that they can never get enough.
 */
export function brokenCells(p: Puzzle, marks: Marks): number[] {
  const g = gridOf(p.rows, p.cols);
  const out: number[] = [];
  for (let cell = 0; cell < g.cellCount; cell++) {
    const clue = p.clues[cell]!;
    if (clue === NO_CLUE) continue;
    const lines = cellCount(g, marks, cell, LINE);
    const crosses = cellCount(g, marks, cell, CROSS);
    if (lines > clue || 4 - crosses < clue) out.push(cell);
  }
  return out;
}

/** Numbers with exactly as many lines as they ask for. */
export function satisfiedCells(p: Puzzle, marks: Marks): Set<number> {
  const g = gridOf(p.rows, p.cols);
  const out = new Set<number>();
  for (let cell = 0; cell < g.cellCount; cell++) {
    const clue = p.clues[cell]!;
    if (clue !== NO_CLUE && cellCount(g, marks, cell, LINE) === clue) out.add(cell);
  }
  return out;
}

/** Dots where the line branches (three or four lines meet). */
export function branchingDots(p: Puzzle, marks: Marks): number[] {
  const g = gridOf(p.rows, p.cols);
  const out: number[] = [];
  for (let d = 0; d < g.dotCount; d++) if (dotCount(g, marks, d, LINE) > 2) out.push(d);
  return out;
}

export function lineCount(marks: Marks): number {
  let n = 0;
  for (let e = 0; e < marks.length; e++) if (marks[e] === LINE) n++;
  return n;
}

/**
 * The connected pieces of line, each as its list of edges. A piece whose
 * every dot has two lines is a closed loop.
 */
export function linePieces(g: Grid, marks: Marks): number[][] {
  const seen = new Uint8Array(g.edgeCount);
  const pieces: number[][] = [];
  for (let start = 0; start < g.edgeCount; start++) {
    if (marks[start] !== LINE || seen[start]) continue;
    const piece: number[] = [];
    const stack = [start];
    seen[start] = 1;
    while (stack.length) {
      const e = stack.pop()!;
      piece.push(e);
      for (let k = 0; k < 2; k++) {
        const d = g.edgeDots[e * 2 + k]!;
        for (const n of g.dotEdges[d]!) {
          if (marks[n] === LINE && !seen[n]) {
            seen[n] = 1;
            stack.push(n);
          }
        }
      }
    }
    pieces.push(piece);
  }
  return pieces;
}

/**
 * The win: every number has exactly its count of lines, every dot has
 * zero or two lines, and all the lines form one closed loop. Crosses and
 * undecided edges both count as "no line".
 */
export function isSolved(p: Puzzle, marks: Marks): boolean {
  const g = gridOf(p.rows, p.cols);
  for (let cell = 0; cell < g.cellCount; cell++) {
    const clue = p.clues[cell]!;
    if (clue !== NO_CLUE && cellCount(g, marks, cell, LINE) !== clue) return false;
  }
  for (let d = 0; d < g.dotCount; d++) {
    const n = dotCount(g, marks, d, LINE);
    if (n !== 0 && n !== 2) return false;
  }
  return linePieces(g, marks).length === 1;
}

/** Only the lines of a set of marks (crosses dropped): what a solution is compared by. */
export function linesOnly(marks: Marks): Marks {
  const out = new Uint8Array(marks.length);
  for (let e = 0; e < marks.length; e++) if (marks[e] === LINE) out[e] = LINE;
  return out;
}

/**
 * The loop's dots in order around it, starting from its first dot, or null
 * when the lines are not one simple closed loop.
 */
export function loopOrder(p: Puzzle, marks: Marks): number[] | null {
  const g = gridOf(p.rows, p.cols);
  let start = -1;
  for (let e = 0; e < g.edgeCount; e++) {
    if (marks[e] === LINE) {
      start = e;
      break;
    }
  }
  if (start < 0) return null;
  const total = lineCount(marks);
  const order: number[] = [];
  const first = g.edgeDots[start * 2]!;
  let dot = first;
  let edge = start;
  for (let i = 0; i < total; i++) {
    order.push(dot);
    dot = otherDot(g, edge, dot);
    if (dot === first) return i === total - 1 ? order : null;
    const next = g.dotEdges[dot]!.filter((n) => n !== edge && marks[n] === LINE);
    if (next.length !== 1) return null;
    edge = next[0]!;
  }
  return null;
}

/** Cells inside the loop (by the even-odd rule along each row). */
export function insideCells(p: Puzzle, marks: Marks): Set<number> {
  const g = gridOf(p.rows, p.cols);
  const inside = new Set<number>();
  for (let r = 0; r < p.rows; r++) {
    let inLoop = false;
    for (let c = 0; c < p.cols; c++) {
      const cell = r * p.cols + c;
      if (marks[g.cellEdges[cell * 4 + 2]!] === LINE) inLoop = !inLoop;
      if (inLoop) inside.add(cell);
    }
  }
  return inside;
}

/** Edges whose marks disagree with a solution: a line off the loop, or a cross on it. */
export function mistakes(marks: Marks, solution: Marks): number[] {
  const out: number[] = [];
  for (let e = 0; e < marks.length; e++) {
    const m = marks[e];
    if (m === UNKNOWN) continue;
    if ((m === LINE) !== (solution[e] === LINE)) out.push(e);
  }
  return out;
}
