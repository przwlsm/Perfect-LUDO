import type { GameState, Move } from '@/domain';

/**
 * One decision-making policy for an AI turn. New difficulties are added by
 * writing a new strategy, never by editing an existing one (Open/Closed) —
 * AIPlayerController just delegates to whichever strategy it's given.
 */
export interface IMoveSelectionStrategy {
  selectMove(state: GameState, validMoves: readonly Move[]): Move;
}
