import { createGame } from '../services/GameEngine';
import { isGameState } from './parseGameState';
it.each([null, {}, { players: [null, null] }, { players: [{}, {}] }])(
  'rejects malformed saves without crashing: %j',
  (value) => {
    expect(isGameState(value, 2)).toBe(false);
  },
);
it('rejects null pieces and invalid seat counts', () => {
  const game = createGame(['RED', 'YELLOW']);
  expect(isGameState(game, 2)).toBe(true);
  expect(isGameState(game, 9)).toBe(false);
  expect(
    isGameState(
      {
        ...game,
        players: game.players.map((p) => ({ ...p, pieces: [null, ...p.pieces.slice(1)] })),
      },
      2,
    ),
  ).toBe(false);
});
