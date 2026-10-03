import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { chooseMove, opponent, type Move, type Node, type Result } from 'baghchal-engine';
import { interpretTap, targetsFrom } from '@/application/board/BoardInteraction';
import { moveFeedback, resultSound } from '@/application/board/feedback';
import { canUndo, freshLocalGame, reduceLocalGame } from '@/application/board/localGame';
import type { IHaptics } from '@/domain/ports/IHaptics';
import type { ISoundPlayer } from '@/domain/ports/ISoundPlayer';
import type { AiOpponent } from '../game/aiOpponent';

/** A beat after the player's move, so their piece is seen landing before the reply. */
const THINK_DELAY_MS = 400;
/** The strongest tier, briefly: a hint should not feel like waiting for the computer. */
const HINT_TIME_MS = 500;
/** The end-of-game sound follows the last move's own sound. */
const RESULT_SOUND_DELAY_MS = 350;

/** How the board answers the player; pass the silent ones when they are turned off. */
export interface GameFeedback {
  readonly haptics: IHaptics;
  readonly sounds: ISoundPlayer;
}

/**
 * A game on this screen: two people, or one person and the computer playing
 * `ai`'s side. All rules come from the engine and all state changes from
 * `reduceLocalGame`; this only schedules the computer and the feedback.
 */
export function useLocalGame(feedback: GameFeedback, ai: AiOpponent | null = null) {
  const [state, dispatch] = useReducer(reduceLocalGame, undefined, freshLocalGame);
  const { game, selected } = state;
  const { haptics, sounds } = feedback;
  const thinking = ai !== null && game.turn === ai.side && game.result === null;

  const feel = useCallback(
    (move: Move) => {
      const { haptic, sound } = moveFeedback(move);
      haptics[haptic]();
      sounds.play(sound);
    },
    [haptics, sounds],
  );

  useEffect(() => {
    if (!thinking || ai === null) return;
    // The search blocks the JS thread for up to its budget; animations run on
    // the UI thread, and there is nothing for the player to tap meanwhile.
    const timer = setTimeout(() => {
      const { move } = chooseMove(game, { level: ai.level });
      feel(move);
      dispatch({ type: 'move', move });
    }, THINK_DELAY_MS);
    return () => clearTimeout(timer);
  }, [thinking, ai, game, feel]);

  // Once per result, so toggling sound after the game does not replay it.
  const announced = useRef<Result | null>(null);
  useEffect(() => {
    if (!game.result || announced.current === game.result) return;
    announced.current = game.result;
    const cue = resultSound(game.result, ai ? opponent(ai.side) : null);
    if (!cue) return;
    const timer = setTimeout(() => sounds.play(cue), RESULT_SOUND_DELAY_MS);
    return () => clearTimeout(timer);
  }, [game.result, ai, sounds]);

  const tap = useCallback(
    (node: Node) => {
      if (thinking) return;
      const outcome = interpretTap(game, selected, node);
      if (outcome.move) feel(outcome.move);
      else if (outcome.selected !== null) {
        haptics.select();
        sounds.play('select');
      }
      dispatch({ type: 'tap', outcome });
    },
    [thinking, game, selected, feel, haptics, sounds],
  );

  const showHint = useCallback(() => {
    if (thinking || game.result) return;
    const { move } = chooseMove(game, { level: 'grandmaster', timeMs: HINT_TIME_MS });
    dispatch({ type: 'hint', move });
  }, [thinking, game]);

  const undo = useCallback(() => dispatch({ type: 'undo', aiSide: ai?.side ?? null }), [ai]);
  const restart = useCallback(() => dispatch({ type: 'restart' }), []);
  const targets = useMemo(() => targetsFrom(game, selected), [game, selected]);

  return {
    game,
    pieces: state.pieces,
    selected,
    history: state.history,
    hint: state.hint,
    targets,
    thinking,
    canUndo: canUndo(state),
    tap,
    showHint,
    undo,
    restart,
  };
}
