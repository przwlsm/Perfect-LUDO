import { getCurrentPlayer, type GameState } from './GameState';

describe('getCurrentPlayer', () => {
  const baseState: GameState = {
    players: [{ id: 'RED', color: 'RED', pieces: [] }],
    currentPlayerIndex: 0,
    lastRoll: null,
    consecutiveSixes: 0,
    status: 'IN_PROGRESS',
    winnerColor: null,
  };

  it('returns the player at currentPlayerIndex', () => {
    expect(getCurrentPlayer(baseState).color).toBe('RED');
  });

  it('throws for an out-of-range currentPlayerIndex', () => {
    expect(() => getCurrentPlayer({ ...baseState, currentPlayerIndex: 5 })).toThrow();
  });
});
