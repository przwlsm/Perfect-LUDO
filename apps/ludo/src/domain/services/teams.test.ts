import type { GameState } from '../entities/GameState';
import { isGameState } from '../entities/parseGameState';
import {
  applyMove,
  controlledColor,
  createGame,
  getValidMovesForCurrentPlayer,
} from './GameEngine';

/** Sets each listed colour's pieces to the given progress values. */
function board(
  progress: Partial<Record<'RED' | 'GREEN' | 'YELLOW' | 'BLUE', number[]>>,
  teams: boolean,
  roll: 1 | 2 | 3 | 4 | 5 | 6,
): GameState {
  const start = createGame(['RED', 'GREEN', 'YELLOW', 'BLUE'], { teams });
  return {
    ...start,
    lastRoll: roll,
    players: start.players.map((p) => {
      const values = progress[p.color as keyof typeof progress];
      return values
        ? { ...p, pieces: p.pieces.map((piece, i) => ({ ...piece, progress: values[i] ?? 0 })) }
        : p;
    }),
  };
}

describe('2 v 2 teams', () => {
  it('only a four-seat board can be played in teams', () => {
    expect(createGame(['RED', 'GREEN', 'YELLOW', 'BLUE'], { teams: true }).teams).toBe(true);
    expect(createGame(['RED', 'YELLOW'], { teams: true }).teams).toBeUndefined();
  });

  it('partners never capture each other; rivals still do', () => {
    // Red at 28 rolls 3 onto square 30, where a lone yellow coin (progress 5) sits.
    const solo = getValidMovesForCurrentPlayer(board({ RED: [28], YELLOW: [5] }, false, 3));
    expect(solo[0]?.capturedPieceIds).toEqual(['YELLOW-0']);
    const team = getValidMovesForCurrentPlayer(board({ RED: [28], YELLOW: [5] }, true, 3));
    expect(team[0]?.capturedPieceIds).toEqual([]);
    // Green is a rival: its lone coin on square 30 (progress 18) is still captured.
    const rival = getValidMovesForCurrentPlayer(board({ RED: [28], GREEN: [18] }, true, 3));
    expect(rival[0]?.capturedPieceIds).toEqual(['GREEN-0']);
  });

  it('a partner pair does not block you', () => {
    const blocked = getValidMovesForCurrentPlayer(board({ RED: [28], YELLOW: [5, 5] }, false, 3));
    expect(blocked.find((m) => m.pieceId === 'RED-0')).toBeUndefined();
    const open = getValidMovesForCurrentPlayer(board({ RED: [28], YELLOW: [5, 5] }, true, 3));
    expect(open.find((m) => m.pieceId === 'RED-0')?.toProgress).toBe(31);
  });

  it('a player whose coins are home moves their partner’s', () => {
    const state = board({ RED: [57, 57, 57, 57], YELLOW: [10] }, true, 3);
    expect(controlledColor(state)).toBe('YELLOW');
    const moves = getValidMovesForCurrentPlayer(state);
    expect(moves.map((m) => m.pieceId)).toEqual(['YELLOW-0']);
  });

  it('the pair wins together once all eight coins are home', () => {
    const state = board({ RED: [57, 57, 57, 57], YELLOW: [57, 57, 57, 55] }, true, 2);
    const [move] = getValidMovesForCurrentPlayer(state);
    const after = applyMove(state, move!);
    expect(after.status).toBe('FINISHED');
    expect(after.winnerColor).toBe('RED');
    expect(isGameState(after, 4)).toBe(true);
  });

  it('one partner home alone does not end a team game', () => {
    const state = board({ RED: [57, 57, 57, 55] }, true, 2);
    const [move] = getValidMovesForCurrentPlayer(state);
    const after = applyMove(state, move!);
    expect(after.status).toBe('IN_PROGRESS');
  });

  it('a saved board claiming teams on the wrong table size is rejected', () => {
    const two = { ...createGame(['RED', 'YELLOW']), teams: true };
    expect(isGameState(two, 2)).toBe(false);
    const finishedAlone: GameState = {
      ...board({ RED: [57, 57, 57, 57] }, true, 2),
      lastRoll: null,
      status: 'FINISHED',
      winnerColor: 'RED',
    };
    expect(isGameState(finishedAlone, 4)).toBe(false);
  });
});
