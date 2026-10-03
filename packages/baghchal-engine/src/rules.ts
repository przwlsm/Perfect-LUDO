import { jumpTarget, neighbours, type Node } from './board';
import {
  CAPTURES_TO_WIN,
  QUIET_PLY_LIMIT,
  REPETITION_LIMIT,
  cellOf,
  opponent,
  positionKey,
  type Cell,
  type GameState,
  type Result,
} from './state';

export type Move =
  /** A goat from the hand onto an empty point. */
  | { readonly kind: 'place'; readonly to: Node }
  /** Any piece one line segment along to an empty point. */
  | { readonly kind: 'move'; readonly from: Node; readonly to: Node }
  /** A tiger over an adjacent goat to the empty point beyond it, taking the goat. */
  | { readonly kind: 'jump'; readonly from: Node; readonly over: Node; readonly to: Node };

/** Every move the side to play may make now; empty once the game has a result. */
export function legalMoves(state: GameState): readonly Move[] {
  if (state.result) return [];
  return state.turn === 'goat' ? goatMoves(state) : tigerMoves(state.board);
}

/** The goats' moves regardless of whose turn it is (the evaluator asks about both sides). */
export function goatMoves(state: Pick<GameState, 'board' | 'goatsInHand'>): Move[] {
  const moves: Move[] = [];
  if (state.goatsInHand > 0) {
    state.board.forEach((cell, to) => {
      if (cell === '.') moves.push({ kind: 'place', to });
    });
    return moves;
  }
  state.board.forEach((cell, from) => {
    if (cell !== 'G') return;
    for (const to of neighbours(from)) {
      if (state.board[to] === '.') moves.push({ kind: 'move', from, to });
    }
  });
  return moves;
}

/** The tigers' moves and jumps regardless of whose turn it is. */
export function tigerMoves(board: readonly Cell[]): Move[] {
  const moves: Move[] = [];
  board.forEach((cell, from) => {
    if (cell !== 'T') return;
    for (const next of neighbours(from)) {
      if (board[next] === '.') {
        moves.push({ kind: 'move', from, to: next });
      } else if (board[next] === 'G') {
        const to = jumpTarget(from, next);
        if (to !== null && board[to] === '.') moves.push({ kind: 'jump', from, over: next, to });
      }
    }
  });
  return moves;
}

export function sameMove(a: Move, b: Move): boolean {
  return moveKey(a) === moveKey(b);
}

/** A short, unique text for a move, e.g. "p12", "m3-8", "j0x6-12". */
export function moveKey(move: Move): string {
  switch (move.kind) {
    case 'place':
      return `p${move.to}`;
    case 'move':
      return `m${move.from}-${move.to}`;
    case 'jump':
      return `j${move.from}x${move.over}-${move.to}`;
  }
}

export function isLegalMove(state: GameState, move: Move): boolean {
  return legalMoves(state).some((legal) => sameMove(legal, move));
}

/** The game after `move`, with its result decided. Throws if the move is not legal now. */
export function applyMove(state: GameState, move: Move): GameState {
  if (!isLegalMove(state, move)) throw new Error(`Illegal move ${moveKey(move)}`);
  return applyLegalMove(state, move);
}

/**
 * `applyMove` without the legality check, for callers that took `move` from
 * `legalMoves` themselves, such as the search, which plays thousands of them.
 */
export function applyLegalMove(state: GameState, move: Move): GameState {
  const board = [...state.board];
  let goatsInHand = state.goatsInHand;
  let goatsCaptured = state.goatsCaptured;
  switch (move.kind) {
    case 'place':
      board[move.to] = 'G';
      goatsInHand -= 1;
      break;
    case 'move':
      board[move.to] = cellOf(state.turn);
      board[move.from] = '.';
      break;
    case 'jump':
      board[move.to] = 'T';
      board[move.from] = '.';
      board[move.over] = '.';
      goatsCaptured += 1;
      break;
  }
  const turn = opponent(state.turn);
  const next: GameState = {
    board,
    turn,
    goatsInHand,
    goatsCaptured,
    plies: state.plies + 1,
    // Placements and captures can never be undone, so the run restarts after them.
    quietPositions: move.kind === 'move' ? [...state.quietPositions, positionKey(board, turn)] : [],
    result: null,
  };
  return { ...next, result: resultOf(next) };
}

/** How the game stands for the side to move, or null while it goes on. */
export function resultOf(state: GameState): Result | null {
  if (state.goatsCaptured >= CAPTURES_TO_WIN) {
    return { kind: 'win', winner: 'tiger', reason: 'captures' };
  }
  const latest = state.quietPositions[state.quietPositions.length - 1];
  if (
    latest !== undefined &&
    state.quietPositions.filter((key) => key === latest).length >= REPETITION_LIMIT
  ) {
    return { kind: 'draw', reason: 'repetition' };
  }
  if (state.quietPositions.length >= QUIET_PLY_LIMIT) {
    return { kind: 'draw', reason: 'no-progress' };
  }
  if (legalMoves({ ...state, result: null }).length === 0) {
    return state.turn === 'tiger'
      ? { kind: 'win', winner: 'goat', reason: 'trapped' }
      : { kind: 'win', winner: 'tiger', reason: 'no-moves' };
  }
  return null;
}
