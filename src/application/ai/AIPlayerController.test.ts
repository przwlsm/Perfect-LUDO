import type { GameState, Move } from '@/domain';
import { AIPlayerController } from './AIPlayerController';
import type { IMoveSelectionStrategy } from '../ports/IMoveSelectionStrategy';

describe('AIPlayerController', () => {
  it('delegates move selection to the injected strategy', async () => {
    const chosen: Move = { pieceId: 'a', fromProgress: 0, toProgress: 1, capturedPieceIds: [] };
    const strategy: IMoveSelectionStrategy = { selectMove: jest.fn(() => chosen) };
    const controller = new AIPlayerController(strategy);
    const state = {} as GameState;
    const validMoves = [chosen];

    const result = await controller.chooseMove(state, validMoves);

    expect(result).toBe(chosen);
    expect(strategy.selectMove).toHaveBeenCalledWith(state, validMoves);
  });
});
