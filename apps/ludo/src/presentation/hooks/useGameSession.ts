import { useCallback, useEffect, useState } from 'react';
import { AIPlayerController } from '@/application/ai/AIPlayerController';
import { HeuristicMoveStrategy } from '@/application/ai/HeuristicMoveStrategy';
import { HumanPlayerController } from '@/application/controllers/HumanPlayerController';
import type { IPlayerController } from '@/application/ports/IPlayerController';
import type { GameSession } from '@/application/session/GameSession';
import { playTurn } from '@/application/use-cases/PlayTurnUseCase';
import { startGame } from '@/application/use-cases/StartGameUseCase';
import { randomProvider } from '@/config/container';
import { getCurrentPlayer, type GameState, type Move, type PlayerColor } from '@/domain';

export interface UseGameSessionResult {
  readonly state: GameState;
  /** Non-null exactly when it's the human's turn to pick one of these. */
  readonly validMoves: readonly Move[] | null;
  readonly humanColor: PlayerColor;
  submitMove(move: Move): void;
}

/**
 * Drives a full offline game: one human seat plus AI opponents on the
 * remaining colors, auto-playing every AI turn (including their bonus
 * rolls) and pausing only when it's the human's turn to tap a piece.
 */
export function useGameSession(
  humanColor: PlayerColor,
  aiColors: readonly PlayerColor[],
): UseGameSessionResult {
  // Lazy useState initializers, not refs: they run exactly once and never
  // touch `.current` during render, which React 19's stricter hooks rules
  // (react-hooks/refs) forbid even for the classic "lazy ref init" pattern.
  const [humanController] = useState(() => new HumanPlayerController());
  const [initialSession] = useState<GameSession>(() => {
    const controllers = new Map<PlayerColor, IPlayerController>();
    controllers.set(humanColor, humanController);
    for (const color of aiColors) {
      controllers.set(color, new AIPlayerController(new HeuristicMoveStrategy()));
    }
    return startGame(controllers);
  });

  const [state, setState] = useState<GameState>(initialSession.state);
  const [validMoves, setValidMoves] = useState<readonly Move[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run(): Promise<void> {
      let session = initialSession;
      while (!cancelled && session.state.status === 'IN_PROGRESS') {
        session = await playTurn(session, randomProvider, {
          onRoll(rolledState, movesForRoll) {
            if (cancelled) return;
            setState(rolledState);
            const isHumanTurn = getCurrentPlayer(rolledState).color === humanColor;
            setValidMoves(isHumanTurn && movesForRoll.length > 0 ? movesForRoll : null);
          },
          onMove(movedState) {
            if (cancelled) return;
            setState(movedState);
            setValidMoves(null);
          },
        });
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
    // A session is fixed for the lifetime of this hook instance — humanColor
    // and aiColors are the seating for one game, not reactive inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitMove = useCallback(
    (move: Move) => {
      humanController.submitMove(move);
    },
    [humanController],
  );

  return { state, validMoves, humanColor, submitMove };
}
