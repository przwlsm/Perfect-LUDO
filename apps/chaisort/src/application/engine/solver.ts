import { ingOf } from '@/domain/entities/Level';
import { check, isServed, isSolved, keyOf, applyPour, topRun, type Pos, type Pour } from './state';

/**
 * A best-first search over pours (A*, optionally weighted), with every
 * position stored once under its canonical key (cups of the same size and
 * lid are interchangeable, so reshuffles collapse).
 *
 * Two pruning rules, both safe (they never hide a solution):
 * - pouring a cup that holds one ingredient into an empty cup of the same
 *   size only swaps two identical cups, so it is skipped;
 * - of several empty cups of the same size, only the first is tried.
 *
 * With weight 1 the heuristic below never overestimates, so the first
 * solution is a shortest one. Weights above 1 trade that for speed.
 */

export type SearchStatus = 'solved' | 'unsolvable' | 'unknown';

export interface SearchResult {
  readonly status: SearchStatus;
  /** The pours from the start to a sorted counter (empty unless solved). */
  readonly path: readonly Pour[];
  /** Positions expanded: the search's effort. */
  readonly expanded: number;
}

export interface SearchOptions {
  /** Positions to expand before giving up with 'unknown'. */
  readonly budget: number;
  /** 1 = shortest route; more = faster, routes a little longer. */
  readonly weight?: number;
}

/**
 * A lower bound on pours still needed. Every run of layers above a cup's
 * bottom run has to leave that cup at least once; and if an ingredient
 * sits at the bottom of several cups, all but one of those runs must move.
 */
export function estimate(pos: Pos): number {
  let h = 0;
  const bottoms = new Map<number, number>();
  for (const cup of pos.cups) {
    if (cup.length === 0) continue;
    let prev = ingOf(cup[0]!);
    bottoms.set(prev, (bottoms.get(prev) ?? 0) + 1);
    for (let i = 1; i < cup.length; i++) {
      const ing = ingOf(cup[i]!);
      if (ing !== prev) {
        h++;
        prev = ing;
      }
    }
  }
  for (const n of bottoms.values()) if (n > 1) h += n - 1;
  return h;
}

/** The pours worth considering from a position (legal, minus the two safe prunings). */
export function candidatePours(pos: Pos): Pour[] {
  const out: Pour[] = [];
  const n = pos.cups.length;
  for (let from = 0; from < n; from++) {
    const src = pos.cups[from]!;
    if (src.length === 0 || (pos.lids[from] ?? 0) > 0 || isServed(src)) continue;
    const run = topRun(src)!;
    const uniform = run.n === src.length;
    const triedEmpty: number[] = [];
    for (let to = 0; to < n; to++) {
      if (to === from) continue;
      const dst = pos.cups[to]!;
      if (dst.length === 0) {
        const cap = pos.caps[to]!;
        if ((pos.lids[to] ?? 0) > 0) continue;
        if (uniform && cap === pos.caps[from]) continue;
        if (triedEmpty.includes(cap)) continue;
        triedEmpty.push(cap);
      }
      const c = check(pos, from, to);
      if (c.ok) out.push(c.pour);
    }
  }
  return out;
}

/** A small binary min-heap of node indexes by priority. */
class Heap {
  private readonly items: number[] = [];
  private readonly prio: number[] = [];
  get size() {
    return this.items.length;
  }
  push(item: number, p: number) {
    const items = this.items;
    const prio = this.prio;
    let i = items.length;
    items.push(item);
    prio.push(p);
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (prio[parent]! <= p) break;
      items[i] = items[parent]!;
      prio[i] = prio[parent]!;
      i = parent;
    }
    items[i] = item;
    prio[i] = p;
  }
  pop(): number {
    const items = this.items;
    const prio = this.prio;
    const top = items[0]!;
    const lastItem = items.pop()!;
    const lastPrio = prio.pop()!;
    const n = items.length;
    if (n > 0) {
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        if (l >= n) break;
        const r = l + 1;
        const c = r < n && prio[r]! < prio[l]! ? r : l;
        if (prio[c]! >= lastPrio) break;
        items[i] = items[c]!;
        prio[i] = prio[c]!;
        i = c;
      }
      items[i] = lastItem;
      prio[i] = lastPrio;
    }
    return top;
  }
}

export function search(start: Pos, options: SearchOptions): SearchResult {
  const weight = options.weight ?? 1;
  if (isSolved(start)) return { status: 'solved', path: [], expanded: 0 };
  const positions: Pos[] = [start];
  const gs: number[] = [0];
  const parents: number[] = [-1];
  const moves: (Pour | null)[] = [null];
  const best = new Map<string, number>([[keyOf(start), 0]]);
  const open = new Heap();
  const h0 = estimate(start);
  // Ties go to the deeper node (smaller h), which finds routes sooner.
  open.push(0, weight * h0 + h0 * 1e-3);
  let expanded = 0;
  while (open.size > 0) {
    const node = open.pop();
    const pos = positions[node]!;
    const g = gs[node]!;
    if ((best.get(keyOf(pos)) ?? Infinity) < g) continue; // a better route got here first
    if (expanded++ >= options.budget) return { status: 'unknown', path: [], expanded };
    for (const pour of candidatePours(pos)) {
      const next = applyPour(pos, pour);
      const key = keyOf(next);
      const ng = g + 1;
      const seen = best.get(key);
      if (seen !== undefined && seen <= ng) continue;
      best.set(key, ng);
      const id = positions.length;
      positions.push(next);
      gs.push(ng);
      parents.push(node);
      moves.push(pour);
      if (isSolved(next)) {
        const path: Pour[] = [];
        for (let at = id; at > 0; at = parents[at]!) path.push(moves[at]!);
        path.reverse();
        return { status: 'solved', path, expanded };
      }
      const h = estimate(next);
      open.push(id, ng + weight * h + h * 1e-3);
    }
  }
  return { status: 'unsolvable', path: [], expanded };
}

export interface Route {
  readonly status: SearchStatus;
  readonly path: readonly Pour[];
  /** True when the route is proven shortest. */
  readonly shortest: boolean;
  readonly expanded: number;
}

/**
 * A shortest route when one can be found within `budget`; otherwise the
 * best route a lighter, weighted search finds. 'unsolvable' only when a
 * search ran out of positions (a proof), 'unknown' when every try ran out
 * of budget.
 */
export function route(start: Pos, budget: number): Route {
  let expanded = 0;
  const tries: readonly [number, number][] = [
    [1, 0.45],
    [1.6, 0.25],
    [3, 0.3],
  ];
  for (const [weight, share] of tries) {
    const r = search(start, { budget: Math.max(200, Math.floor(budget * share)), weight });
    expanded += r.expanded;
    if (r.status === 'solved') {
      return { status: 'solved', path: r.path, shortest: weight === 1, expanded };
    }
    if (r.status === 'unsolvable')
      return { status: 'unsolvable', path: [], shortest: false, expanded };
  }
  return { status: 'unknown', path: [], shortest: false, expanded };
}

/** A quick yes/no: can this position still be sorted? Greedy, so fast. */
export function solvable(pos: Pos, budget = 60_000): SearchStatus {
  const greedy = search(pos, { budget, weight: 4 });
  return greedy.status;
}

/** Average number of sensible pours along a route: how many choices the player faces. */
export function branching(start: Pos, path: readonly Pour[]): number {
  let pos = start;
  let total = 0;
  for (const p of path) {
    total += candidatePours(pos).length;
    pos = applyPour(pos, p);
  }
  return path.length ? total / path.length : 0;
}
