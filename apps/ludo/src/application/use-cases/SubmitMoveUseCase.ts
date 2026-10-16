import { applyMove, type GameState, type Move, type PlayerColor } from '@/domain';

export type MoveOutcome =
  | { readonly kind: 'BONUS_TURN'; readonly state: GameState }
  | { readonly kind: 'TURN_PASSED'; readonly state: GameState }
  | { readonly kind: 'GAME_FINISHED'; readonly state: GameState; readonly winner: PlayerColor };

/**
 * Applies a move and classifies what happens next. `applyMove` itself
 * already re-validates the move against the current state (see
 * GameEngine.ts), so this use case never trusts the move's shape either.
 */
export function submitMove(state: GameState, move: Move): MoveOutcome {
  const previousPlayerIndex = state.currentPlayerIndex;
  const nextState = applyMove(state, move);

  if (nextState.status === 'FINISHED') {
    if (!nextState.winnerColor) {
      throw new Error('Game finished without a winner recorded');
    }
    return { kind: 'GAME_FINISHED', state: nextState, winner: nextState.winnerColor };
  }

  if (nextState.currentPlayerIndex === previousPlayerIndex) {
    return { kind: 'BONUS_TURN', state: nextState };
  }
  return { kind: 'TURN_PASSED', state: nextState };
}
