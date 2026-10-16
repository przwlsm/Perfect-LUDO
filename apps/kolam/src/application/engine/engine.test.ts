import { CROSS, LINE, NO_CLUE, UNKNOWN, type Puzzle } from '@/domain/entities/Board';
import { generate } from './generator';
import { dotAt, gridOf, hEdge, vEdge, type Grid } from './grid';
import {
  branchingDots,
  brokenCells,
  insideCells,
  isSolved,
  linePieces,
  loopOrder,
  mistakes,
  satisfiedCells,
  type Marks,
} from './rules';
import { countSolutions, gradePuzzle, propagate, solve, solveLogic } from './solver';

const blank = (rows: number, cols: number): Puzzle => ({
  rows,
  cols,
  clues: Array.from({ length: rows * cols }, () => NO_CLUE),
});

/** Marks with LINE on the given edges. */
function lines(g: Grid, edges: number[]): Marks {
  const m = new Uint8Array(g.edgeCount);
  for (const e of edges) m[e] = LINE;
  return m;
}

/** The loop around a set of cells (its boundary). */
function around(g: Grid, cells: number[]): Marks {
  const inside = new Set(cells);
  const m = new Uint8Array(g.edgeCount);
  for (let e = 0; e < g.edgeCount; e++) {
    const a = g.edgeCells[e * 2]!;
    const b = g.edgeCells[e * 2 + 1]!;
    if (inside.has(a) !== inside.has(b)) m[e] = LINE;
  }
  return m;
}

/**
 * Every answer by brute force, independent of the solver: try every set of
 * cells as the inside of the loop and keep those whose boundary is a valid
 * solution by the rule checks alone.
 */
function bruteForceCount(p: Puzzle): number {
  const g = gridOf(p.rows, p.cols);
  let count = 0;
  for (let mask = 1; mask < 1 << g.cellCount; mask++) {
    const cells: number[] = [];
    for (let c = 0; c < g.cellCount; c++) if (mask & (1 << c)) cells.push(c);
    if (isSolved(p, around(g, cells))) count++;
  }
  return count;
}

describe('grid', () => {
  it('numbers dots, edges and cells consistently', () => {
    const g = gridOf(2, 3);
    expect(g.dotCount).toBe(12);
    expect(g.edgeCount).toBe(3 * 3 + 2 * 4);
    expect(g.cellCount).toBe(6);
    // Corner dots have two edges, side dots three, inner dots four.
    expect(g.dotEdges[dotAt(g, 0, 0)]).toHaveLength(2);
    expect(g.dotEdges[dotAt(g, 0, 1)]).toHaveLength(3);
    expect(g.dotEdges[dotAt(g, 1, 1)]).toHaveLength(4);
    // Cell (1, 2): top, bottom, left, right.
    const cell = 1 * 3 + 2;
    expect(Array.from(g.cellEdges.slice(cell * 4, cell * 4 + 4))).toEqual([
      hEdge(g, 1, 2),
      hEdge(g, 2, 2),
      vEdge(g, 1, 2),
      vEdge(g, 1, 3),
    ]);
    // Every edge borders the cells that list it.
    for (let c = 0; c < g.cellCount; c++) {
      for (let k = 0; k < 4; k++) {
        const e = g.cellEdges[c * 4 + k]!;
        expect([g.edgeCells[e * 2], g.edgeCells[e * 2 + 1]]).toContain(c);
      }
    }
    expect(gridOf(2, 3)).toBe(g);
  });
});

