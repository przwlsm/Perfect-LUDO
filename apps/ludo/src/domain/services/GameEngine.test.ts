import type { GameState } from '../entities/GameState';
import { QueuedRandomProvider } from '../testing/QueuedRandomProvider';
import {
  applyMove,
  createGame,
  endTurnWithoutMove,
  getValidMovesForCurrentPlayer,
  rollDice,
} from './GameEngine';

describe('createGame', () => {
  it('rejects repeated seats', () => {
    expect(() => createGame(['RED', 'RED'])).toThrow();
  });
  it('starts every piece in the yard on player 0s turn', () => {
    const state = createGame(['RED', 'GREEN']);

    expect(state.currentPlayerIndex).toBe(0);
    expect(state.status).toBe('IN_PROGRESS');
    expect(state.players).toHaveLength(2);
    for (const player of state.players) {
      expect(player.pieces.every((piece) => piece.progress === 0)).toBe(true);
    }
  });

  it('rejects fewer than two players', () => {
    expect(() => createGame(['RED'])).toThrow();
  });
});

describe('rollDice', () => {
  it('records the rolled value and tracks the six streak', async () => {
    const random = new QueuedRandomProvider([6]);
    const state = await rollDice(createGame(['RED', 'GREEN']), random);

    expect(state.lastRoll).toBe(6);
    expect(state.consecutiveSixes).toBe(1);
  });

  it('resets the six streak on a non-six roll', async () => {
    const random = new QueuedRandomProvider([4]);
    const withStreak = { ...createGame(['RED', 'GREEN']), consecutiveSixes: 2 };

    const state = await rollDice(withStreak, random);

    expect(state.consecutiveSixes).toBe(0);
  });

  it('refuses to roll again before the current roll is resolved', async () => {
    const random = new QueuedRandomProvider([3]);
    const state = await rollDice(createGame(['RED', 'GREEN']), random);

    await expect(rollDice(state, random)).rejects.toThrow();
  });
});

