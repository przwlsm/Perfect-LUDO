import {
  kindOf,
  samePiece,
  type Level,
  type Piece,
  type Placement,
  type Slant,
} from '@/domain/entities/Board';
import { arrangementOf, compile } from '../engine/grid';
import { solve } from '../engine/solver';
import { trace } from '../engine/trace';
import { evaluate, trayLeft, type PlayState } from './play';

/** One correct move, revealed: turn a pivot, or set a piece on a cell. */
export interface Hint {
  readonly at: number;
  readonly piece: Piece;
  readonly pivot: boolean;
}

const HINT_BUDGET = 30_000;

function isPivot(level: Level, at: number): boolean {
  const t = level.tiles[at];
  return t?.kind === 'piece' && t.lock === 'pivot';
}

/** Whether the board already has this part of a solution. */
function has(state: PlayState, level: Level, p: Placement): boolean {
  if (isPivot(level, p.at)) {
    return p.piece.type === 'mirror' && state.pivots[p.at] === p.piece.slant;
  }
  const mine = state.placed[p.at];
  return !!mine && samePiece(mine.piece, p.piece);
}

/** The first move of `solution` the board lacks, taken in the order light reaches it. */
function firstMissing(level: Level, state: PlayState, solution: readonly Placement[]): Hint | null {
  const lit = trace(compile(level, arrangementOf(level, solution)));
  const missing = solution
    .filter((p) => !has(state, level, p))
    .sort((a, b) => {
      const ra = lit.reach[a.at]! < 0 ? 1e9 : lit.reach[a.at]!;
      const rb = lit.reach[b.at]! < 0 ? 1e9 : lit.reach[b.at]!;
      return ra - rb || a.at - b.at;
    });
  const p = missing[0];
  return p ? { at: p.at, piece: p.piece, pivot: isPivot(level, p.at) } : null;
}

/**
 * The hint for the board as it stands. If the player's pieces can still be
 * part of a solution, it reveals the next piece of that solution, so a hint
 * never undoes good work. Otherwise it follows the solution closest to the
 * board and puts right the first thing that differs.
 */
export function findHint(level: Level, state: PlayState): Hint | null {
  if (evaluate(level, state).solved) return null;
  const pinned: Placement[] = Object.entries(state.placed).map(([at, p]) => ({
    at: Number(at),
    piece: p.piece,
  }));
  const fixedPivots: Record<number, Slant> = {};
  for (const at of state.hintedPivots) fixedPivots[at] = state.pivots[at] ?? 0;
  const completion = solve(level, { pinned, fixedPivots, budget: HINT_BUDGET });
  const done = completion.solutions[0];
  if (done) {
    const hint = firstMissing(level, state, done);
    if (hint) return hint;
  }
  const options = [
    level.solution,
    ...solve(level, { maxSolutions: 4, budget: HINT_BUDGET }).solutions,
  ];
  // Hinted pieces are fixed; only a solution that keeps them can be followed.
  const keeps = (s: readonly Placement[]) =>
    Object.entries(state.placed).every(
      ([at, p]) => !p.hinted || s.some((q) => q.at === Number(at) && samePiece(q.piece, p.piece)),
    ) && state.hintedPivots.every((at) => s.some((q) => q.at === at && has(state, level, q)));
  let best: readonly Placement[] = level.solution;
  let bestScore = -1;
  for (const s of options) {
    if (!keeps(s)) continue;
    const score = s.filter((p) => has(state, level, p)).length;
    if (score > bestScore) {
      bestScore = score;
      best = s;
    }
  }
  return firstMissing(level, state, best);
}

/**
 * The board after taking a hint: the piece set down (or the pivot turned)
 * and locked with a gold rim. A wrong piece in its way goes back to the
 * tray; if the tray has none of the kind needed, one is taken from a cell
 * where it is not part of the answer.
 */
export function applyHint(level: Level, state: PlayState, hint: Hint): PlayState {
  if (hint.pivot) {
    if (hint.piece.type !== 'mirror') return state;
    return {
      ...state,
      pivots: { ...state.pivots, [hint.at]: hint.piece.slant },
      hintedPivots: [...state.hintedPivots, hint.at],
      moves: state.moves + 1,
    };
  }
  const placed = { ...state.placed };
  delete placed[hint.at];
  const kind = kindOf(hint.piece);
  const after: PlayState = { ...state, placed };
  if ((trayLeft(level, after).get(kind) ?? 0) <= 0) {
    const spare =
      Object.entries(placed).find(
        ([at, p]) =>
          !p.hinted &&
          kindOf(p.piece) === kind &&
          !level.solution.some((q) => q.at === Number(at) && samePiece(q.piece, p.piece)),
      ) ?? Object.entries(placed).find(([, p]) => !p.hinted && kindOf(p.piece) === kind);
    if (spare) delete placed[Number(spare[0])];
  }
  placed[hint.at] = { piece: hint.piece, hinted: true };
  return { ...state, placed, moves: state.moves + 1 };
}