describe('rule checks on hand-made boards', () => {
  const g = gridOf(2, 2);
  const square = around(g, [0, 1, 2, 3]);

  it('accepts one loop that satisfies every number', () => {
    const p: Puzzle = { rows: 2, cols: 2, clues: [2, 2, 2, 2] };
    expect(isSolved(p, square)).toBe(true);
    expect(brokenCells(p, square)).toEqual([]);
    expect(satisfiedCells(p, square).size).toBe(4);
    expect(loopOrder(p, square)).toHaveLength(8);
    expect([...insideCells(p, square)].sort()).toEqual([0, 1, 2, 3]);
  });

  it('rejects a loop that disagrees with a number', () => {
    const p: Puzzle = { rows: 2, cols: 2, clues: [3, NO_CLUE, NO_CLUE, NO_CLUE] };
    expect(isSolved(p, square)).toBe(false);
    const single = around(g, [0]);
    expect(isSolved({ rows: 2, cols: 2, clues: [3, NO_CLUE, NO_CLUE, NO_CLUE] }, single)).toBe(
      false,
    );
    expect(brokenCells(p, single)).toEqual([0]);
  });

  it('flags numbers with too many lines and numbers that can no longer be met', () => {
    const p: Puzzle = { rows: 2, cols: 2, clues: [1, NO_CLUE, NO_CLUE, 3] };
    const m = lines(g, [hEdge(g, 0, 0), vEdge(g, 0, 0)]);
    expect(brokenCells(p, m)).toEqual([0]);
    const crossed = new Uint8Array(g.edgeCount);
    crossed[hEdge(g, 2, 1)] = CROSS;
    crossed[vEdge(g, 1, 2)] = CROSS;
    expect(brokenCells(p, crossed)).toEqual([3]);
  });

  it('finds branches and separate loops', () => {
    const p = blank(1, 3);
    const g3 = gridOf(1, 3);
    const two = around(g3, [0, 2]);
    expect(linePieces(g3, two)).toHaveLength(2);
    expect(isSolved(p, two)).toBe(false);
    expect(loopOrder(p, two)).toBeNull();
    // A T: the middle top dot gets three lines.
    const t = lines(g3, [hEdge(g3, 0, 0), hEdge(g3, 0, 1), vEdge(g3, 0, 1)]);
    expect(branchingDots(p, t)).toEqual([dotAt(g3, 0, 1)]);
  });

  it('never accepts an open path or an empty board', () => {
    const p = blank(2, 2);
    expect(isSolved(p, new Uint8Array(g.edgeCount))).toBe(false);
    expect(isSolved(p, lines(g, [hEdge(g, 0, 0), hEdge(g, 0, 1)]))).toBe(false);
  });

  it('lists wrong marks against an answer', () => {
    const solution = around(g, [0]);
    const marks = new Uint8Array(g.edgeCount);
    marks[hEdge(g, 0, 0)] = LINE; // right
    marks[hEdge(g, 0, 1)] = LINE; // wrong
    marks[vEdge(g, 0, 0)] = CROSS; // wrong: it is part of the loop
    marks[vEdge(g, 1, 2)] = CROSS; // right
    expect(mistakes(marks, solution).sort((a, b) => a - b)).toEqual(
      [hEdge(g, 0, 1), vEdge(g, 0, 0)].sort((a, b) => a - b),
    );
  });
});

