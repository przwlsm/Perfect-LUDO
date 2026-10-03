import {
  GOATS_TOTAL,
  applyMove,
  createGame,
  type GameState,
  type Move,
  type Side,
} from 'baghchal-engine';
import type { TapOutcome } from './BoardInteraction';
import { initialPieces, trackPieces, type PieceView } from './PieceTracker';

/** One half-move as it appears in the move list. */
export interface Turn {
  readonly ply: number;
  readonly side: Side;
  readonly move: Move;
}

/** What undo restores: everything a move changes. */
interface Snapshot {
  readonly game: GameState;
  readonly pieces: readonly PieceView[];
  readonly history: readonly Turn[];
}

/** A game on one screen, with everything needed to show it, undo it and list it. */
export interface LocalGame extends Snapshot {
  readonly selected: number | null;
  readonly hint: Move | null;
  readonly past: readonly Snapshot[];
}

export type LocalGameAction =
  | { readonly type: 'tap'; readonly outcome: TapOutcome }
  | { readonly type: 'move'; readonly move: Move }
  /** Back to the last position where the person could move; `aiSide` is the computer's seat, if any. */
  | { readonly type: 'undo'; readonly aiSide: Side | null }
  | { readonly type: 'hint'; readonly move: Move | null }
  | { readonly type: 'restart' };

export function freshLocalGame(): LocalGame {
  return {
    game: createGame(),
    pieces: initialPieces(),
    history: [],
    selected: null,
    hint: null,
    past: [],
  };
}

export function canUndo(state: LocalGame): boolean {
  return state.past.length > 0;
}

export function reduceLocalGame(state: LocalGame, action: LocalGameAction): LocalGame {
  switch (action.type) {
    case 'restart':
      return freshLocalGame();
    case 'hint':
      return { ...state, hint: action.move };
    case 'tap':
      return action.outcome.move
        ? play(state, action.outcome.move)
        : { ...state, selected: action.outcome.selected };
    case 'move':
      return play(state, action.move);
    case 'undo':
      return undo(state, action.aiSide);
  }
}

function play(state: LocalGame, move: Move): LocalGame {
  const { game, pieces, history } = state;
  return {
    game: applyMove(game, move),
    pieces: trackPieces(pieces, move, GOATS_TOTAL - game.goatsInHand),
    history: [...history, { ply: game.plies + 1, side: game.turn, move }],
    selected: null,
    hint: null,
    past: [...state.past, { game, pieces, history }],
  };
}

function undo(state: LocalGame, aiSide: Side | null): LocalGame {
  if (state.past.length === 0) return state;
  // Skip back over the computer's replies so the person gets their own move back.
  let index = state.past.length - 1;
  while (index > 0 && state.past[index]?.game.turn === aiSide) index -= 1;
  const snapshot = state.past[index];
  if (!snapshot) return state;
  return { ...snapshot, selected: null, hint: null, past: state.past.slice(0, index) };
}
