import { newMatch } from '@/application/session/MatchRepository';
import { getGameCue } from './gameFeedback';
import type { GameState } from '@/domain';
const initial = newMatch({ mode: 'local', players: 2, difficulty: 'smart' }).state;
function state(red: number, yellow: number): GameState {
  return {
    ...initial,
    players: initial.players.map((player) => ({
      ...player,
      pieces: player.pieces.map((piece, index) =>
        index ? piece : { ...piece, progress: player.color === 'RED' ? red : yellow },
      ),
    })),
  };
}
it('distinguishes rolls, yard exits, steps, captures, home and victory', () => {
  expect(getGameCue(initial, { ...initial, lastRoll: 6 })).toEqual({ cue: 'roll', steps: 0 });
  expect(getGameCue(state(0, 0), state(1, 0))).toEqual({ cue: 'enter', steps: 1 });
  expect(getGameCue(state(8, 0), state(14, 0))).toEqual({ cue: 'step', steps: 6 });
  expect(getGameCue(state(8, 35), state(9, 0))).toEqual({ cue: 'capture', steps: 1 });
  expect(getGameCue(state(54, 0), state(57, 0))).toEqual({ cue: 'home', steps: 3 });
  expect(
    getGameCue(state(54, 0), { ...state(57, 0), status: 'FINISHED', winnerColor: 'RED' }),
  ).toEqual({ cue: 'win', steps: 3 });
  expect(getGameCue(initial, initial)).toBeNull();
});
