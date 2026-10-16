import type { CupSpec, Level } from '@/domain/entities/Level';
import { route, search } from '../engine/solver';
import { applyPour, isSolved, legalPours, positionOf, type Pos } from '../engine/state';
import { levelFor } from '../levels/levels';
import { findHint } from './hint';
import {
  addExtraCup,
  current,
  isWon,
  newGame,
  noteHint,
  pour,
  poursOf,
  restart,
  starsFor,
  undo,
  type Game,
} from './play';

const cup = (layers: number[], cap = 4): CupSpec => ({ cap, lid: 0, layers });

describe('playing a level', () => {
  const level = levelFor(1);

  it('pours, counts and undoes exactly', () => {
    let g = newGame(level);
    const r = pour(g, 0, 2);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    g = r.game;
    expect(poursOf(g)).toBe(1);
    expect(current(g).cups[2]).toEqual([1]);
    g = undo(g);
    expect(poursOf(g)).toBe(0);
    expect(current(g)).toEqual(positionOf(level));
    expect(undo(g)).toBe(g); // nothing left to undo
  });

  it('refuses an illegal pour without changing anything', () => {
    const g = newGame(level);
    expect(pour(g, 0, 1)).toEqual({ ok: false, why: 'full' });
    const h = newGame({ cups: [cup([0, 1]), cup([0])] });
    expect(pour(h, 0, 1)).toEqual({ ok: false, why: 'mismatch' });
    expect(current(h).cups).toEqual([[0, 1], [0]]);
  });

  it('restarts to the start, keeping assists and the extra cup', () => {
    let g = newGame(level);
    g = (pour(g, 0, 2) as { game: Game }).game;
    g = addExtraCup(g)!;
    expect(g.assists).toBe(1);
    expect(current(g).cups).toHaveLength(4);
    expect(addExtraCup(g)).toBeNull(); // once per level
    g = restart(g);
    expect(poursOf(g)).toBe(0);
    expect(current(g).cups).toEqual([[0, 0, 0, 1], [1, 1, 1, 0], [], []]);
    expect(g.assists).toBe(1);
  });

  it('the extra cup reaches every position in history, so undo still lines up', () => {
    let g = newGame(level);
    g = (pour(g, 0, 2) as { game: Game }).game;
    g = addExtraCup(g)!;
    g = undo(g);
    expect(current(g).cups).toEqual([[0, 0, 0, 1], [1, 1, 1, 0], [], []]);
  });

  it('wins by following the solver', () => {
    let g = newGame(level);
    for (const p of route(current(g), 10_000).path) {
      const r = pour(g, p.from, p.to);
      if (!r.ok) throw new Error('solver suggested an illegal pour');
      g = r.game;
    }
    expect(isWon(g)).toBe(true);
    expect(starsFor(poursOf(g), level.par, g.assists)).toBe(3);
  });

  it('gives stars for pours and help', () => {
    expect(starsFor(10, 10, 0)).toBe(3);
    expect(starsFor(11, 10, 0)).toBe(2);
    expect(starsFor(13, 10, 0)).toBe(2);
    expect(starsFor(14, 10, 0)).toBe(1);
    expect(starsFor(8, 10, 1)).toBe(2);
    expect(starsFor(8, 10, 2)).toBe(1);
  });
});

/** Follows hints, pour by pour, until the counter is sorted. */
function followHints(start: Pos, limit = 80): number {
  let history: Pos[] = [start];
  for (let i = 0; i < limit; i++) {
    const now = history[history.length - 1]!;
    if (isSolved(now)) return i;
    const h = findHint(history, 20_000);
    if (h.kind !== 'pour' && h.kind !== 'undo') throw new Error(`no hint: ${h.kind}`);
    if (h.kind === 'undo') history = history.slice(0, h.at + 1);
    const g: Game = { start, history, assists: 0, extra: false };
    const r = pour(g, h.pour.from, h.pour.to);
    if (!r.ok) throw new Error('hint suggested an illegal pour');
    history = [...r.game.history];
  }
  throw new Error('hints did not finish the level');
}

describe('hints', () => {
  it('lead to a sorted counter, in the fewest pours', () => {
    for (const n of [1, 2, 3, 12, 20]) {
      const level: Level = levelFor(n);
      const used = followHints(positionOf(level));
      expect(used).toBeLessThanOrEqual(level.best);
    }
  });

  it('suggest pours that shorten the route by one each time', () => {
    const start = positionOf(levelFor(14));
    const first = findHint([start]);
    expect(first.kind).toBe('pour');
    if (first.kind !== 'pour') return;
    const g = pour(newGame(levelFor(14)), first.pour.from, first.pour.to);
    if (!g.ok) throw new Error('illegal');
    const second = findHint(g.game.history);
    expect(second.kind === 'pour' && second.left).toBe(first.left - 1);
  });

  it('say "undo to here" from a dead end, back to a position that can still be sorted', () => {
    // Walk the positions reachable from a one-spare level until one that can
    // never be sorted turns up, keeping the trail that led there.
    const start = positionOf(levelFor(31));
    const parent = new Map<string, { pos: Pos; from: string | null }>();
    const key = (p: Pos) => JSON.stringify(p);
    parent.set(key(start), { pos: start, from: null });
    let frontier = [start];
    let dead: Pos | null = null;
    while (frontier.length && !dead) {
      const next: Pos[] = [];
      for (const p of frontier) {
        for (const q of legalPours(p)) {
          const n = applyPour(p, q);
          if (parent.has(key(n))) continue;
          parent.set(key(n), { pos: n, from: key(p) });
          if (!isSolved(n) && search(n, { budget: 50_000 }).status === 'unsolvable') {
            dead = n;
            break;
          }
          next.push(n);
        }
        if (dead) break;
      }
      frontier = next;
    }
    expect(dead).not.toBeNull();
    const history: Pos[] = [];
    for (let k: string | null = key(dead!); k; k = parent.get(k)!.from)
      history.unshift(parent.get(k)!.pos);
    const h = findHint(history);
    expect(h.kind).toBe('undo');
    if (h.kind !== 'undo') return;
    expect(h.at).toBeLessThan(history.length - 1);
    expect(route(history[h.at]!, 40_000).status).toBe('solved');
    expect(legalPours(history[h.at]!)).toContainEqual(h.pour);
  });

  it('says so when the counter is already sorted', () => {
    expect(findHint([positionOf({ cups: [cup([0, 0, 0, 0])] })]).kind).toBe('solved');
  });

  it('noteHint counts the help and can rewind', () => {
    let g = newGame(levelFor(1));
    g = (pour(g, 0, 2) as { game: Game }).game;
    const h = noteHint(g, 0);
    expect(h.assists).toBe(1);
    expect(poursOf(h)).toBe(0);
  });
});
