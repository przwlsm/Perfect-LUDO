import {
  createGame,
  rollDice,
  getValidMovesForCurrentPlayer,
  applyMove,
  endTurnWithoutMove,
  PLAYER_COLORS,
  type IRandomProvider,
} from '@/domain';
import { HeuristicMoveStrategy } from '../ai/HeuristicMoveStrategy';

class SeededRandom implements IRandomProvider {
  constructor(private seed: number) {}
  async nextInt(min: number, max: number): Promise<number> {
    this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0;
    return min + Math.floor((this.seed / 4294967296) * (max - min + 1));
  }
}
describe('complete offline matches', () => {
  it.each([2, 3, 4])('finishes a %i-player match without an invalid transition', async (count) => {
    const random = new SeededRandom(count * 1349);
    const strategy = new HeuristicMoveStrategy();
    let state = createGame(PLAYER_COLORS.slice(0, count));
    let turns = 0;
    while (state.status === 'IN_PROGRESS' && turns < 5000) {
      state = await rollDice(state, random);
      const moves = getValidMovesForCurrentPlayer(state);
      state = moves.length
        ? applyMove(state, strategy.selectMove(state, moves))
        : endTurnWithoutMove(state);
      expect(
        state.players.every((p) =>
          p.pieces.every((piece) => piece.progress >= 0 && piece.progress <= 57),
        ),
      ).toBe(true);
      turns++;
    }
    expect(state.status).toBe('FINISHED');
    expect(
      state.players
        .find((p) => p.color === state.winnerColor)
        ?.pieces.every((p) => p.progress === 57),
    ).toBe(true);
    expect(turns).toBeLessThan(5000);
  });
});
