import { boardToString, type Move } from 'baghchal-engine';
import { canUndo, freshLocalGame, reduceLocalGame, type LocalGame } from './localGame';

const place = (to: number): Move => ({ kind: 'place', to });
const move = (from: number, to: number): Move => ({ kind: 'move', from, to });

function play(state: LocalGame, ...moves: Move[]): LocalGame {
  return moves.reduce((s, m) => reduceLocalGame(s, { type: 'move', move: m }), state);
}

describe('local game', () => {
  it('records each move in the list with its ply and side', () => {
    const state = play(freshLocalGame(), place(12), move(0, 1));
    expect(state.history).toEqual([
      { ply: 1, side: 'goat', move: place(12) },
      { ply: 2, side: 'tiger', move: move(0, 1) },
    ]);
    expect(state.pieces).toHaveLength(5);
  });

  it('clears the selection and the hint when a move is made', () => {
    let state = reduceLocalGame(freshLocalGame(), { type: 'hint', move: place(12) });
    state = reduceLocalGame(state, { type: 'tap', outcome: { selected: null, move: place(7) } });
    expect(state.hint).toBeNull();
    expect(state.selected).toBeNull();
  });

  it('undoes one move between two people', () => {
    const before = play(freshLocalGame(), place(12));
    const after = play(before, move(0, 1));
    const undone = reduceLocalGame(after, { type: 'undo', aiSide: null });
    expect(boardToString(undone.game.board)).toBe(boardToString(before.game.board));
    expect(undone.history).toEqual(before.history);
    expect(undone.pieces).toEqual(before.pieces);
    expect(undone.past).toHaveLength(1);
  });

  it('undoes the computer’s reply too, back to the person’s own move', () => {
    // The person plays goats; the tigers are the computer.
    const mine = play(freshLocalGame(), place(12));
    const theirs = play(mine, move(0, 1));
    const undone = reduceLocalGame(theirs, { type: 'undo', aiSide: 'tiger' });
    expect(undone.game.plies).toBe(0);
    expect(undone.game.turn).toBe('goat');
    expect(undone.history).toEqual([]);
  });

  it('gives the person their move back while the computer is still to reply', () => {
    const mine = play(freshLocalGame(), place(12));
    const undone = reduceLocalGame(mine, { type: 'undo', aiSide: 'tiger' });
    expect(undone.game.plies).toBe(0);
  });

  it('does nothing at the start', () => {
    const start = freshLocalGame();
    expect(canUndo(start)).toBe(false);
    expect(reduceLocalGame(start, { type: 'undo', aiSide: null })).toBe(start);
  });

  it('restarts clean', () => {
    const state = play(freshLocalGame(), place(12), move(0, 1));
    expect(reduceLocalGame(state, { type: 'restart' })).toEqual(freshLocalGame());
  });
});
