import { CROSS, LINE, NO_CLUE, UNKNOWN, type Mark, type Puzzle } from '@/domain/entities/Board';
import { gridOf, type Grid } from '../engine/grid';
import { mistakes, type Marks } from '../engine/rules';
import { cornerCell, pairPatterns, propagate } from '../engine/solver';

export type HintKind =
  | 'mistake'
  | 'needsAll'
  | 'extend'
  | 'corner3'
  | 'pinch3'
  | 'adjacent3'
  | 'diagonal3'
  | 'enter3'
  | 'ahead'
  | 'reveal';

export interface Hint {
  readonly kind: HintKind;
  /** The marks the hint sets (for a mistake, the edge it clears). */
  readonly changes: readonly { readonly edge: number; readonly mark: Mark }[];
  /** Cells to glow while the hint shows. */
  readonly cells: readonly number[];
  /** Dots to glow while the hint shows. */
  readonly dots: readonly number[];
  /** The number the reason talks about, if any. */
  readonly n?: number;
}

/**
 * The next thing a thoughtful player could work out, with its reason.
 *
 * A wrong mark comes first: hints never build on a mistake. Otherwise the
 * board is read with every sure "no line here" filled in quietly (players
 * rarely cross sides out), and the simplest deduction that draws a line is
 * offered: a number that needs every open side, a line that can only go one
 * way, a 3 in a corner, pairs of 3s, a line entering a 3, and finally
 * looking a few moves ahead. If none applies, one piece of the answer is
 * revealed instead.
 */
export function findHint(p: Puzzle, marks: Marks, solution: Marks): Hint {
  const g = gridOf(p.rows, p.cols);
  const wrong = mistakes(marks, solution);
  if (wrong.length) {
    const edge = wrong[0]!;
    return {
      kind: 'mistake',
      changes: [{ edge, mark: UNKNOWN }],
      cells: [],
      dots: [g.edgeDots[edge * 2]!, g.edgeDots[edge * 2 + 1]!],
    };
  }
  let known = withSureCrosses(p, marks);
  let lookedAhead = false;
  for (let round = 0; known && round < g.edgeCount; round++) {
    const found = lineDeduction(p, g, known);
    if (found) {
      const hint = found.kind === 'extend' ? followLine(p, g, known, found) : found;
      const sound = hint.changes.every((c) => solution[c.edge] === LINE);
      if (!sound) break;
      return lookedAhead ? { ...hint, kind: 'ahead' } : hint;
    }
    // Nothing draws a line yet. A side that would break a rule a few moves
    // later if it were a line is empty; note it quietly and look again.
    const empty = aheadCross(p, g, known);
    if (empty < 0) break;
    lookedAhead = true;
    const next: Marks = known.slice();
    next[empty] = CROSS;
    known = withSureCrosses(p, next);
  }
  return reveal(g, marks, solution);
}

/**
 * A line that can only go one way usually keeps going: the hint follows it
 * while each next step is just as forced (up to a dozen segments).
 */
function followLine(p: Puzzle, g: Grid, known: Marks, first: Hint): Hint {
  const changes = [...first.changes];
  let m: Marks | null = known.slice();
  for (const c of changes) m[c.edge] = c.mark;
  for (let step = 0; step < 12; step++) {
    m = withSureCrosses(p, m);
    if (!m) break;
    let next = -1;
    for (const c of changes) {
      for (let k = 0; k < 2 && next < 0; k++) {
        const d = g.edgeDots[c.edge * 2 + k]!;
        let have = 0;
        const open: number[] = [];
        for (const e of g.dotEdges[d]!) {
          if (m[e] === LINE) have++;
          else if (m[e] === UNKNOWN) open.push(e);
        }
        if (have === 1 && open.length === 1) next = open[0]!;
      }
      if (next >= 0) break;
    }
    if (next < 0) break;
    changes.push({ edge: next, mark: LINE });
    m[next] = LINE;
  }
  return { ...first, changes };
}

/** An open side that, drawn as a line, leads to a broken rule: it must stay empty. */
function aheadCross(p: Puzzle, g: Grid, m: Marks): number {
  for (const e of aheadOrder(g, m)) {
    const trial = m.slice();
    trial[e] = LINE;
    if (!propagate(p, trial, 2, [e])) return e;
  }
  return -1;
}

