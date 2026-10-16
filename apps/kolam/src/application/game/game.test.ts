import { CROSS, LINE, NO_CLUE, UNKNOWN, type Puzzle } from '@/domain/entities/Board';
import { gridOf, hEdge, vEdge } from '../engine/grid';
import { isSolved } from '../engine/rules';
import { solve } from '../engine/solver';
import { levelFor, sample } from '../levels/levels';
import { findHint, type HintKind } from './hint';
import {
  apply,
  autoCrosses,
  clock,
  decodeMarks,
  encodeMarks,
  nextMark,
  redo,
  reset,
  startHistory,
  undo,
} from './play';

describe('play', () => {
  it('cycles a tapped edge: empty, line, cross, empty', () => {
    expect(nextMark(UNKNOWN)).toBe(LINE);
    expect(nextMark(LINE)).toBe(CROSS);
    expect(nextMark(CROSS)).toBe(UNKNOWN);
  });

  it('undoes and redoes moves, and a stroke as one move', () => {
    let h = startHistory(new Uint8Array(12));
    h = apply(h, [{ edge: 0, mark: LINE }]);
    h = apply(h, [{ edge: 1, mark: LINE }]);
    h = apply(h, [{ edge: 2, mark: LINE }], true);
    expect(h.past).toHaveLength(2);
    h = undo(h);
    expect(Array.from(h.marks.slice(0, 3))).toEqual([LINE, UNKNOWN, UNKNOWN]);
    h = redo(h);
    expect(Array.from(h.marks.slice(0, 3))).toEqual([LINE, LINE, LINE]);
    // A new move clears what could be redone.
    h = undo(h);
    h = apply(h, [{ edge: 5, mark: CROSS }]);
    expect(h.future).toHaveLength(0);
    expect(redo(h)).toBe(h);
    // Moves that change nothing are not recorded.
    expect(apply(h, [{ edge: 5, mark: CROSS }])).toBe(h);
  });

  it('resets as one undoable move', () => {
    let h = startHistory(new Uint8Array(6));
    h = apply(h, [
      { edge: 0, mark: LINE },
      { edge: 3, mark: CROSS },
    ]);
    h = reset(h);
    expect(Array.from(h.marks)).toEqual([0, 0, 0, 0, 0, 0]);
    h = undo(h);
    expect(h.marks[0]).toBe(LINE);
    expect(h.marks[3]).toBe(CROSS);
  });

  it('shows the open sides of complete numbers as crossed, without storing them', () => {
    const p: Puzzle = { rows: 2, cols: 2, clues: [1, NO_CLUE, NO_CLUE, 2] };
    const g = gridOf(2, 2);
    const marks = new Uint8Array(g.edgeCount);
    marks[hEdge(g, 0, 0)] = LINE;
    const auto = autoCrosses(p, marks);
    expect([...auto].sort((a, b) => a - b)).toEqual(
      [hEdge(g, 1, 0), vEdge(g, 0, 0), vEdge(g, 0, 1)].sort((a, b) => a - b),
    );
    expect(marks[vEdge(g, 0, 0)]).toBe(UNKNOWN);
    marks[hEdge(g, 0, 0)] = UNKNOWN;
    expect(autoCrosses(p, marks).size).toBe(0);
  });

  it('saves and restores marks', () => {
    const marks = Uint8Array.from([0, 1, 2, 1, 0]);
    expect(encodeMarks(marks)).toBe('01210');
    expect(Array.from(decodeMarks('01210', 5))).toEqual([0, 1, 2, 1, 0]);
    expect(Array.from(decodeMarks('0121', 5))).toEqual([0, 0, 0, 0, 0]);
    expect(Array.from(decodeMarks(undefined, 2))).toEqual([0, 0]);
  });

  it('formats a clock', () => {
    expect(clock(0)).toBe('0:00');
    expect(clock(190)).toBe('3:10');
    expect(clock(3725)).toBe('1:02:05');
  });
});

/** Takes hints from a blank board until solved; every hint must agree with the answer. */
function solveWithHints(p: Puzzle): { kinds: HintKind[]; solved: boolean } {
  const solution = solve(p)!;
  const g = gridOf(p.rows, p.cols);
  let marks = new Uint8Array(g.edgeCount);
  const kinds: HintKind[] = [];
  for (let i = 0; i < g.edgeCount && !isSolved(p, marks); i++) {
    const hint = findHint(p, marks, solution);
    kinds.push(hint.kind);
    expect(hint.changes.length).toBeGreaterThan(0);
    for (const c of hint.changes) {
      expect(c.mark).toBe(LINE);
      expect(solution[c.edge]).toBe(LINE);
    }
    marks = marks.slice();
    for (const c of hint.changes) marks[c.edge] = c.mark;
  }
  return { kinds, solved: isSolved(p, marks) };
}

describe('hints', () => {
  it('solve every early level step by step, each step correct', () => {
    const seen = new Set<HintKind>();
    for (let n = 1; n <= 30; n++) {
      const { kinds, solved } = solveWithHints(levelFor(n).puzzle);
      expect(solved).toBe(true);
      kinds.forEach((k) => seen.add(k));
    }
    // The early levels teach through real reasons, not by revealing answers.
    for (const kind of ['needsAll', 'extend', 'corner3', 'adjacent3'] as const) {
      expect(seen.has(kind)).toBe(true);
    }
  });

  it('solve a sample of later levels, mostly by reasoning', () => {
    let reveals = 0;
    let total = 0;
    for (const n of sample(8, 31, 300, 77)) {
      const { kinds, solved } = solveWithHints(levelFor(n).puzzle);
      expect(solved).toBe(true);
      reveals += kinds.filter((k) => k === 'reveal').length;
      total += kinds.length;
    }
    expect(reveals / total).toBeLessThan(0.1);
  });

  it('point out a wrong line first, and clear it', () => {
    const p = levelFor(3).puzzle;
    const solution = solve(p)!;
    const marks = new Uint8Array(solution.length);
    const wrong = solution.findIndex((v) => v !== LINE);
    marks[wrong] = LINE;
    const hint = findHint(p, marks, solution);
    expect(hint.kind).toBe('mistake');
    expect(hint.changes).toEqual([{ edge: wrong, mark: UNKNOWN }]);
  });

  it('point out a cross on the loop', () => {
    const p = levelFor(3).puzzle;
    const solution = solve(p)!;
    const marks = new Uint8Array(solution.length);
    const onLoop = solution.findIndex((v) => v === LINE);
    marks[onLoop] = CROSS;
    expect(findHint(p, marks, solution).kind).toBe('mistake');
  });

  it('reveal a piece of the answer when nothing can be worked out', () => {
    // An empty board has many answers; nothing follows for sure.
    const p: Puzzle = { rows: 3, cols: 3, clues: Array.from({ length: 9 }, () => NO_CLUE) };
    const g = gridOf(3, 3);
    const solution = new Uint8Array(g.edgeCount);
    for (const e of [hEdge(g, 0, 0), hEdge(g, 1, 0), vEdge(g, 0, 0), vEdge(g, 0, 1)])
      solution[e] = LINE;
    const hint = findHint(p, new Uint8Array(g.edgeCount), solution);
    expect(hint.kind).toBe('reveal');
    expect(solution[hint.changes[0]!.edge]).toBe(LINE);
  });

  it('explain a 3 in a corner', () => {
    // Level 5 teaches the corner 3; its first idea-based hint is about one.
    const p = levelFor(5).puzzle;
    const { kinds } = solveWithHints(p);
    expect(kinds).toContain('corner3');
  });
});
