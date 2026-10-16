import { turnable, type Level } from '@/domain/entities/Board';
import { flow, type Flow } from '../engine/flow';

/** Everything the player has done to a level, as one immutable value (for undo and redo). */
export interface PlayState {
  /** Each cell's rotation, 0–3 quarter turns clockwise from its solved orientation. */
  readonly rot: readonly number[];
  /** Cells a hint set right: shown with a gold rim, and they stay put. */
  readonly hinted: readonly number[];
  /** Taps on tiles so far. */
  readonly turns: number;
}

export function startState(level: Level): PlayState {
  return { rot: [...level.start], hinted: [], turns: 0 };
}

/** Why a tap did nothing, for a gentle note. */
export type Refusal = 'fixed' | 'hinted' | 'still';

export function refusal(level: Level, state: PlayState, at: number): Refusal | null {
  const tile = level.tiles[at];
  if (!tile || tile.kind === 'rock') return 'still';
  if (state.hinted.includes(at)) return 'hinted';
  if (tile.kind !== 'bridge' && tile.fixed) return 'fixed';
  if (!turnable(tile)) return 'still';
  return null;
}

/** Turns one tile a quarter turn clockwise. Null when it cannot turn. */
export function turn(level: Level, state: PlayState, at: number): PlayState | null {
  if (refusal(level, state, at)) return null;
  const rot = [...state.rot];
  rot[at] = ((rot[at] ?? 0) + 1) & 3;
  return { ...state, rot, turns: state.turns + 1 };
}

export function evaluate(level: Level, state: PlayState): Flow {
  return flow(level, state.rot);
}

/** Back to the starting rotations, keeping what hints set (they were earned). */
export function restart(level: Level, state: PlayState): PlayState {
  const rot = [...level.start];
  for (const at of state.hinted) rot[at] = state.rot[at] ?? 0;
  return { rot, hinted: state.hinted, turns: state.turns };
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
  return { past: [...h.past, h.present].slice(-300), present: next, future: [] };
}

/** Undo puts the tiles back but never the turn count: turns taken stay taken. */
export function undo(h: History): History {
  const prev = h.past.at(-1);
  if (!prev) return h;
  const present = { ...prev, turns: h.present.turns + 1 };
  return { past: h.past.slice(0, -1), present, future: [h.present, ...h.future] };
}

export function redo(h: History): History {
  const next = h.future[0];
  if (!next) return h;
  return {
    past: [...h.past, h.present],
    present: { ...next, turns: h.present.turns + 1 },
    future: h.future.slice(1),
  };
}

/**
 * Stars for a solved level: three with no hints inside the cloud budget,
 * two with one hint or over the budget, one otherwise. The budget is never
 * a fail, only the third star.
 */
export function starsFor(hints: number, turns: number, budget: number | null): 1 | 2 | 3 {
  const inBudget = budget === null || turns <= budget;
  if (hints === 0 && inBudget) return 3;
  if (hints <= 1) return 2;
  return 1;
}

/** Turns left before the clouds pass; null when the level has no budget. Never below zero. */
export function cloudsLeft(level: Level, state: PlayState): number | null {
  return level.budget === null ? null : Math.max(0, level.budget - state.turns);
}
