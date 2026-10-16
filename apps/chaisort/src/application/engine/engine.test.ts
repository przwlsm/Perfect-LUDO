import { random } from 'app-kit';
import { HIDDEN, type CupSpec } from '@/domain/entities/Level';
import { SPICES } from '@/domain/entities/Ingredient';
import { deal, generate, parFor, type LevelSpec } from './generator';
import { estimate, route, search } from './solver';
import {
  applyPour,
  check,
  isServed,
  isSolved,
  keyOf,
  legalPours,
  positionOf,
  topRun,
  tryPour,
  withExtraCup,
  type Pos,
} from './state';

const cup = (layers: number[], cap = 4, lid = 0): CupSpec => ({ cap, lid, layers });
const pos = (...cups: CupSpec[]): Pos => positionOf({ cups });
const SPICE = SPICES[0]!;

describe('pour rules', () => {
  it('pours the whole top run when it fits', () => {
    const p = pos(cup([0, 1, 1]), cup([1]), cup([]));
    expect(check(p, 0, 1)).toEqual({ ok: true, pour: { from: 0, to: 1, ing: 1, amount: 2 } });
    const after = applyPour(p, { from: 0, to: 1, ing: 1, amount: 2 });
    expect(after.cups).toEqual([[0], [1, 1, 1], []]);
    // The position it came from is untouched.
    expect(p.cups[0]).toEqual([0, 1, 1]);
  });

  it('pours only what fits, leaving the rest of the run', () => {
    const p = pos(cup([2, 2, 2]), cup([0, 1, 2]));
    expect(check(p, 0, 1)).toEqual({ ok: true, pour: { from: 0, to: 1, ing: 2, amount: 1 } });
  });

  it('pours into an empty cup, any ingredient', () => {
    expect(check(pos(cup([3, 4]), cup([])), 0, 1).ok).toBe(true);
  });

  it('refuses kindly, with a reason', () => {
    const p = pos(cup([0, 1]), cup([0, 2]), cup([1, 1, 1, 1]), cup([]), cup([3, 3, 3, 0]));
    expect(check(p, 0, 0)).toEqual({ ok: false, why: 'same' });
    expect(check(p, 3, 0)).toEqual({ ok: false, why: 'empty' });
    expect(check(p, 0, 1)).toEqual({ ok: false, why: 'mismatch' });
    expect(check(p, 2, 3)).toEqual({ ok: false, why: 'served' });
    expect(check(p, 1, 4)).toEqual({ ok: false, why: 'full' });
  });

  it('a lid blocks its cup until enough pours have happened anywhere', () => {
    let p = pos(cup([0, 1, 0, 1], 4, 2), cup([1]), cup([]), cup([2]));
    expect(check(p, 0, 1)).toEqual({ ok: false, why: 'lidFrom' });
    expect(check(p, 1, 0)).toEqual({ ok: false, why: 'lidTo' });
    p = tryPour(p, 1, 2)!.pos;
    expect(p.lids[0]).toBe(1);
    p = tryPour(p, 3, 1)!.pos;
    expect(p.lids[0]).toBe(0);
    expect(check(p, 0, 2).ok).toBe(true);
  });

  it('a spice pours only onto the same spice, never into an empty cup', () => {
    const p = pos(cup([0, SPICE]), cup([SPICE]), cup([]), cup([1]));
    expect(check(p, 0, 2)).toEqual({ ok: false, why: 'spice' });
    expect(check(p, 0, 3)).toEqual({ ok: false, why: 'mismatch' });
    expect(check(p, 0, 1).ok).toBe(true);
  });

  it('hidden layers stay hidden until they are on top, and stop a run', () => {
    const p = pos(cup([2, 1 | HIDDEN, 1]), cup([]));
    expect(topRun(p.cups[0]!)).toEqual({ ing: 1, n: 1 });
    const after = tryPour(p, 0, 1)!.pos;
    expect(after.cups[0]).toEqual([2, 1]); // uncovered: now in view
  });

  it('a tall glass holds six', () => {
    const p = pos(cup([0, 0, 0, 0, 1], 6), cup([1, 1, 1]));
    expect(check(p, 1, 0)).toEqual({ ok: true, pour: { from: 1, to: 0, ing: 1, amount: 1 } });
  });

  it('serves a cup of four alike, and the counter is sorted when every cup is served or empty', () => {
    expect(isServed([3, 3, 3, 3])).toBe(true);
    expect(isServed([3, 3, 3])).toBe(false);
    expect(isServed([3, 3, 3, 3 | HIDDEN])).toBe(true);
    expect(isSolved(pos(cup([0, 0, 0, 0]), cup([]), cup([1, 1, 1, 1], 6)))).toBe(true);
    expect(isSolved(pos(cup([0, 0, 0]), cup([0])))).toBe(false);
  });

  it('lists every legal pour', () => {
    const p = pos(cup([0, 1]), cup([1]), cup([]));
    expect(legalPours(p).map((q) => `${q.from}>${q.to}`)).toEqual(['0>1', '0>2', '1>0', '1>2']);
  });

  it('knows a position however its cups are arranged', () => {
    const a = pos(cup([0, 1]), cup([1]), cup([]));
    const b = pos(cup([]), cup([1]), cup([0, 1]));
    const c = pos(cup([]), cup([1], 6), cup([0, 1]));
    expect(keyOf(a)).toBe(keyOf(b));
    expect(keyOf(a)).not.toBe(keyOf(c));
  });

  it('adds an extra empty cup', () => {
    const p = withExtraCup(pos(cup([0])), 4);
    expect(p.cups).toEqual([[0], []]);
    expect(p.caps).toEqual([4, 4]);
  });
});

