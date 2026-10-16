import { CUP_SIZE, type Level } from '@/domain/entities/Level';
import {
  check,
  applyPour,
  isServed,
  isSolved,
  positionOf,
  withExtraCup,
  type Pos,
  type Pour,
  type Refusal,
} from '../engine/state';

/**
 * A level being played, as one immutable value. `history` holds every
 * position since the start (or the last restart); its last entry is the
 * counter as it stands, so undo is free, unlimited and exact.
 */
export interface Game {
  /** The position a restart returns to (with the extra cup, once taken). */
  readonly start: Pos;
  readonly history: readonly Pos[];
  /** Hints and extra cups used on this level (they survive undo and restart). */
  readonly assists: number;
  /** The extra-cup assist has been used (once per level). */
  readonly extra: boolean;
}

export function newGame(level: Pick<Level, 'cups'>): Game {
  const start = positionOf(level);
  return { start, history: [start], assists: 0, extra: false };
}

export function current(g: Game): Pos {
  return g.history[g.history.length - 1]!;
}

/** Pours on the counter's current line of play (undo takes them back). */
export function poursOf(g: Game): number {
  return g.history.length - 1;
}

export type PourResult =
  | { readonly ok: true; readonly game: Game; readonly pour: Pour }
  | { readonly ok: false; readonly why: Refusal };

export function pour(g: Game, from: number, to: number): PourResult {
  const pos = current(g);
  const c = check(pos, from, to);
  if (!c.ok) return c;
  return {
    ok: true,
    game: { ...g, history: [...g.history, applyPour(pos, c.pour)] },
    pour: c.pour,
  };
}

export function undo(g: Game, steps = 1): Game {
  const keep = Math.max(1, g.history.length - steps);
  return keep === g.history.length ? g : { ...g, history: g.history.slice(0, keep) };
}

/** Back to the start. Assists stay counted, and the extra cup stays on the counter. */
export function restart(g: Game): Game {
  return { ...g, history: [g.start] };
}

/** The "extra cup" assist: one more empty cup, everywhere in history. Counts as a hint. */
export function addExtraCup(g: Game): Game | null {
  if (g.extra) return null;
  return {
    start: withExtraCup(g.start, CUP_SIZE),
    history: g.history.map((p) => withExtraCup(p, CUP_SIZE)),
    assists: g.assists + 1,
    extra: true,
  };
}

export function noteHint(g: Game, rewindTo?: number): Game {
  const history = rewindTo === undefined ? g.history : g.history.slice(0, rewindTo + 1);
  return { ...g, history, assists: g.assists + 1 };
}

export function isWon(g: Game): boolean {
  return isSolved(current(g));
}

/** Cups that are served (full of one ingredient) right now. */
export function servedCups(pos: Pos): boolean[] {
  return pos.cups.map(isServed);
}

/**
 * Stars for a solved level: three for no help within par; two within par
 * plus 30% with at most one hint or extra cup; one for any solve.
 */
export function starsFor(pours: number, par: number, assists: number): 1 | 2 | 3 {
  if (assists === 0 && pours <= par) return 3;
  if (assists <= 1 && pours <= Math.ceil(par * 1.3)) return 2;
  return 1;
}
