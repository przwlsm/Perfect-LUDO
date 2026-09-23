import { getCurrentPlayer, type GameState, type IRandomProvider, type Move } from '@/domain';
import { getControllerForColor, type GameSession } from '../session/GameSession';
import { rollDiceForCurrentPlayer } from './RollDiceUseCase';
import { submitMove } from './SubmitMoveUseCase';

export interface PlayTurnCallbacks {
  /**
   * Fires right after the die is rolled, before a move is chosen.
   * `validMoves` is empty when the roll auto-passed the turn.
   */
  onRoll?(state: GameState, validMoves: readonly Move[]): void;
  /** Fires right after a move is applied. */
  onMove?(state: GameState, move: Move): void;
}

/**
 * Plays one player's entire turn to completion, including any bonus rolls
 * from a six, a capture, or reaching home. Works identically whether the
 * current player is human or AI: both are just an IPlayerController, and
 * awaiting a human's chooseMove() simply blocks until the presentation
 * layer calls that controller's submitMove() — see HumanPlayerController.
 */
export async function playTurn(
  session: GameSession,
  random: IRandomProvider,
  callbacks: PlayTurnCallbacks = {},
): Promise<GameSession> {
  let state = session.state;

  for (;;) {
    const rollOutcome = await rollDiceForCurrentPlayer(state, random);

    if (rollOutcome.kind === 'TURN_PASSED') {
      callbacks.onRoll?.(rollOutcome.state, []);
      return { ...session, state: rollOutcome.state };
    }
    callbacks.onRoll?.(rollOutcome.state, rollOutcome.validMoves);

    const controller = getControllerForColor(session, getCurrentPlayer(rollOutcome.state).color);
    const move = await controller.chooseMove(rollOutcome.state, rollOutcome.validMoves);

    const moveOutcome = submitMove(rollOutcome.state, move);
    callbacks.onMove?.(moveOutcome.state, move);
    state = moveOutcome.state;

    if (moveOutcome.kind !== 'BONUS_TURN') {
      return { ...session, state };
    }
  }
}