describe('turn flow', () => {
  it('ignores caller-forged captures and computes captures from legal moves', async () => {
    const base = createGame(['RED', 'GREEN']);
    const state = await rollDice(
      {
        ...base,
        players: [
          base.players[0]!,
          {
            ...base.players[1]!,
            pieces: base.players[1]!.pieces.map((p) => ({ ...p, progress: 5 })),
          },
        ],
      },
      new QueuedRandomProvider([6]),
    );
    const legal = getValidMovesForCurrentPlayer(state)[0]!;
    const moved = applyMove(state, { ...legal, capturedPieceIds: ['GREEN-0'] });
    expect(moved.players[1]!.pieces[0]!.progress).toBe(5);
  });
  it('passes the turn when no piece can leave the yard', async () => {
    const random = new QueuedRandomProvider([3]);
    let state = createGame(['RED', 'GREEN']);
    state = await rollDice(state, random);

    expect(getValidMovesForCurrentPlayer(state)).toEqual([]);

    state = endTurnWithoutMove(state);
    expect(state.currentPlayerIndex).toBe(1);
    expect(state.lastRoll).toBeNull();
  });

  it('grants a bonus turn for rolling a six', async () => {
    const random = new QueuedRandomProvider([6]);
    let state = createGame(['RED', 'GREEN']);
    state = await rollDice(state, random);

    const [move] = getValidMovesForCurrentPlayer(state);
    state = applyMove(state, move!);

    expect(state.currentPlayerIndex).toBe(0); // same player goes again
    expect(state.lastRoll).toBeNull();
  });

  it('grants a bonus turn for capturing an opponent piece', async () => {
    // RED sits on square 2 (progress 3, unsafe). GREEN is one step away at
    // progress 41 (square 1); rolling a 1 lands GREEN on square 2 and
    // should capture RED while also granting GREEN another turn.
    const base = createGame(['RED', 'GREEN']);
    let state: GameState = {
      ...base,
      currentPlayerIndex: 1,
      players: [
        {
          ...base.players[0]!,
          pieces: [
            { id: 'RED-0', color: 'RED' as const, progress: 3 },
            ...base.players[0]!.pieces.slice(1),
          ],
        },
        {
          ...base.players[1]!,
          pieces: [
            { id: 'GREEN-0', color: 'GREEN' as const, progress: 41 },
            ...base.players[1]!.pieces.slice(1),
          ],
        },
      ],
    };

    state = await rollDice(state, new QueuedRandomProvider([1]));
    const move = getValidMovesForCurrentPlayer(state).find((m) => m.pieceId === 'GREEN-0')!;
    expect(move.capturedPieceIds).toEqual(['RED-0']);

    state = applyMove(state, move);

    const redPiece = state.players[0]!.pieces.find((p) => p.id === 'RED-0')!;
    expect(redPiece.progress).toBe(0); // sent back to the yard
    expect(state.currentPlayerIndex).toBe(1); // GREEN goes again
    expect(state.lastRoll).toBeNull();
  });

  it('forfeits the turn after three consecutive sixes', async () => {
    let state = createGame(['RED', 'GREEN']);
    state = await rollDice(state, new QueuedRandomProvider([6]));
    state = applyMove(state, getValidMovesForCurrentPlayer(state)[0]!);
    state = await rollDice(state, new QueuedRandomProvider([6]));
    state = applyMove(state, getValidMovesForCurrentPlayer(state)[0]!);

    state = await rollDice(state, new QueuedRandomProvider([6]));
    expect(state.consecutiveSixes).toBe(3);
    expect(getValidMovesForCurrentPlayer(state)).toEqual([]);

    state = endTurnWithoutMove(state);
    expect(state.currentPlayerIndex).toBe(1);
  });

  it('passes the turn after an ordinary move that neither rolls a six, captures, nor finishes', async () => {
    const base = createGame(['RED', 'GREEN']);
    let state: GameState = {
      ...base,
      consecutiveSixes: 1, // simulate a prior six earlier in a bonus sequence
      players: [
        {
          ...base.players[0]!,
          pieces: [{ id: 'RED-0', color: 'RED', progress: 1 }, ...base.players[0]!.pieces.slice(1)],
        },
        base.players[1]!,
      ],
    };

    state = await rollDice(state, new QueuedRandomProvider([2])); // 1 -> 3, empty unsafe square
    const move = getValidMovesForCurrentPlayer(state).find((m) => m.pieceId === 'RED-0')!;
    expect(move.capturedPieceIds).toEqual([]);

    state = applyMove(state, move);

    expect(state.currentPlayerIndex).toBe(1);
    expect(state.consecutiveSixes).toBe(0);
    expect(state.lastRoll).toBeNull();
  });

  it('rejects a move that does not match a currently legal move', async () => {
    let state = createGame(['RED', 'GREEN']);
    state = await rollDice(state, new QueuedRandomProvider([3]));

    expect(() =>
      applyMove(state, {
        pieceId: 'RED-0',
        fromProgress: 0,
        toProgress: 1,
        capturedPieceIds: [],
      }),
    ).toThrow();
  });
});

describe('finished games', () => {
  function finishedState(): GameState {
    const base = createGame(['RED', 'GREEN']);
    return { ...base, status: 'FINISHED', winnerColor: 'RED' };
  }

  it('refuses to roll dice once the game has finished', async () => {
    await expect(rollDice(finishedState(), new QueuedRandomProvider([3]))).rejects.toThrow();
  });

  it('refuses to apply a move once the game has finished', () => {
    expect(() =>
      applyMove(finishedState(), {
        pieceId: 'RED-0',
        fromProgress: 0,
        toProgress: 1,
        capturedPieceIds: [],
      }),
    ).toThrow();
  });
});

describe('winning', () => {
  it('finishes the game once every piece of one player reaches home', async () => {
    let state = createGame(['RED', 'GREEN']);
    state = {
      ...state,
      players: [
        {
          ...state.players[0]!,
          pieces: [
            { id: 'RED-0', color: 'RED', progress: 51 },
            { id: 'RED-1', color: 'RED', progress: 57 },
            { id: 'RED-2', color: 'RED', progress: 57 },
            { id: 'RED-3', color: 'RED', progress: 57 },
          ],
        },
        state.players[1]!,
      ],
    };

    state = await rollDice(state, new QueuedRandomProvider([6]));
    const move = getValidMovesForCurrentPlayer(state).find((m) => m.toProgress === 57)!;
    state = applyMove(state, move);

    expect(state.status).toBe('FINISHED');
    expect(state.winnerColor).toBe('RED');
  });
});
