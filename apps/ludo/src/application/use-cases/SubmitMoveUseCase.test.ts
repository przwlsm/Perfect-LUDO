import type { GameState, Move } from '@/domain';
import { createGame } from '@/domain';
import { submitMove } from './SubmitMoveUseCase';

function withLastRoll(state: GameState, lastRoll: GameState['lastRoll']): GameState {
  return { ...state, lastRoll };
}

describe('submitMove', () => {
  it('reports BONUS_TURN when the same player keeps their turn', () => {
    const state = withLastRoll(createGame(['RED', 'GREEN']), 6);
    const move: Move = { pieceId: 'RED-0', fromProgress: 0, toProgress: 1, capturedPieceIds: [] };

    const outcome = submitMove(state, move);

    expect(outcome.kind).toBe('BONUS_TURN');
  });

  it('reports TURN_PASSED when turn moves to the next player', () => {
    const base = createGame(['RED', 'GREEN']);
    const state: GameState = {
      ...base,
      lastRoll: 2,
      players: [
        {
          ...base.players[0]!,
          pieces: [{ id: 'RED-0', color: 'RED', progress: 1 }, ...base.players[0]!.pieces.slice(1)],
        },
        base.players[1]!,
      ],
    };
    const move: Move = { pieceId: 'RED-0', fromProgress: 1, toProgress: 3, capturedPieceIds: [] };

    const outcome = submitMove(state, move);

    expect(outcome.kind).toBe('TURN_PASSED');
    expect(outcome.state.currentPlayerIndex).toBe(1);
  });

  it('reports GAME_FINISHED with the winner once the last piece reaches home', () => {
    const base = createGame(['RED', 'GREEN']);
    const state: GameState = {
      ...base,
      lastRoll: 6,
      players: [
        {
          ...base.players[0]!,
          pieces: [
            { id: 'RED-0', color: 'RED', progress: 51 },
            { id: 'RED-1', color: 'RED', progress: 57 },
            { id: 'RED-2', color: 'RED', progress: 57 },
            { id: 'RED-3', color: 'RED', progress: 57 },
          ],
        },
        base.players[1]!,
      ],
    };
    const move: Move = { pieceId: 'RED-0', fromProgress: 51, toProgress: 57, capturedPieceIds: [] };

    const outcome = submitMove(state, move);

    expect(outcome.kind).toBe('GAME_FINISHED');
    if (outcome.kind === 'GAME_FINISHED') {
      expect(outcome.winner).toBe('RED');
    }
  });
});
