import type { GameState, Move } from '@/domain';

/**
 * Decides which move to make for a color on its turn. Human input and AI
 * heuristics implement this identically (Liskov substitution) — the
 * application layer that drives a turn never needs to know which kind of
 * controller it's talking to. A future RemotePlayerController for online
 * play slots in the same way.
 */
export interface IPlayerController {
  chooseMove(state: GameState, validMoves: readonly Move[]): Promise<Move>;
}
