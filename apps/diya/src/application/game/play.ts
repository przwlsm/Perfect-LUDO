import {
  kindOf,
  pieceOf,
  type Level,
  type Piece,
  type PieceKind,
  type Slant,
} from '@/domain/entities/Board';
import { compile, type Arrangement, type Grid } from '../engine/grid';
import { lampStates, solved, trace, type LampState, type Trace } from '../engine/trace';

export interface PlacedPiece {
  readonly piece: Piece;
  /** Set by a hint: shown with a gold rim, and it stays put. */
  readonly hinted: boolean;
}

/** Everything the player has done to a level, as one immutable value (for undo and redo). */
export interface PlayState {
  readonly placed: Readonly<Record<number, PlacedPiece>>;
  readonly pivots: Readonly<Record<number, Slant>>;
  /** Pivots a hint turned; they stay put too. */
  readonly hintedPivots: readonly number[];
  readonly moves: number;
}

export function startState(level: Level): PlayState {
  const pivots: Record<number, Slant> = {};
  level.tiles.forEach((t, at) => {
    if (t?.kind === 'piece' && t.lock === 'pivot' && t.piece.type === 'mirror') {
      pivots[at] = t.piece.slant;
    }
  });
  return { placed: {}, pivots, hintedPivots: [], moves: 0 };
}

export function arrangement(state: PlayState): Arrangement {
  const placed: Record<number, Piece> = {};
  for (const [at, p] of Object.entries(state.placed)) placed[Number(at)] = p.piece;
  return { placed, pivots: state.pivots };
}

/** Pieces still in the tray, by kind, in a stable order. */
export function trayLeft(level: Level, state: PlayState): Map<PieceKind, number> {
  const left = new Map<PieceKind, number>();
  for (const k of level.tray) left.set(k, (left.get(k) ?? 0) + 1);
  for (const p of Object.values(state.placed)) {
    const k = kindOf(p.piece);
    left.set(k, (left.get(k) ?? 0) - 1);
  }
  return left;
}

export function isFree(level: Level, state: PlayState, at: number): boolean {
  return at >= 0 && at < level.w * level.h && !level.tiles[at] && !state.placed[at];
}

/** Sets a tray piece down on a free cell. Null when it cannot go there. */
export function place(
  level: Level,
  state: PlayState,
  kind: PieceKind,
  at: number,
  slant: Slant = 0,
): PlayState | null {
  if (!isFree(level, state, at) || (trayLeft(level, state).get(kind) ?? 0) <= 0) return null;
  return {
    ...state,
    placed: { ...state.placed, [at]: { piece: pieceOf(kind, slant), hinted: false } },
    moves: state.moves + 1,
  };
}

/** Moves a placed piece to another free cell. */
export function move(level: Level, state: PlayState, from: number, to: number): PlayState | null {
  const p = state.placed[from];
  if (!p || p.hinted || from === to || !isFree(level, state, to)) return null;
  const placed = { ...state.placed };
  delete placed[from];
  placed[to] = p;
  return { ...state, placed, moves: state.moves + 1 };
}

/** Takes a placed piece back to the tray. */
export function lift(state: PlayState, at: number): PlayState | null {
  const p = state.placed[at];
  if (!p || p.hinted) return null;
  const placed = { ...state.placed };
  delete placed[at];
  return { ...state, placed, moves: state.moves + 1 };
}

/** Turns a mirror: a placed one, or a pivot. Prisms and glass look the same every way round. */
export function rotate(state: PlayState, at: number): PlayState | null {
  const p = state.placed[at];
  if (p) {
    if (p.hinted || p.piece.type !== 'mirror') return null;
    const piece: Piece = { type: 'mirror', slant: p.piece.slant === 0 ? 1 : 0 };
    return { ...state, placed: { ...state.placed, [at]: { ...p, piece } }, moves: state.moves + 1 };
  }
  const slant = state.pivots[at];
  if (slant === undefined || state.hintedPivots.includes(at)) return null;
  return {
    ...state,
    pivots: { ...state.pivots, [at]: slant === 0 ? 1 : 0 },
    moves: state.moves + 1,
  };
}

/** What the board looks like now: the light, each lamp, and whether every lamp is right. */
export interface Evaluation {
  readonly grid: Grid;
  readonly trace: Trace;
  readonly lamps: Map<number, LampState>;
  readonly solved: boolean;
  readonly lit: number;
  readonly total: number;
}

export function evaluate(level: Level, state: PlayState): Evaluation {
  const grid = compile(level, arrangement(state));
  const t = trace(grid, true);
  const lamps = lampStates(grid, t);
  let lit = 0;
  let total = 0;
  level.tiles.forEach((tile, at) => {
    if (tile?.kind !== 'diya') return;
    total++;
    if (lamps.get(at) === 'lit') lit++;
  });
  return { grid, trace: t, lamps, solved: solved(grid, t), lit, total };
}

/** Undo and redo over play states. */
export interface History {
  readonly past: readonly PlayState[];
  readonly present: PlayState;
  readonly future: readonly PlayState[];
}

export function historyOf(state: PlayState): History {
  return { past: [], present: state, future: [] };
}

export function commit(h: History, next: PlayState | null): History {
  if (!next) return h;
  return { past: [...h.past, h.present].slice(-200), present: next, future: [] };
}

export function undo(h: History): History {
  const prev = h.past.at(-1);
  if (!prev) return h;
  return { past: h.past.slice(0, -1), present: prev, future: [h.present, ...h.future] };
}

export function redo(h: History): History {
  const next = h.future[0];
  if (!next) return h;
  return { past: [...h.past, h.present], present: next, future: h.future.slice(1) };
}

/** Stars for a solved level: three with no hints, two with one, one otherwise. */
export function starsFor(hints: number): 1 | 2 | 3 {
  return hints === 0 ? 3 : hints === 1 ? 2 : 1;
}