/** The marks plus every cross the counting rules make certain. Null on a contradiction. */
function withSureCrosses(p: Puzzle, marks: Marks): Marks | null {
  const g = gridOf(p.rows, p.cols);
  const out = marks.slice();
  for (let changed = true; changed;) {
    changed = false;
    for (let cell = 0; cell < g.cellCount; cell++) {
      const clue = p.clues[cell]!;
      if (clue === NO_CLUE) continue;
      let lines = 0;
      for (let k = 0; k < 4; k++) if (out[g.cellEdges[cell * 4 + k]!] === LINE) lines++;
      if (lines !== clue) continue;
      for (let k = 0; k < 4; k++) {
        const e = g.cellEdges[cell * 4 + k]!;
        if (out[e] === UNKNOWN) {
          out[e] = CROSS;
          changed = true;
        }
      }
    }
    for (let d = 0; d < g.dotCount; d++) {
      let lines = 0;
      let open = 0;
      for (const e of g.dotEdges[d]!) {
        if (out[e] === LINE) lines++;
        else if (out[e] === UNKNOWN) open++;
      }
      if (open === 0 || !(lines === 2 || (lines === 0 && open === 1))) continue;
      for (const e of g.dotEdges[d]!) {
        if (out[e] === UNKNOWN) {
          out[e] = CROSS;
          changed = true;
        }
      }
    }
    // Pinched 1s and early loops, by the solver's own sure rules (crosses only).
    const trial = out.slice();
    if (!propagate(p, trial, 2)) return null;
    for (let e = 0; e < out.length; e++) {
      if (out[e] === UNKNOWN && trial[e] === CROSS && crossIsLocal(p, g, out, e)) {
        out[e] = CROSS;
        changed = true;
      }
    }
  }
  return out;
}

/**
 * Crosses that follow in one step from a 1 at a pinched corner, a line
 * entering a 1, or a loop that would close early. Longer chains are left
 * for the line deductions to explain.
 */
function crossIsLocal(p: Puzzle, g: Grid, marks: Marks, e: number): boolean {
  // An early loop: both ends of one piece of line.
  const a = g.edgeDots[e * 2]!;
  const b = g.edgeDots[e * 2 + 1]!;
  if (endsOfOnePiece(g, marks, a, b)) return true;
  for (const d of [a, b]) {
    let lines = 0;
    const open: number[] = [];
    for (const f of g.dotEdges[d]!) {
      if (marks[f] === LINE) lines++;
      else if (marks[f] === UNKNOWN) open.push(f);
    }
    if (open.length !== 2 || lines > 1) continue;
    const cell = cornerCell(g, open[0]!, open[1]!);
    if (cell >= 0 && p.clues[cell] === 1) {
      if (lines === 0 && open.includes(e)) return true;
      if (lines === 1 && !open.includes(e) && cellHas(g, cell, e)) return true;
    }
  }
  for (const pattern of pairPatterns(p)) if (pattern.crosses.includes(e)) return true;
  return false;
}

function cellHas(g: Grid, cell: number, e: number): boolean {
  for (let k = 0; k < 4; k++) if (g.cellEdges[cell * 4 + k] === e) return true;
  return false;
}

/** True when dots a and b are the two ends of the same piece of line. */
function endsOfOnePiece(g: Grid, marks: Marks, a: number, b: number): boolean {
  const degree = (d: number) => g.dotEdges[d]!.filter((f) => marks[f] === LINE).length;
  if (degree(a) !== 1 || degree(b) !== 1) return false;
  let prev = -1;
  let dot = a;
  for (let guard = 0; guard < g.edgeCount; guard++) {
    const next = g.dotEdges[dot]!.find((f) => marks[f] === LINE && f !== prev);
    if (next === undefined) return false;
    prev = next;
    dot = g.edgeDots[next * 2] === dot ? g.edgeDots[next * 2 + 1]! : g.edgeDots[next * 2]!;
    if (dot === b) return true;
    if (degree(dot) !== 2) return false;
  }
  return false;
}

const opens = (g: Grid, m: Marks, cell: number) =>
  [0, 1, 2, 3].map((k) => g.cellEdges[cell * 4 + k]!).filter((e) => m[e] === UNKNOWN);

