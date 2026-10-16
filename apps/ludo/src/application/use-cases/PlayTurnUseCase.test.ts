import type { Move, PlayerColor } from '@/domain';
import { QueuedRandomProvider } from '@/domain/testing/QueuedRandomProvider';
import { AIPlayerController } from '../ai/AIPlayerController';
import { HumanPlayerController } from '../controllers/HumanPlayerController';
import type { IPlayerController } from '../ports/IPlayerController';
import type { IMoveSelectionStrategy } from '../ports/IMoveSelectionStrategy';
import { startGame } from './StartGameUseCase';
import { playTurn } from './PlayTurnUseCase';

/** Always picks the first legal move — deterministic and easy to reason about in tests. */
const firstMoveStrategy: IMoveSelectionStrategy = { selectMove: (_state, moves) => moves[0]! };

function twoPlayerControllers(
  red: IPlayerController,
  green: IPlayerController,
): ReadonlyMap<PlayerColor, IPlayerController> {
  return new Map([
    ['RED', red],
    ['GREEN', green],
  ]);
}

describe('playTurn', () => {
  it('never asks the controller for a move when the roll leaves nothing playable', async () => {
    const red: IPlayerController = { chooseMove: jest.fn() };
    const session = startGame(twoPlayerControllers(red, new AIPlayerController(firstMoveStrategy)));

    const result = await playTurn(session, new QueuedRandomProvider([4]));

    expect(red.chooseMove).not.toHaveBeenCalled();
    expect(result.state.currentPlayerIndex).toBe(1);
  });

  it('keeps the same AI player rolling through bonus turns until an ordinary move ends it', async () => {
    const onRoll = jest.fn();
    const onMove = jest.fn();
    const session = startGame(
      twoPlayerControllers(
        new AIPlayerController(firstMoveStrategy),
        new AIPlayerController(firstMoveStrategy),
      ),
    );

    // 6 -> leave yard (bonus), then 3 -> ordinary advance (turn passes).
    const result = await playTurn(session, new QueuedRandomProvider([6, 3]), { onRoll, onMove });

    expect(onRoll).toHaveBeenCalledTimes(2);
    expect(onMove).toHaveBeenCalledTimes(2);
    expect(result.state.currentPlayerIndex).toBe(1);
  });

  it('resolves once a HumanPlayerController receives submitMove', async () => {
    const human = new HumanPlayerController();
    const base = startGame(twoPlayerControllers(human, new AIPlayerController(firstMoveStrategy)));
    // Give RED a piece already on the track so a non-six roll still has a
    // legal move — otherwise playTurn would auto-pass without ever asking
    // the controller for anything.
    const session = {
      ...base,
      state: {
        ...base.state,
        players: [
          {
            ...base.state.players[0]!,
            pieces: [
              { id: 'RED-0', color: 'RED' as const, progress: 10 },
              ...base.state.players[0]!.pieces.slice(1),
            ],
          },
          base.state.players[1]!,
        ],
      },
    };

    const pending = playTurn(session, new QueuedRandomProvider([3]));

    // Flush the microtask queue so the roll resolves and the controller
    // starts awaiting a move before we inspect it.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(human.isAwaitingMove()).toBe(true);

    const move: Move = { pieceId: 'RED-0', fromProgress: 10, toProgress: 13, capturedPieceIds: [] };
    human.submitMove(move);

    const result = await pending;
    expect(result.state.currentPlayerIndex).toBe(1); // ordinary move, turn passes
  });
});
