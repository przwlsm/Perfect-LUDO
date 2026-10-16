import { createGame } from '@/domain';
import { QueuedRandomProvider } from '@/domain/testing/QueuedRandomProvider';
import { rollDiceForCurrentPlayer } from './RollDiceUseCase';

describe('rollDiceForCurrentPlayer', () => {
  it('returns AWAITING_MOVE with the legal moves when a move is possible', async () => {
    const state = createGame(['RED', 'GREEN']);
    const outcome = await rollDiceForCurrentPlayer(state, new QueuedRandomProvider([6]));

    expect(outcome.kind).toBe('AWAITING_MOVE');
    if (outcome.kind === 'AWAITING_MOVE') {
      expect(outcome.validMoves).toHaveLength(4); // any of the 4 yard pieces can come out on a 6
      expect(outcome.state.lastRoll).toBe(6);
    }
  });

  it('auto-passes the turn when the roll leaves no legal move', async () => {
    const state = createGame(['RED', 'GREEN']);
    const outcome = await rollDiceForCurrentPlayer(state, new QueuedRandomProvider([4]));

    expect(outcome.kind).toBe('TURN_PASSED');
    expect(outcome.state.currentPlayerIndex).toBe(1);
    expect(outcome.state.lastRoll).toBeNull();
  });
});
