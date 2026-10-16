import { sameFacing, turnable } from '@/domain/entities/Board';
import { flow } from '../engine/flow';
import { solve } from '../engine/solver';
import { HOW_BOARDS, parseBoard } from '../levels/handmade';
import { levelFor } from '../levels/levels';
import { applyHint, findHint } from './hint';
import {
  cloudsLeft,
  commit,
  evaluate,
  historyOf,
  redo,
  refusal,
  restart,
  startState,
  starsFor,
  turn,
  undo,
  type PlayState,
} from './play';

describe('playing a level', () => {
  const l = HOW_BOARDS.turn;

  it('turns a tile a quarter turn each tap, and solves', () => {
    let s = startState(l);
    expect(evaluate(l, s).solved).toBe(false);
    s = turn(l, s, 1)!; // the straight: one tap
    s = turn(l, s, 5)!; // the field: one tap
    expect(s.turns).toBe(2);
    expect(evaluate(l, s).solved).toBe(true);
  });

  it('never turns rocks, fixed tiles, bridges or hinted tiles', () => {
    const fixed = parseBoard('fx', ['s20 PA1 f80']);
    expect(refusal(fixed, startState(fixed), 1)).toBe('fixed');
    expect(turn(fixed, startState(fixed), 1)).toBeNull();
    expect(refusal(l, startState(l), 3)).toBe('still'); // a rock
    expect(refusal(HOW_BOARDS.bridge, startState(HOW_BOARDS.bridge), 4)).toBe('still');
    const hinted: PlayState = { ...startState(l), hinted: [1] };
    expect(refusal(l, hinted, 1)).toBe('hinted');
  });

  it('undoes and redoes, and a step back still counts as a turn', () => {
    let h = historyOf(startState(l));
    h = commit(h, turn(l, h.present, 1));
    h = commit(h, turn(l, h.present, 5));
    expect(evaluate(l, h.present).solved).toBe(true);
    h = undo(h);
    expect(h.present.rot[5]).toBe(l.start[5]);
    expect(h.present.turns).toBe(3);
    h = redo(h);
    expect(evaluate(l, h.present).solved).toBe(true);
    expect(h.present.turns).toBe(4);
    expect(commit(h, null)).toBe(h);
  });

  it('starts over but keeps what hints set', () => {
    let s = turn(l, startState(l), 1)!;
    s = applyHint(s, { at: 5, rot: 0 });
    const again = restart(l, s);
    expect(again.rot[1]).toBe(l.start[1]);
    expect(again.rot[5]).toBe(0);
    expect(again.hinted).toEqual([5]);
  });

  it('gives stars: three clean and inside the clouds, two with one hint or over, else one', () => {
    expect(starsFor(0, 10, null)).toBe(3);
    expect(starsFor(0, 10, 12)).toBe(3);
    expect(starsFor(0, 13, 12)).toBe(2);
    expect(starsFor(1, 5, 12)).toBe(2);
    expect(starsFor(1, 20, 12)).toBe(2);
    expect(starsFor(2, 5, 12)).toBe(1);
  });

  it('counts the clouds down, never below zero', () => {
    const budgeted = { ...l, budget: 3 };
    let s = startState(budgeted);
    expect(cloudsLeft(budgeted, s)).toBe(3);
    for (let i = 0; i < 5; i++) s = turn(budgeted, s, 1)!;
    expect(cloudsLeft(budgeted, s)).toBe(0);
    expect(cloudsLeft(l, s)).toBeNull();
  });
});

describe('hints', () => {
  it('turns one wrong tile to the answer and locks it', () => {
    const l = levelFor(20);
    const s = startState(l);
    const hint = findHint(l, s)!;
    expect(hint).not.toBeNull();
    const tile = l.tiles[hint.at]!;
    expect(turnable(tile)).toBe(true);
    expect(sameFacing(tile, s.rot[hint.at]!, 0)).toBe(false);
    expect(sameFacing(tile, hint.rot, 0)).toBe(true);
    const next = applyHint(s, hint);
    expect(next.hinted).toContain(hint.at);
    expect(next.turns).toBe(s.turns);
  });

  it('never touches a tile the player already has right', () => {
    const l = levelFor(40);
    // Put half the wrong tiles right by hand.
    const rot = [...l.start];
    l.tiles.forEach((t, at) => {
      if (turnable(t) && at % 2 === 0) rot[at] = 0;
    });
    const s: PlayState = { rot, hinted: [], turns: 0 };
    let state = s;
    for (let k = 0; k < 5; k++) {
      const hint = findHint(l, state)!;
      expect(sameFacing(l.tiles[hint.at]!, state.rot[hint.at]!, 0)).toBe(false);
      state = applyHint(state, hint);
    }
  });

  it('starts near the springs, so each hint moves the water on', () => {
    const l = HOW_BOARDS.turn;
    const hint = findHint(l, startState(l))!;
    expect(hint.at).toBe(1); // the channel next to the spring, before the field
  });

  it('hints alone solve a level, one tile at a time', () => {
    for (const n of [5, 33, 77, 140]) {
      const l = levelFor(n);
      let s = startState(l);
      let hints = 0;
      while (!evaluate(l, s).solved) {
        const hint = findHint(l, s);
        expect(hint).not.toBeNull();
        s = applyHint(s, hint!);
        hints++;
        expect(hints).toBeLessThanOrEqual(l.tiles.length);
      }
      expect(flow(l, s.rot).solved).toBe(true);
    }
  });

  it('on a board with two answers, follows the one closest to the player', () => {
    const twin = parseBoard('twin', ['s20 f80', 'f10 s10']);
    expect(solve(twin, { limit: 5 }).solutions).toHaveLength(2);
    // The player has the first spring facing south and its paddy facing it: the second answer.
    const s: PlayState = { rot: [1, 3, 3, 3], hinted: [], turns: 1 };
    const hint = findHint(twin, s)!;
    const after = applyHint(s, hint);
    expect([2, 3]).toContain(hint.at);
    expect(after.rot[0]).toBe(1);
  });

  it('says nothing when every tile already faces right', () => {
    const l = HOW_BOARDS.turn;
    expect(findHint(l, { rot: l.tiles.map(() => 0), hinted: [], turns: 0 })).toBeNull();
  });
});
