import {
  applyMove,
  createGame,
  endTurnWithoutMove,
  getCurrentPlayer,
  getFinishProgress,
  getValidMovesForCurrentPlayer,
  rollDice,
  seatColors,
  type GameState,
} from '@/domain';
import { NO_STATS } from '@/domain';
import { accumulateStats } from './matchStats';

const die = (n: number) => ({ nextInt: async () => n });

describe('accumulateStats', () => {
  it('counts a six only for the colour that rolled it', async () => {
    const start = createGame(seatColors(2));
    const rolled = await rollDice(start, die(6));
    const mover = getCurrentPlayer(start).color;
    const other = start.players.find((p) => p.color !== mover)!.color;
    expect(accumulateStats(NO_STATS, start, rolled, mover).sixes).toBe(1);
    expect(accumulateStats(NO_STATS, start, rolled, other).sixes).toBe(0);
    const four = await rollDice(start, die(4));
    expect(accumulateStats(NO_STATS, start, four, mover).sixes).toBe(0);
  });

  it('counts captures by the mover and coins reaching home', () => {
    const base = createGame(seatColors(2));
    const [a, b] = base.players;
    const finish = getFinishProgress(2);
    const before: GameState = {
      ...base,
      currentPlayerIndex: 0,
      lastRoll: 3,
      players: [
        { ...a!, pieces: a!.pieces.map((p, i) => (i === 0 ? { ...p, progress: finish - 3 } : p)) },
        { ...b!, pieces: b!.pieces.map((p, i) => (i === 0 ? { ...p, progress: 20 } : p)) },
      ],
    };
    const after: GameState = {
      ...before,
      lastRoll: null,
      players: [
        {
          ...before.players[0]!,
          pieces: before.players[0]!.pieces.map((p, i) =>
            i === 0 ? { ...p, progress: finish } : p,
          ),
        },
        {
          ...before.players[1]!,
          pieces: before.players[1]!.pieces.map((p, i) => (i === 0 ? { ...p, progress: 0 } : p)),
        },
      ],
    };
    expect(accumulateStats(NO_STATS, before, after, a!.color)).toEqual({
      sixes: 0,
      captures: 1,
      home: 1,
    });
    // The captured player gains nothing from losing a coin.
    expect(accumulateStats(NO_STATS, before, after, b!.color)).toEqual({
      sixes: 0,
      captures: 0,
      home: 0,
    });
  });

  it('adds up over a whole game without ever going backwards', async () => {
    let state = createGame(seatColors(4));
    let stats = NO_STATS;
    let seed = 7;
    const random = { nextInt: async () => ((seed = (seed * 16807) % 2147483647) % 6) + 1 };
    for (let turn = 0; turn < 600 && state.status === 'IN_PROGRESS'; turn++) {
      const rolled = await rollDice(state, random);
      const next = stats;
      stats = accumulateStats(stats, state, rolled, 'RED');
      const moves = getValidMovesForCurrentPlayer(rolled);
      const moved = moves.length ? applyMove(rolled, moves[0]!) : endTurnWithoutMove(rolled);
      stats = accumulateStats(stats, rolled, moved, 'RED');
      expect(stats.sixes).toBeGreaterThanOrEqual(next.sixes);
      state = moved;
    }
    expect(stats.home).toBeLessThanOrEqual(4);
  });
});
