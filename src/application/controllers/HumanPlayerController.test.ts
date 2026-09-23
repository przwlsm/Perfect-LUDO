import type { GameState, Move } from '@/domain';
import { HumanPlayerController } from './HumanPlayerController';

const move: Move = { pieceId: 'a', fromProgress: 0, toProgress: 1, capturedPieceIds: [] };
const state = {} as GameState;

describe('HumanPlayerController', () => {
  it('resolves chooseMove only once submitMove is called', async () => {
    const controller = new HumanPlayerController();
    expect(controller.isAwaitingMove()).toBe(false);

    const pending = controller.chooseMove(state, [move]);
    expect(controller.isAwaitingMove()).toBe(true);

    controller.submitMove(move);
    await expect(pending).resolves.toBe(move);
    expect(controller.isAwaitingMove()).toBe(false);
  });

  it('rejects a second concurrent chooseMove call', async () => {
    const controller = new HumanPlayerController();
    const pending = controller.chooseMove(state, [move]);

    await expect(controller.chooseMove(state, [move])).rejects.toThrow();

    controller.submitMove(move);
    await pending;
  });

  it('is a no-op when submitMove is called with nothing awaited', () => {
    const controller = new HumanPlayerController();
    expect(() => controller.submitMove(move)).not.toThrow();
  });

  it('ignores a duplicate submitMove for a decision that already resolved', async () => {
    const controller = new HumanPlayerController();
    const pending = controller.chooseMove(state, [move]);

    controller.submitMove(move);
    const other: Move = { pieceId: 'b', fromProgress: 0, toProgress: 1, capturedPieceIds: [] };
    expect(() => controller.submitMove(other)).not.toThrow();

    await expect(pending).resolves.toBe(move); // the first call's move wins
  });
});
