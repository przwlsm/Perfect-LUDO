import { CROSS, LINE, NO_CLUE, UNKNOWN, type Mark, type Puzzle } from '@/domain/entities/Board';
import { gridOf } from '../engine/grid';
import type { Marks } from '../engine/rules';

/** One undoable move: a tap, a whole drag stroke, a hint or a reset. */
export interface Step {
  readonly edges: readonly number[];
  readonly before: readonly Mark[];
  readonly after: readonly Mark[];
}

export interface History {
  readonly marks: Marks;
  readonly past: readonly Step[];
  readonly future: readonly Step[];
}

export interface Change {
  readonly edge: number;
  readonly mark: Mark;
}

export function startHistory(marks: Marks): History {
  return { marks, past: [], future: [] };
}

/** A tap cycles an edge: empty → line → cross → empty. */
export function nextMark(m: number): Mark {
  return m === UNKNOWN ? LINE : m === LINE ? CROSS : UNKNOWN;
}

/**
 * Applies changes as one step. With `merge`, they join the last step (a
 * drag stroke grows one segment at a time but undoes in one go).
 */
export function apply(h: History, changes: readonly Change[], merge = false): History {
  const real = changes.filter((c) => h.marks[c.edge] !== c.mark);
  if (!real.length) return h;
  const marks = h.marks.slice();
  const edges: number[] = [];
  const before: Mark[] = [];
  const after: Mark[] = [];
  for (const c of real) {
    edges.push(c.edge);
    before.push(marks[c.edge] as Mark);
    after.push(c.mark);
    marks[c.edge] = c.mark;
  }
  const last = h.past[h.past.length - 1];
  if (merge && last) {
    const step: Step = {
      edges: [...last.edges, ...edges],
      before: [...last.before, ...before],
      after: [...last.after, ...after],
    };
    return { marks, past: [...h.past.slice(0, -1), step], future: [] };
  }
  return { marks, past: [...h.past, { edges, before, after }], future: [] };
}

export function undo(h: History): History {
  const step = h.past[h.past.length - 1];
  if (!step) return h;
  const marks = h.marks.slice();
  for (let i = step.edges.length - 1; i >= 0; i--) marks[step.edges[i]!] = step.before[i]!;
  return { marks, past: h.past.slice(0, -1), future: [step, ...h.future] };
}

export function redo(h: History): History {
  const step = h.future[0];
  if (!step) return h;
  const marks = h.marks.slice();
  for (let i = 0; i < step.edges.length; i++) marks[step.edges[i]!] = step.after[i]!;
  return { marks, past: [...h.past, step], future: h.future.slice(1) };
}

/** Clears the board as one undoable step. */
export function reset(h: History): History {
  const changes: Change[] = [];
  for (let e = 0; e < h.marks.length; e++) {
    if (h.marks[e] !== UNKNOWN) changes.push({ edge: e, mark: UNKNOWN });
  }
  return apply(h, changes);
}

/**
 * Sides shown crossed out automatically: the open sides of every number
 * that already has all its lines. They are a view, never stored, so they
 * come and go as lines are drawn and erased.
 */
export function autoCrosses(p: Puzzle, marks: Marks): Set<number> {
  const g = gridOf(p.rows, p.cols);
  const out = new Set<number>();
  for (let cell = 0; cell < g.cellCount; cell++) {
    const clue = p.clues[cell]!;
    if (clue === NO_CLUE) continue;
    let lines = 0;
    for (let k = 0; k < 4; k++) if (marks[g.cellEdges[cell * 4 + k]!] === LINE) lines++;
    if (lines !== clue) continue;
    for (let k = 0; k < 4; k++) {
      const e = g.cellEdges[cell * 4 + k]!;
      if (marks[e] === UNKNOWN) out.add(e);
    }
  }
  return out;
}

/** Marks as text for saving ("0" open, "1" line, "2" cross). */
export function encodeMarks(marks: Marks): string {
  return Array.from(marks, (m) => String(m)).join('');
}

/** Saved marks for a board of `edgeCount` edges; blank if they don't fit. */
export function decodeMarks(text: string | undefined, edgeCount: number): Marks {
  const out = new Uint8Array(edgeCount);
  if (!text || text.length !== edgeCount) return out;
  for (let e = 0; e < edgeCount; e++) {
    const v = text.charCodeAt(e) - 48;
    out[e] = v === LINE || v === CROSS ? v : UNKNOWN;
  }
  return out;
}

/** 190 → "3:10". */
export function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}
