import type { GameState } from '../entities/GameState';
import { createGame, getValidMovesForCurrentPlayer } from './GameEngine';
import { distinctMoves } from './MoveValidator';

function redAt(progress: number[], roll: 1 | 2 | 3 | 4 | 5 | 6): GameState {
  const start = createGame(['RED', 'YELLOW']);
  return {
    ...start,
    lastRoll: roll,
    players: start.players.map((p) =>
      p.color === 'RED'
        ? { ...p, pieces: p.pieces.map((piece, i) => ({ ...piece, progress: progress[i] ?? 0 })) }
        : p,
    ),
  };
}

describe('distinctMoves', () => {
  it('two coins stacked on one square are a single choice', () => {
    const moves = getValidMovesForCurrentPlayer(redAt([10, 10], 3));
    expect(moves).toHaveLength(2);
    expect(distinctMoves(moves)).toHaveLength(1);
  });

  it('all four coins on one square are a single choice', () => {
    const moves = getValidMovesForCurrentPlayer(redAt([10, 10, 10, 10], 4));
    expect(moves).toHaveLength(4);
    expect(distinctMoves(moves)).toEqual([moves[0]]);
  });

  it('coins waiting at home on a six are one choice', () => {
    expect(distinctMoves(getValidMovesForCurrentPlayer(redAt([0, 0, 0, 0], 6)))).toHaveLength(1);
  });

  it('coins on different squares stay separate choices', () => {
    const moves = getValidMovesForCurrentPlayer(redAt([10, 10, 20], 3));
    expect(distinctMoves(moves).map((m) => m.fromProgress)).toEqual([10, 20]);
  });

  it('a home coin and a board coin on a six are two choices', () => {
    expect(distinctMoves(getValidMovesForCurrentPlayer(redAt([0, 0, 0, 10], 6)))).toHaveLength(2);
  });
});
