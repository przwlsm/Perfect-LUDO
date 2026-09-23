import {
  endTurnWithoutMove,
  getValidMovesForCurrentPlayer,
  rollDice,
  type GameState,
  type IRandomProvider,
  type Move,
} from '@/domain';

export type RollOutcome =
  | {
      readonly kind: 'AWAITING_MOVE';
      readonly state: GameState;
      readonly validMoves: readonly Move[];
    }
  | { readonly kind: 'TURN_PASSED'; readonly state: GameState };

/**
 * Rolls for the current player and, when nothing can legally be played
 * with that roll, passes the turn automatically — there's no real decision
 * for a human or AI to make in that case, so the use case resolves it
 * rather than pushing an empty choice up to the caller.
 */
export async function rollDiceForCurrentPlayer(
  state: GameState,
  random: IRandomProvider,
): Promise<RollOutcome> {
  const rolledState = await rollDice(state, random);
  const validMoves = getValidMovesForCurrentPlayer(rolledState);

  if (validMoves.length === 0) {
    return { kind: 'TURN_PASSED', state: endTurnWithoutMove(rolledState) };
  }
  return { kind: 'AWAITING_MOVE', state: rolledState, validMoves };
}