/**
 * Plain breadth-first search over every legal pour: slow, obviously right.
 * The fewest pours, null when no pours can sort it, undefined past the limit.
 */
function bfs(start: Pos, limit = 200_000): number | null | undefined {
  if (isSolved(start)) return 0;
  const seen = new Set([keyOf(start)]);
  let frontier = [start];
  for (let depth = 1; frontier.length && seen.size < limit; depth++) {
    const next: Pos[] = [];
    for (const p of frontier) {
      for (const q of legalPours(p)) {
        const n = applyPour(p, q);
        const k = keyOf(n);
        if (seen.has(k)) continue;
        if (isSolved(n)) return depth;
        seen.add(k);
        next.push(n);
      }
    }
    frontier = next;
  }
  return frontier.length ? undefined : null;
}

const small: LevelSpec = {
  ingredients: 3,
  pool: 6,
  spices: 0,
  spares: 1,
  tall: 0,
  tallFill: 4,
  froth: 0,
  lids: 0,
  lidPours: [2, 4],
  maxSame: 3,
  target: 0,
  candidates: 1,
  budget: 20_000,
};

function replay(start: Pos, path: readonly { from: number; to: number }[]): Pos {
  let p = start;
  for (const step of path) {
    const next = tryPour(p, step.from, step.to);
    if (!next) throw new Error(`illegal pour ${step.from}>${step.to}`);
    p = next.pos;
  }
  return p;
}

describe('solver', () => {
  const variants: [string, Partial<LevelSpec>][] = [
    ['plain, one spare', {}],
    ['two spares', { ingredients: 4, spares: 2 }],
    ['froth', { froth: 2, spares: 2 }],
    ['a lid', { lids: 1, spares: 2 }],
    ['a spice', { spices: 1, ingredients: 2, spares: 2 }],
    ['a tall glass', { tall: 1, tallFill: 5 }],
  ];

  it.each(variants)('agrees with brute force on small counters (%s)', (_, extra) => {
    const r = random(7);
    let checked = 0;
    for (let i = 0; i < 400 && checked < 12; i++) {
      const cups = deal({ ...small, ...extra }, r);
      if (!cups) continue;
      checked++;
      const start = positionOf({ cups });
      const truth = bfs(start);
      if (truth === undefined) continue;
      const found = route(start, 50_000);
      if (truth === null) {
        expect(found.status).not.toBe('solved');
      } else {
        expect(found.status).toBe('solved');
        expect(isSolved(replay(start, found.path))).toBe(true);
        if (found.shortest) expect(found.path.length).toBe(truth);
        else expect(found.path.length).toBeGreaterThanOrEqual(truth);
      }
    }
    expect(checked).toBeGreaterThan(5);
  });

  it('proves a hopeless counter unsolvable', () => {
    // No room anywhere: nothing can ever move.
    const stuck = pos(cup([0, 1, 0, 1]), cup([1, 0, 1, 0]));
    expect(search(stuck, { budget: 1000 }).status).toBe('unsolvable');
  });

  it('never overestimates (the heuristic is admissible)', () => {
    const r = random(11);
    for (let i = 0; i < 30; i++) {
      const cups = deal({ ...small, spares: 2 }, r);
      if (!cups) continue;
      const start = positionOf({ cups });
      const truth = bfs(start);
      if (truth !== null && truth !== undefined) expect(estimate(start)).toBeLessThanOrEqual(truth);
    }
  });

  it('a solved counter needs no pours', () => {
    expect(route(pos(cup([0, 0, 0, 0]), cup([])), 100).path).toEqual([]);
  });
});

describe('generator', () => {
  const spec: LevelSpec = { ...small, ingredients: 5, spares: 2, froth: 2, lids: 1, candidates: 2 };

  it('builds the same level from the same seed', () => {
    expect(generate(spec, 1234, 'x')).toEqual(generate(spec, 1234, 'x'));
  });

  it('builds different levels from different seeds', () => {
    expect(generate(spec, 1, 'x')!.level.cups).not.toEqual(generate(spec, 2, 'x')!.level.cups);
  });

  it('deals every ingredient exactly four times, and meets the spec', () => {
    const r = random(3);
    for (let i = 0; i < 20; i++) {
      const cups = deal({ ...spec, spices: 1, tall: 1, tallFill: 5 }, r);
      if (!cups) continue;
      const counts = new Map<number, number>();
      for (const c of cups)
        for (const l of c.layers) counts.set(l & 31, (counts.get(l & 31) ?? 0) + 1);
      expect([...counts.values()].every((n) => n === 4)).toBe(true);
      expect(counts.size).toBe(6);
      expect(cups.filter((c) => c.layers.length === 0)).toHaveLength(2);
      expect(cups.filter((c) => c.cap === 6)).toHaveLength(1);
      // A spice must start at the bottom of some cup, or it could never be gathered.
      const spice = [...counts.keys()].find((k) => SPICES.includes(k))!;
      expect(cups.some((c) => (c.layers[0]! & 31) === spice)).toBe(true);
      // The top layer is always in view.
      for (const c of cups) {
        const top = c.layers[c.layers.length - 1];
        if (top !== undefined) expect(top & HIDDEN).toBe(0);
      }
    }
  });

  it('every generated level is solvable, with par a little above the best route', () => {
    for (const seed of [5, 6, 7]) {
      const g = generate(spec, seed, 'x')!;
      const r = route(positionOf(g.level), 40_000);
      expect(r.status).toBe('solved');
      expect(g.level.par).toBe(parFor(g.level.best));
      expect(g.level.par).toBeGreaterThan(g.level.best);
    }
  });
});