function lineDeduction(p: Puzzle, g: Grid, m: Marks): Hint | null {
  const lines = (edges: readonly number[]) =>
    edges.filter((e) => m[e] === UNKNOWN).map((edge) => ({ edge, mark: LINE as Mark }));
  // A number that needs every side still open.
  for (let cell = 0; cell < g.cellCount; cell++) {
    const clue = p.clues[cell]!;
    if (clue <= 0) continue;
    const open = opens(g, m, cell);
    if (!open.length) continue;
    let have = 0;
    for (let k = 0; k < 4; k++) if (m[g.cellEdges[cell * 4 + k]!] === LINE) have++;
    if (have + open.length === clue) {
      return { kind: 'needsAll', changes: lines(open), cells: [cell], dots: [], n: clue };
    }
  }
  // A line that can only go one way.
  for (let d = 0; d < g.dotCount; d++) {
    let have = 0;
    const open: number[] = [];
    for (const e of g.dotEdges[d]!) {
      if (m[e] === LINE) have++;
      else if (m[e] === UNKNOWN) open.push(e);
    }
    if (have === 1 && open.length === 1) {
      return { kind: 'extend', changes: lines(open), cells: [], dots: [d] };
    }
  }
  // A 3 at a corner or a pinch: the line must turn around it.
  for (let d = 0; d < g.dotCount; d++) {
    const open = g.dotEdges[d]!.filter((e) => m[e] === UNKNOWN);
    const have = g.dotEdges[d]!.some((e) => m[e] === LINE);
    if (have || open.length !== 2) continue;
    const cell = cornerCell(g, open[0]!, open[1]!);
    if (cell < 0 || p.clues[cell] !== 3) continue;
    const corner = g.dotEdges[d]!.length === 2;
    return {
      kind: corner ? 'corner3' : 'pinch3',
      changes: lines(open),
      cells: [cell],
      dots: [d],
      n: 3,
    };
  }
  // Pairs of 3s.
  for (const pattern of pairPatterns(p)) {
    const changes = lines(pattern.lines);
    if (changes.length) {
      return { kind: pattern.kind, changes, cells: pattern.cells, dots: [], n: 3 };
    }
  }
  // A line arriving at a corner of a 3 from outside.
  for (let d = 0; d < g.dotCount; d++) {
    const open = g.dotEdges[d]!.filter((e) => m[e] === UNKNOWN);
    const have = g.dotEdges[d]!.filter((e) => m[e] === LINE).length;
    if (have !== 1 || open.length !== 2) continue;
    const cell = cornerCell(g, open[0]!, open[1]!);
    if (cell < 0 || p.clues[cell] !== 3) continue;
    const far = [0, 1, 2, 3]
      .map((k) => g.cellEdges[cell * 4 + k]!)
      .filter((e) => !open.includes(e));
    const changes = lines(far);
    if (changes.length) return { kind: 'enter3', changes, cells: [cell], dots: [d], n: 3 };
  }
  // Looking ahead: leaving this side empty breaks a rule a few moves later.
  const candidates = aheadOrder(g, m);
  for (const e of candidates) {
    const trial = m.slice();
    trial[e] = CROSS;
    if (!propagate(p, trial, 2, [e])) {
      return {
        kind: 'ahead',
        changes: [{ edge: e, mark: LINE }],
        cells: [],
        dots: [g.edgeDots[e * 2]!, g.edgeDots[e * 2 + 1]!],
      };
    }
  }
  return null;
}

/** Open edges, those touching the drawn line or a number first. */
function aheadOrder(g: Grid, m: Marks): number[] {
  const near: number[] = [];
  const rest: number[] = [];
  for (let e = 0; e < m.length; e++) {
    if (m[e] !== UNKNOWN) continue;
    const touchesLine = [g.edgeDots[e * 2]!, g.edgeDots[e * 2 + 1]!].some((d) =>
      g.dotEdges[d]!.some((f) => m[f] === LINE),
    );
    (touchesLine ? near : rest).push(e);
  }
  return [...near, ...rest];
}

/** Reveals one edge of the answer, next to the drawn line where possible. */
function reveal(g: Grid, marks: Marks, solution: Marks): Hint {
  let pick = -1;
  for (let e = 0; e < marks.length && pick < 0; e++) {
    if (marks[e] !== UNKNOWN || solution[e] !== LINE) continue;
    const ends = [g.edgeDots[e * 2]!, g.edgeDots[e * 2 + 1]!];
    if (ends.some((d) => g.dotEdges[d]!.some((f) => marks[f] === LINE))) pick = e;
  }
  for (let e = 0; e < marks.length && pick < 0; e++) {
    if (marks[e] === UNKNOWN && solution[e] === LINE) pick = e;
  }
  if (pick < 0) return { kind: 'reveal', changes: [], cells: [], dots: [] };
  return {
    kind: 'reveal',
    changes: [{ edge: pick, mark: LINE }],
    cells: [],
    dots: [g.edgeDots[pick * 2]!, g.edgeDots[pick * 2 + 1]!],
  };
}
