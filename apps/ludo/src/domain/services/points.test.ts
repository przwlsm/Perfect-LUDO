import { getFinishProgress } from '../board';
import type { GameState } from '../entities/GameState';
import type { Player } from '../entities/Player';
import type { PlayerColor } from '../entities/PlayerColor';
import {
  POINTS_PER_CAPTURE,
  POINTS_PER_HOME,
  POINTS_TURNS,
  pointsLeader,
  standings,
  variantOf,
} from '../entities/Variant';
import {
  applyMove,
  createGame,
  endTurnWithoutMove,
  getValidMovesForCurrentPlayer,
} from './GameEngine';

const rolled = (state: GameState, die: 1 | 2 | 3 | 4 | 5 | 6): GameState => ({
  ...state,
  lastRoll: die,
  consecutiveSixes: die === 6 ? state.consecutiveSixes + 1 : 0,
});

const seat = (color: PlayerColor, progress: readonly number[]): Player => ({
  id: color,
  color,
  pieces: progress.map((p, i) => ({ id: `${color}-${i}`, color, progress: p })),
});

const move = (state: GameState, die: 1 | 2 | 3 | 4 | 5 | 6, pick = 0): GameState => {
  const r = rolled(state, die);
  return applyMove(r, getValidMovesForCurrentPlayer(r)[pick]!);
};

describe('Points mode', () => {
  it('opens with a turn limit, zero scores and no pairs', () => {
    const state = createGame(['RED', 'GREEN', 'YELLOW', 'BLUE'], {
      variant: 'points',
      teams: true,
    });
    expect(state.turnLimit).toBe(POINTS_TURNS);
    expect(state.turns).toBe(0);
    expect(state.scores).toEqual([0, 0, 0, 0]);
    expect(state.teams).toBeUndefined();
    expect(variantOf(state)).toBe('points');
  });

  it('scores steps for the seat on turn, and a bonus roll stays inside the turn', () => {
    let state = createGame(['RED', 'YELLOW'], { variant: 'points' });
    // A six brings a coin out: one step, a bonus roll, and the turn is not over.
    state = move(state, 6);
    expect(state.scores).toEqual([1, 0]);
    expect(state.turns).toBe(0);
    expect(state.currentPlayerIndex).toBe(0);
    // Four more steps, then the turn passes and is counted.
    state = move(state, 4);
    expect(state.scores).toEqual([5, 0]);
    expect(state.turns).toBe(1);
    expect(state.currentPlayerIndex).toBe(1);
  });

  it('scores a capture and a coin home', () => {
    const finish = getFinishProgress(2);
    // Yellow's coin at progress 37 sits on the square red reaches from 5 with a six.
    const trap: GameState = {
      ...createGame(['RED', 'YELLOW'], { variant: 'points' }),
      players: [seat('RED', [5, 0, 0, 0]), seat('YELLOW', [37, 0, 0, 0])],
    };
    const r = rolled(trap, 6);
    const capture = getValidMovesForCurrentPlayer(r).find((m) => m.capturedPieceIds.length > 0)!;
    expect(capture).toBeDefined();
    expect(applyMove(r, capture).scores![0]).toBe(6 + POINTS_PER_CAPTURE);

    const almost: GameState = {
      ...createGame(['RED', 'YELLOW'], { variant: 'points' }),
      players: [seat('RED', [finish - 2, 0, 0, 0]), seat('YELLOW', [0, 0, 0, 0])],
    };
    const home = move(almost, 2);
    expect(home.scores![0]).toBe(2 + POINTS_PER_HOME);
    // A coin home earns another roll in the same turn.
    expect(home.currentPlayerIndex).toBe(0);
    expect(home.turns).toBe(0);
    expect(home.status).toBe('IN_PROGRESS');
  });

  it('gives every player the same number of turns, however many bonus rolls one takes', () => {
    let state = createGame(['RED', 'YELLOW'], { variant: 'points' });
    // Red rolls two sixes (bonus rolls) and then a one: still a single turn.
    state = move(state, 6);
    state = move(state, 6);
    state = move(state, 1);
    expect(state.turns).toBe(1);
    expect(state.currentPlayerIndex).toBe(1);
  });

  it('ends once every player has had their turns, naming the leader as the winner on turn', () => {
    let state = createGame(['RED', 'YELLOW'], { variant: 'points' });
    const total = POINTS_TURNS * 2;
    // Nobody rolls a six: every turn is a pass.
    for (let i = 0; i < total - 1; i += 1) {
      state = endTurnWithoutMove(rolled(state, 1));
      expect(state.status).toBe('IN_PROGRESS');
    }
    expect(state.turns).toBe(total - 1);
    // Yellow is to play the last turn; red leads on the board.
    expect(state.currentPlayerIndex).toBe(1);
    state = { ...state, scores: [9, 3] };
    state = endTurnWithoutMove(rolled(state, 1));
    expect(state.turns).toBe(total);
    expect(state.status).toBe('FINISHED');
    expect(state.winnerColor).toBe('RED');
    // The server reads the winner from the seat on turn.
    expect(state.currentPlayerIndex).toBe(0);
    expect(standings(state)[0]).toBe('RED');
  });

  it('breaks ties by coins home, then progress, then seat', () => {
    const finish = getFinishProgress(2);
    const base = createGame(['RED', 'YELLOW'], { variant: 'points' });
    const tie: GameState = {
      ...base,
      scores: [10, 10],
      players: [seat('RED', [7, 0, 0, 0]), seat('YELLOW', [finish, 0, 0, 0])],
    };
    expect(pointsLeader(tie)).toBe('YELLOW');
    expect(pointsLeader({ ...tie, players: base.players })).toBe('RED');
  });

  it('is not counted on a classic board', () => {
    let state = createGame(['RED', 'YELLOW']);
    state = endTurnWithoutMove(rolled(state, 1));
    expect(state.turns).toBeUndefined();
    expect(state.scores).toBeUndefined();
  });
});