describe('solver', () => {
  it('counts every loop of an empty 2×2 board (13)', () => {
    expect(countSolutions(blank(2, 2), 100)).toBe(13);
    expect(bruteForceCount(blank(2, 2))).toBe(13);
  });

  it('agrees with brute force on empty 3×3 and 3×4 boards', () => {
    expect(countSolutions(blank(3, 3), 10_000)).toBe(bruteForceCount(blank(3, 3)));
    expect(countSolutions(blank(3, 4), 100_000)).toBe(bruteForceCount(blank(3, 4)));
  });

  it('agrees with brute force on clued boards', () => {
    for (let seed = 1; seed <= 25; seed++) {
      const made = generate({ rows: 3, cols: 4, tier: 4 }, seed);
      // Drop some more numbers so several answers are possible.
      const clues = made.puzzle.clues.map((c, i) => ((i * 7 + seed) % 3 === 0 ? NO_CLUE : c));
      const p: Puzzle = { rows: 3, cols: 4, clues };
      expect(countSolutions(p, 100_000)).toBe(bruteForceCount(p));
    }
  });

  it('has no answer for impossible numbers', () => {
    expect(countSolutions({ rows: 1, cols: 1, clues: [3] })).toBe(0);
    expect(countSolutions({ rows: 1, cols: 1, clues: [NO_CLUE] })).toBe(1);
    expect(solve({ rows: 1, cols: 1, clues: [2] })).toBeNull();
  });

  it('crosses every side of a 0', () => {
    const p: Puzzle = {
      rows: 3,
      cols: 3,
      clues: [NO_CLUE, NO_CLUE, NO_CLUE, NO_CLUE, 0, NO_CLUE, NO_CLUE, NO_CLUE, NO_CLUE],
    };
    const g = gridOf(3, 3);
    const m = new Uint8Array(g.edgeCount);
    expect(propagate(p, m, 1)).toBe(true);
    for (let k = 0; k < 4; k++) expect(m[g.cellEdges[4 * 4 + k]!]).toBe(CROSS);
  });

  it('draws both outer sides of a 3 in a corner (a pattern, tier 2)', () => {
    const clues = Array.from({ length: 9 }, () => NO_CLUE);
    clues[0] = 3;
    const p: Puzzle = { rows: 3, cols: 3, clues };
    const g = gridOf(3, 3);
    const t1 = new Uint8Array(g.edgeCount);
    propagate(p, t1, 1);
    expect(t1[hEdge(g, 0, 0)]).toBe(UNKNOWN);
    const t2 = new Uint8Array(g.edgeCount);
    expect(propagate(p, t2, 2)).toBe(true);
    expect(t2[hEdge(g, 0, 0)]).toBe(LINE);
    expect(t2[vEdge(g, 0, 0)]).toBe(LINE);
  });

  it('crosses both outer sides of a 1 in a corner', () => {
    const clues = Array.from({ length: 9 }, () => NO_CLUE);
    clues[2] = 1;
    const p: Puzzle = { rows: 3, cols: 3, clues };
    const g = gridOf(3, 3);
    const m = new Uint8Array(g.edgeCount);
    propagate(p, m, 2);
    expect(m[hEdge(g, 0, 2)]).toBe(CROSS);
    expect(m[vEdge(g, 0, 3)]).toBe(CROSS);
  });

  it('knows that neighbouring 3s share their middle line', () => {
    const clues = Array.from({ length: 16 }, () => NO_CLUE);
    clues[5] = 3;
    clues[6] = 3;
    const p: Puzzle = { rows: 4, cols: 4, clues };
    const g = gridOf(4, 4);
    const logic = solveLogic(p, 2);
    expect(logic.consistent).toBe(true);
    for (const e of [vEdge(g, 1, 1), vEdge(g, 1, 2), vEdge(g, 1, 3)])
      expect(logic.marks[e]).toBe(LINE);
    expect(logic.marks[vEdge(g, 0, 2)]).toBe(CROSS);
    expect(logic.marks[vEdge(g, 2, 2)]).toBe(CROSS);
  });

  it('never closes a small loop early', () => {
    // Three sides of the top-left cell are drawn; a 3 elsewhere is still unmet.
    const clues = Array.from({ length: 9 }, () => NO_CLUE);
    clues[8] = 3;
    const p: Puzzle = { rows: 3, cols: 3, clues };
    const g = gridOf(3, 3);
    const m = lines(g, [hEdge(g, 0, 0), vEdge(g, 0, 0), hEdge(g, 1, 0)]);
    expect(propagate(p, m, 1)).toBe(true);
    expect(m[vEdge(g, 0, 1)]).toBe(CROSS);
  });

  it('reports a contradiction for a branching line', () => {
    const p = blank(2, 2);
    const g = gridOf(2, 2);
    const m = lines(g, [hEdge(g, 1, 0), hEdge(g, 1, 1), vEdge(g, 0, 1)]);
    expect(propagate(p, m, 1)).toBe(false);
  });

  it('solves generated boards within their tier, and grades them', () => {
    for (let seed = 1; seed <= 6; seed++) {
      for (const tier of [1, 2, 3] as const) {
        const made = generate({ rows: 6, cols: 6, tier }, seed * 31 + tier);
        expect(made.tier).toBeLessThanOrEqual(tier);
        expect(gradePuzzle(made.puzzle)).toBe(made.tier);
        const logic = solveLogic(made.puzzle, tier);
        expect(logic.solved).toBe(true);
        expect(Array.from(logic.marks, (v) => (v === LINE ? 1 : 0))).toEqual(
          Array.from(made.solution),
        );
        expect(isSolved(made.puzzle, made.solution)).toBe(true);
      }
    }
  });
});

describe('generator', () => {
  it('builds the same board from the same seed', () => {
    const a = generate({ rows: 7, cols: 7, tier: 2 }, 42);
    const b = generate({ rows: 7, cols: 7, tier: 2 }, 42);
    expect(b.puzzle.clues).toEqual(a.puzzle.clues);
    expect(Array.from(b.solution)).toEqual(Array.from(a.solution));
    const c = generate({ rows: 7, cols: 7, tier: 2 }, 43);
    expect(c.puzzle.clues).not.toEqual(a.puzzle.clues);
  });

  it('makes one winding loop with a unique answer', () => {
    for (let seed = 1; seed <= 12; seed++) {
      const made = generate(
        { rows: 5 + (seed % 4), cols: 5 + (seed % 4), tier: seed % 2 ? 2 : 3 },
        seed,
      );
      const order = loopOrder(made.puzzle, made.solution);
      expect(order).not.toBeNull();
      // A real kolam winds: the loop is longer than a box around a quarter of the board.
      expect(order!.length).toBeGreaterThan(made.puzzle.rows * 2);
      expect(countSolutions(made.puzzle, 2)).toBe(1);
      const solved = solve(made.puzzle);
      expect(solved && Array.from(solved)).toEqual(Array.from(made.solution));
    }
  });

  it('keeps at least the asked share of numbers', () => {
    const made = generate({ rows: 5, cols: 5, tier: 1, keep: 0.6 }, 9);
    const kept = made.puzzle.clues.filter((c) => c !== NO_CLUE).length;
    expect(kept).toBeGreaterThanOrEqual(15);
  });
});
