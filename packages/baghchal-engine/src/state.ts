import { CORNERS, NODE_COUNT } from './board';

export type Cell = 'T' | 'G' | '.';
export type Side = 'tiger' | 'goat';
/** Goats are placed one per turn until all twenty are on the board; only then may they move. */
export type Phase = 'placement' | 'movement';

export const GOATS_TOTAL = 20;
/** Tigers win once this many goats have been taken. */
export const CAPTURES_TO_WIN = 5;
/** A position reached this many times (same board, same side to move) is a draw. */
export const REPETITION_LIMIT = 3;
/**
 * A draw after this many consecutive plain moves (no placement, no capture),
 * so a game between two cautious players, or two engines, always ends.
 */
export const QUIET_PLY_LIMIT = 60;

export type Result =
  | {
      readonly kind: 'win';
      readonly winner: Side;
      /** captures: five goats taken. trapped: no tiger can move. no-moves: no goat can move. */
      readonly reason: 'captures' | 'trapped' | 'no-moves';
    }
  | { readonly kind: 'draw'; readonly reason: 'repetition' | 'no-progress' };

/**
 * The entire game is this one immutable value. Every rule takes a GameState
 * and returns a new one rather than mutating in place, which is what makes
 * the engine trivially testable, replayable, and safe to validate on a
 * server for online play.
 */
export interface GameState {
  /** 25 cells, row by row from the top left. */
  readonly board: readonly Cell[];
  readonly turn: Side;
  /** Goats not yet placed; the game is in the placement phase while this is above zero. */
  readonly goatsInHand: number;
  readonly goatsCaptured: number;
  /** Half-moves played so far. */
  readonly plies: number;
  /**
   * Position keys since the last placement or capture, oldest first. Those
   * moves make every earlier position unreachable, so only this run matters
   * for the repetition and no-progress rules, and it never grows past the
   * no-progress limit.
   */
  readonly quietPositions: readonly string[];
  readonly result: Result | null;
}

export function createGame(): GameState {
  const board: Cell[] = Array.from({ length: NODE_COUNT }, () => '.');
  for (const corner of CORNERS) board[corner] = 'T';
  return {
    board,
    turn: 'goat',
    goatsInHand: GOATS_TOTAL,
    goatsCaptured: 0,
    plies: 0,
    quietPositions: [],
    result: null,
  };
}

export function opponent(side: Side): Side {
  return side === 'goat' ? 'tiger' : 'goat';
}

export function cellOf(side: Side): Cell {
  return side === 'goat' ? 'G' : 'T';
}

export function phaseOf(state: Pick<GameState, 'goatsInHand'>): Phase {
  return state.goatsInHand > 0 ? 'placement' : 'movement';
}

/** The board as 25 characters (T, G or .), the form it is stored and compared in. */
export function boardToString(board: readonly Cell[]): string {
  return board.join('');
}

export function boardFromString(text: string): Cell[] {
  if (text.length !== NODE_COUNT || !/^[TG.]+$/.test(text)) {
    throw new Error(`A board is ${NODE_COUNT} characters of T, G or '.', not "${text}"`);
  }
  return [...text] as Cell[];
}

/** Identifies a position for the repetition rule: the board plus whose move it is. */
export function positionKey(board: readonly Cell[], turn: Side): string {
  return boardToString(board) + (turn === 'goat' ? 'g' : 't');
}
