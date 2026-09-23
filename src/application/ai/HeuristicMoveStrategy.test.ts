import type { Move } from '@/domain';
import { HeuristicMoveStrategy } from './HeuristicMoveStrategy';

function move(overrides: Partial<Move> & { pieceId: string }): Move {
  return { fromProgress: 10, toProgress: 12, capturedPieceIds: [], ...overrides };
}

describe('HeuristicMoveStrategy', () => {
  const strategy = new HeuristicMoveStrategy();

  it('throws when there are no valid moves', () => {
    expect(() => strategy.selectMove({} as never, [])).toThrow();
  });

  it('prefers capturing the most pieces over any other option', () => {
    const doubleCapture = move({ pieceId: 'double', capturedPieceIds: ['x', 'y'] });
    const moves = [
      move({ pieceId: 'finisher', toProgress: 57 }),
      move({ pieceId: 'single-capture', capturedPieceIds: ['x'] }),
      doubleCapture,
    ];

    expect(strategy.selectMove({} as never, moves)).toBe(doubleCapture);
  });

  it('prefers finishing a piece over leaving the yard or advancing', () => {
    const finisher = move({ pieceId: 'finisher', toProgress: 57 });
    const moves = [
      move({ pieceId: 'leaver', fromProgress: 0, toProgress: 1 }),
      finisher,
      move({ pieceId: 'advancer', fromProgress: 20, toProgress: 22 }),
    ];

    expect(strategy.selectMove({} as never, moves)).toBe(finisher);
  });

  it('prefers leaving the yard over merely advancing a piece already in play', () => {
    const leaver = move({ pieceId: 'leaver', fromProgress: 0, toProgress: 1 });
    const moves = [move({ pieceId: 'advancer', fromProgress: 20, toProgress: 22 }), leaver];

    expect(strategy.selectMove({} as never, moves)).toBe(leaver);
  });

  it('otherwise advances the piece that has progressed the furthest', () => {
    const furthest = move({ pieceId: 'furthest', fromProgress: 40, toProgress: 42 });
    const moves = [move({ pieceId: 'nearer', fromProgress: 10, toProgress: 12 }), furthest];

    expect(strategy.selectMove({} as never, moves)).toBe(furthest);
  });
});
