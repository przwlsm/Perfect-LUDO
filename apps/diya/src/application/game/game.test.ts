import { random } from 'app-kit';
import { kindOf, type Level, type PieceKind } from '@/domain/entities/Board';
import { parseBoard } from '../levels/handmade';
import { levelFor } from '../levels/levels';
import { applyHint, findHint } from './hint';
import {
  commit,
  evaluate,
  historyOf,
  isFree,
  lift,
  move,
  place,
  redo,
  rotate,
  startState,
  starsFor,
  trayLeft,
  undo,
  type PlayState,
} from './play';

const lesson = parseBoard('t', [
  '.. .. .. .. ..',
  '.. /t .. dW ..',
  '.. .. .. .. ..',
  '.. .. .. .. ..',
  '.. F^ .. .. ..',
]);

describe('playing a level', () => {
  it('places, turns, moves and lifts tray pieces', () => {
    let s = startState(lesson);
    expect(trayLeft(lesson, s).get('mirror')).toBe(1);
    s = place(lesson, s, 'mirror', 6, 1)!;
    expect(trayLeft(lesson, s).get('mirror')).toBe(0);
    expect(evaluate(lesson, s).solved).toBe(false);
    s = rotate(s, 6)!;
    expect(evaluate(lesson, s).solved).toBe(true);
    expect(place(lesson, s, 'mirror', 0)).toBeNull(); // none left
    s = move(lesson, s, 6, 11)!;
    expect(evaluate(lesson, s).solved).toBe(false);
    s = lift(s, 11)!;
    expect(trayLeft(lesson, s).get('mirror')).toBe(1);
    expect(s.moves).toBe(4);
  });

  it('never places on a lamp, a flame or another piece', () => {
    const s = place(lesson, startState(lesson), 'mirror', 6)!;
    expect(isFree(lesson, s, 8)).toBe(false); // lamp
    expect(isFree(lesson, s, 21)).toBe(false); // flame
    expect(isFree(lesson, s, 6)).toBe(false); // the mirror
    expect(place(lesson, startState(lesson), 'prism', 0)).toBeNull(); // not in the tray
  });

  it('turns pivots in place', () => {
    const l = levelFor(1);
    const s = startState(l);
    expect(evaluate(l, s).solved).toBe(false);
    const at = Number(Object.keys(s.pivots)[0]);
    expect(evaluate(l, rotate(s, at)!).solved).toBe(true);
  });

  it('counts lamps lit', () => {
    const l = levelFor(21);
    const e = evaluate(l, startState(l));
    expect(e.total).toBe(2);
    expect(e.lit).toBe(0);
  });

  it('undoes and redoes', () => {
    let h = historyOf(startState(lesson));
    h = commit(h, place(lesson, h.present, 'mirror', 6, 1));
    h = commit(h, rotate(h.present, 6));
    h = commit(h, null); // an illegal move changes nothing
    expect(h.past).toHaveLength(2);
    h = undo(h);
    expect(h.present.placed[6]!.piece).toEqual({ type: 'mirror', slant: 1 });
    h = undo(h);
    expect(h.present.placed[6]).toBeUndefined();
    h = undo(h);
    expect(h.past).toHaveLength(0);
    h = redo(redo(h));
    expect(evaluate(lesson, h.present).solved).toBe(true);
    h = commit(undo(h), lift(h.present, 6));
    expect(h.future).toHaveLength(0);
  });

  it('gives three stars with no hints, two with one, one after that', () => {
    expect(starsFor(0)).toBe(3);
    expect(starsFor(1)).toBe(2);
    expect(starsFor(4)).toBe(1);
  });
});

/** Takes hints until the board is solved; returns how many it took. */
function hintUntilSolved(level: Level, from: PlayState, limit: number): number {
  let s = from;
  for (let i = 0; i < limit; i++) {
    if (evaluate(level, s).solved) return i;
    const hint = findHint(level, s);
    if (!hint) throw new Error(`No hint for level ${level.id} at step ${i}`);
    const next = applyHint(level, s, hint);
    // A hint always changes the board, and never disturbs an earlier hint.
    expect(next).not.toEqual(s);
    for (const [at, p] of Object.entries(s.placed)) {
      if (p.hinted) expect(next.placed[Number(at)]).toEqual(p);
    }
    s = next;
  }
  if (evaluate(level, s).solved) return limit;
  throw new Error(`Level ${level.id} not solved after ${limit} hints`);
}

describe('hints', () => {
  const sample = [
    ...Array.from({ length: 30 }, (_, i) => i + 1),
    ...Array.from({ length: 14 }, (_, i) => 40 + i * 19),
  ];

  it.each(sample)('lead from an empty board to a solved one (level %i)', (n) => {
    const l = levelFor(n);
    const steps = hintUntilSolved(l, startState(l), l.solution.length + 1);
    expect(steps).toBeLessThanOrEqual(l.solution.length);
  });

  it.each(sample.filter((n) => n > 5))(
    'put right a board full of misplaced pieces (level %i)',
    (n) => {
      const l = levelFor(n);
      const rnd = random(n);
      let s = startState(l);
      // Scatter every tray piece on random free cells.
      const kinds: PieceKind[] = [...l.tray];
      for (const kind of kinds) {
        for (let tries = 0; tries < 50; tries++) {
          const at = Math.floor(rnd() * l.w * l.h);
          const next = place(l, s, kind, at, rnd() < 0.5 ? 0 : 1);
          if (next) {
            s = next;
            break;
          }
        }
      }
      hintUntilSolved(l, s, l.solution.length + l.tray.length + 2);
    },
  );

  it('never undoes a correct piece the player already placed', () => {
    const l = levelFor(14);
    const first = l.solution.find((p) => !l.tiles[p.at])!;
    const kind = kindOf(first.piece);
    const s = place(
      l,
      startState(l),
      kind,
      first.at,
      first.piece.type === 'mirror' ? first.piece.slant : 0,
    )!;
    const hint = findHint(l, s)!;
    expect(hint.at).not.toBe(first.at);
    expect(applyHint(l, s, hint).placed[first.at]).toEqual(s.placed[first.at]);
  });

  it('turns a pivot when that is what is missing', () => {
    const l = levelFor(1);
    const hint = findHint(l, startState(l))!;
    expect(hint.pivot).toBe(true);
    const s = applyHint(l, startState(l), hint);
    expect(evaluate(l, s).solved).toBe(true);
    expect(rotate(s, hint.at)).toBeNull(); // a hinted pivot stays put
  });

  it('has nothing to say about a solved board', () => {
    const l = levelFor(1);
    const s = applyHint(l, startState(l), findHint(l, startState(l))!);
    expect(findHint(l, s)).toBeNull();
  });
});
