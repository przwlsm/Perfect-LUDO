import type { Move } from '@/domain';
import { RandomMoveStrategy } from './RandomMoveStrategy';

function move(pieceId: string): Move {
  return { pieceId, fromProgress: 0, toProgress: 1, capturedPieceIds: [] };
}

describe('RandomMoveStrategy', () => {
  it('throws when there are no valid moves', () => {
    const strategy = new RandomMoveStrategy();
    expect(() => strategy.selectMove({} as never, [])).toThrow();
  });

  it('picks the move at the index derived from the injected RNG', () => {
    const moves = [move('a'), move('b'), move('c')];
    const strategy = new RandomMoveStrategy(() => 0.5); // floor(0.5 * 3) = 1

    expect(strategy.selectMove({} as never, moves)).toBe(moves[1]);
  });

  it('never selects an out-of-range index at the RNG boundaries', () => {
    const moves = [move('a'), move('b')];
    expect(new RandomMoveStrategy(() => 0).selectMove({} as never, moves)).toBe(moves[0]);
    expect(new RandomMoveStrategy(() => 0.9999).selectMove({} as never, moves)).toBe(moves[1]);
  });
});
