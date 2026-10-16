import { random } from 'app-kit';
import {
  bitCount,
  opposite,
  period,
  RAIN,
  TANK,
  turnsToSolve,
  turnable,
  type Dir,
  type Lesson,
  type Level,
  type Tile,
  type Water,
} from '@/domain/entities/Board';
import { flow, neighbour } from './flow';
import { solve } from './solver';

/** What a level should be like. The generator meets it from a seed, or reports that it could not. */
export interface LevelSpec {
  readonly w: number;
  readonly h: number;
  /** Share of cells that start as rocks (more appear where dead ends are cleared). */
  readonly rocks: number;
  /** Fields wanted, both waters together. */
  readonly fields: number;
  /** Dead-end channels the board may keep; the rest are cleared to rocks. */
  readonly deadEnds: number;
  /** 0..1: how much the network winds in long runs (1) rather than branching (0). */
  readonly wind: number;
  /** A second network fed from the temple tank, for lotus ponds. */
  readonly twoWaters: boolean;
  readonly bridges: number;
  readonly dams: number;
  readonly fixed: number;
  /** Turn budget: null for none; else the fewest turns plus this share of them (at least 2). */
  readonly slack: number | null;
  /** Share of tiles that start already facing the right way. */
  readonly settled: number;
  /** Boards to try when looking for one with a single solution. */
  readonly attempts: number;
  /** May fix an ambiguous tile in place to make the answer unique (once fixed tiles are taught). */
  readonly pinAmbiguity: boolean;
}

export interface Generated {
  readonly level: Level;
  /** True when the solver proved the board has exactly one answer. */
  readonly unique: boolean;
  /** Solver guesses needed: a rough measure of difficulty. */
  readonly nodes: number;
}

const SOLVE_NODES = 60_000;

/** Builds a level from `seed`, trying up to `spec.attempts` boards for one with a unique answer. */
export function generate(
  spec: LevelSpec,
  seed: number,
  id: string,
  lesson?: Lesson,
): Generated | null {
  let fallback: Generated | null = null;
  for (let k = 0; k < Math.max(1, spec.attempts); k++) {
    const built = candidate(spec, (seed + k * 0x9e3779b1) >>> 0, id, lesson);
    if (!built) continue;
    if (built.unique) return built;
    fallback ??= built;
  }
  return fallback;
}

/** One board from one seed (null when the seed cannot meet the spec). */
function candidate(spec: LevelSpec, seed: number, id: string, lesson?: Lesson): Generated | null {
  const r = random(seed);
  const { w, h } = spec;
  const n = w * h;
  const pick = <T>(list: readonly T[]): T => list[Math.floor(r() * list.length)]!;
  const shuffle = <T>(list: T[]): T[] => {
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [list[i], list[j]] = [list[j]!, list[i]!];
    }
    return list;
  };
  const dims = { w, h };
  const nbr = (a: number, d: number) => neighbour(dims, a, d);

  // ---- rocks, never cutting the hillside in two
  const rock = new Uint8Array(n);
  const connected = () => {
    const first = rock.indexOf(0);
    if (first < 0) return false;
    const seen = new Uint8Array(n);
    const stack = [first];
    seen[first] = 1;
    let count = 1;
    while (stack.length) {
      const a = stack.pop()!;
      for (let d = 0; d < 4; d++) {
        const b = nbr(a, d);
        if (b < 0 || rock[b] || seen[b]) continue;
        seen[b] = 1;
        count++;
        stack.push(b);
      }
    }
    let open = 0;
    for (let a = 0; a < n; a++) if (!rock[a]) open++;
    return count === open;
  };
  const wantRocks = Math.round(n * spec.rocks);
  let placed = 0;
  for (const a of shuffle(Array.from({ length: n }, (_, i) => i))) {
    if (placed >= wantRocks) break;
    rock[a] = 1;
    if (connected()) placed++;
    else rock[a] = 0;
  }

  // ---- springs
  const open = Array.from({ length: n }, (_, i) => i).filter((a) => !rock[a]);
  const roots: number[] = [pick(open)];
  if (spec.twoWaters) {
    const [rx, ry] = [roots[0]! % w, Math.floor(roots[0]! / w)];
    const far = open
      .filter((a) => a !== roots[0])
      .map((a) => ({ a, d: Math.abs((a % w) - rx) + Math.abs(Math.floor(a / w) - ry) + r() * 2 }))
      .sort((x, y) => y.d - x.d);
    roots.push(far[Math.floor(r() * Math.max(1, Math.ceil(far.length * 0.25)))]!.a);
  }

  // ---- the networks: growing trees, one per water, taking turns
  const conn = new Uint8Array(n);
  const owner = new Int8Array(n).fill(-1);
  const active: number[][] = roots.map((root, t) => {
    owner[root] = t;
    return [root];
  });
  let turn = 0;
  while (active.some((list) => list.length)) {
    const list = active[turn]!.length ? active[turn]! : active[1 - turn]!;
    const t = active[turn]!.length ? turn : 1 - turn;
    turn = (turn + 1) % active.length;
    const i = r() < spec.wind ? list.length - 1 : Math.floor(r() * list.length);
    const a = list[i]!;
    const ways = shuffle([0, 1, 2, 3]).filter((d) => {
      const b = nbr(a, d);
      return b >= 0 && !rock[b] && owner[b]! < 0;
    });
    if (!ways.length) {
      list.splice(i, 1);
      continue;
    }
    const d = ways[0]!;
    const b = nbr(a, d);
    conn[a] = conn[a]! | (1 << d);
    conn[b] = conn[b]! | (1 << opposite(d));
    owner[b] = t;
    list.push(b);
  }
  for (let t = 0; t < roots.length; t++) {
    let size = 0;
    for (let a = 0; a < n; a++) if (owner[a] === t) size++;
    if (size < 3) return null;
  }

  // ---- bridges: a straight run gets a second channel crossing over it
  const bridge = new Uint8Array(n);
  const isRoot = (a: number) => roots.includes(a);
  /** Part of cell a on side d (a bridge's east–west channel is part 1). */
  const partOf = (a: number, d: number) => (bridge[a] && (d & 1) === 1 ? 1 : 0);
  const pathParts = (from: number, fromSide: number, to: number): number[] | null => {
    // Tree path between two cells, walking parts so bridges are passed straight through.
    const start = from * 2 + partOf(from, fromSide);
    const prev = new Map<number, number>([[start, -1]]);
    const queue = [start];
    while (queue.length) {
      const p = queue.shift()!;
      const a = p >> 1;
      if (a === to) {
        const path: number[] = [];
        for (let q = p; q >= 0; q = prev.get(q)!) path.unshift(q);
        return path;
      }
      const m = bridge[a] ? ((p & 1) === 0 ? 0b0101 : 0b1010) : conn[a]!;
      for (let d = 0; d < 4; d++) {
        if (!(m & (1 << d))) continue;
        const b = nbr(a, d);
        const q = b * 2 + partOf(b, opposite(d));
        if (!prev.has(q)) {
          prev.set(q, p);
          queue.push(q);
        }
      }
    }
    return null;
  };
  const nearBridge = (a: number) => {
    for (let d = 0; d < 4; d++) {
      const b = nbr(a, d);
      if (b >= 0 && bridge[b]) return true;
    }
    return false;
  };
  let bridges = 0;
  for (const c of shuffle([...open])) {
    if (bridges >= spec.bridges) break;
    if (isRoot(c) || bridge[c] || nearBridge(c)) continue;
    const m = conn[c]!;
    if (m !== 0b0101 && m !== 0b1010) continue;
    const [d1, d2] = m === 0b0101 ? [1, 3] : [0, 2];
    const p1 = nbr(c, d1);
    const p2 = nbr(c, d2);
    if (p1 < 0 || p2 < 0 || rock[p1] || rock[p2] || owner[p1] !== owner[p2]) continue;
    if (bridge[p1] || bridge[p2] || nearBridge(p1) || nearBridge(p2)) continue;
    if (isRoot(p1) || isRoot(p2)) continue;
    // The cycle the new crossing makes: cut one edge on the old path from p1 to p2.
    const path = pathParts(p1, opposite(d1), p2);
    if (!path) continue;
    const cuts: [number, number][] = [];
    for (let i = 0; i + 1 < path.length; i++) {
      const a = path[i]! >> 1;
      const b = path[i + 1]! >> 1;
      if (bridge[a] || bridge[b] || a === c || b === c) continue;
      cuts.push([a, b]);
    }
    if (!cuts.length) continue;
    const [a, b] = pick(cuts);
    const dir = [0, 1, 2, 3].find((d) => nbr(a, d) === b)!;
    conn[a] = conn[a]! & ~(1 << dir);
    conn[b] = conn[b]! & ~(1 << opposite(dir));
    bridge[c] = 1;
    conn[c] = 15;
    conn[p1] = conn[p1]! | (1 << opposite(d1));
    conn[p2] = conn[p2]! | (1 << opposite(d2));
    bridges++;
  }
  if (bridges < spec.bridges) return null;

  // ---- distance from each spring, for choosing fields and the way dams face
  const dist = new Int32Array(n * 2).fill(-1);
  /** Per part: the side water comes in by in the finished network. */
  const inlet = new Int8Array(n * 2).fill(-1);
  for (const root of roots) {
    const queue = [root * 2];
    dist[root * 2] = 0;
    while (queue.length) {
      const p = queue.shift()!;
      const a = p >> 1;
      const m = bridge[a] ? ((p & 1) === 0 ? 0b0101 : 0b1010) : conn[a]!;
      for (let d = 0; d < 4; d++) {
        if (!(m & (1 << d))) continue;
        const b = nbr(a, d);
        const q = b * 2 + partOf(b, opposite(d));
        if (dist[q]! >= 0) continue;
        dist[q] = dist[p]! + 1;
        inlet[q] = opposite(d);
        queue.push(q);
      }
    }
  }
  for (const a of open) {
    if (dist[a * 2]! < 0) return null;
    if (bridge[a] && dist[a * 2 + 1]! < 0) return null;
  }

  // ---- fields at the far ends of the networks
  const degree = (a: number) => (bridge[a] ? 4 : bitCount(conn[a]!));
  const field = new Uint8Array(n);
  const fieldsWanted = Math.max(roots.length, spec.fields);
  const sizes = roots.map((_, t) => open.filter((a) => owner[a] === t).length);
  const quota = roots.map((_, t) =>
    roots.length === 1
      ? fieldsWanted
      : Math.max(1, Math.round((fieldsWanted * sizes[t]!) / (sizes[0]! + sizes[1]!))),
  );
  for (let t = 0; t < roots.length; t++) {
    const leaves = open
      .filter((a) => owner[a] === t && !isRoot(a) && !bridge[a] && degree(a) === 1)
      .map((a) => ({ a, score: dist[a * 2]! + r() * 3 }))
      .sort((x, y) => y.score - x.score);
    if (!leaves.length) return null;
    let got = 0;
    for (const pass of [0, 1]) {
      for (const { a } of leaves) {
        if (got >= quota[t]!) break;
        if (field[a]) continue;
        // First pass: keep fields apart, so they spread over the hillside.
        if (pass === 0 && [0, 1, 2, 3].some((d) => nbr(a, d) >= 0 && field[nbr(a, d)])) continue;
        field[a] = 1;
        got++;
      }
    }
  }

  // ---- clear some dead ends to rocks: only twigs, so a branch is never pulled back whole
  const prunable = (a: number) =>
    !rock[a] && !isRoot(a) && !field[a] && !bridge[a] && !nearBridge(a) && degree(a) === 1;
  const deadEnds = () => open.filter((a) => !rock[a] && !isRoot(a) && !field[a] && degree(a) === 1);
  for (;;) {
    const ends = deadEnds();
    if (ends.length <= spec.deadEnds) break;
    const choices = ends.filter(prunable).filter((a) => {
      const b = nbr(a, 31 - Math.clz32(conn[a]!));
      return degree(b) >= 3 || bridge[b];
    });
    if (!choices.length) break;
    const a = pick(choices);
    const d = 31 - Math.clz32(conn[a]!);
    const b = nbr(a, d);
    if (bridge[b]) break;
    conn[b] = conn[b]! & ~(1 << opposite(d));
    conn[a] = 0;
    rock[a] = 1;
  }
  // Ends still left over become extra fields, up to a point; the rest stay as small basins.
  const fieldCap = Math.round(fieldsWanted * 1.5) + 1;
  let fieldTotal = open.filter((a) => field[a]).length;
  for (const a of shuffle(deadEnds())) {
    if (deadEnds().length <= spec.deadEnds || fieldTotal >= fieldCap) break;
    field[a] = 1;
    fieldTotal++;
  }
  for (const root of roots) if (conn[root] === 0) return null;

  // ---- check-dams on straight runs, facing downstream
  const dam = new Int8Array(n).fill(-1);
  const straights = shuffle(
    open.filter(
      (a) =>
        !rock[a] &&
        !isRoot(a) &&
        !field[a] &&
        !bridge[a] &&
        (conn[a] === 0b0101 || conn[a] === 0b1010) &&
        dist[a * 2]! >= 1,
    ),
  );
  let dams = 0;
  for (const a of straights) {
    if (dams >= spec.dams) break;
    if ([0, 1, 2, 3].some((d) => nbr(a, d) >= 0 && dam[nbr(a, d)]! >= 0)) continue;
    dam[a] = opposite(inlet[a * 2]!);
    dams++;
  }
  if (dams < spec.dams) return null;

  // ---- tiles
  const tiles: Tile[] = [];
  for (let a = 0; a < n; a++) {
    const t = owner[a] === 1 ? TANK : RAIN;
    if (rock[a]) tiles.push({ kind: 'rock' });
    else if (bridge[a]) tiles.push({ kind: 'bridge' });
    else if (isRoot(a))
      tiles.push({ kind: 'source', mask: conn[a]!, water: t as Water, fixed: false });
    else if (field[a])
      tiles.push({ kind: 'field', mask: conn[a]!, water: t as Water, fixed: false });
    else if (dam[a]! >= 0) tiles.push({ kind: 'dam', out: dam[a] as Dir, fixed: false });
    else tiles.push({ kind: 'pipe', mask: conn[a]!, fixed: false });
  }

  // ---- fixed tiles: a few branching ones, set right and pinned
  const fixTile = (a: number) => {
    const tile = tiles[a]!;
    if (tile.kind !== 'rock' && tile.kind !== 'bridge') tiles[a] = { ...tile, fixed: true };
  };
  const fixable = shuffle(
    open.filter((a) => {
      const tile = tiles[a]!;
      return tile.kind === 'pipe' && turnable(tile);
    }),
  ).sort((x, y) => bitCount(conn[y]!) - bitCount(conn[x]!) || 0);
  let fixedCount = 0;
  for (const a of fixable) {
    if (fixedCount >= spec.fixed) break;
    if (r() < 0.35 && fixable.length > spec.fixed * 2) continue;
    fixTile(a);
    fixedCount++;
  }
  if (fixedCount < spec.fixed) return null;

  // ---- scramble
  const start = new Array<number>(n).fill(0);
  const scramble = () => {
    for (let a = 0; a < n; a++) {
      const tile = tiles[a]!;
      if (!turnable(tile)) {
        start[a] = 0;
        continue;
      }
      const p = period(tile);
      if (r() < spec.settled) {
        start[a] = p * Math.floor(r() * (4 / p));
        continue;
      }
      const k = 1 + Math.floor(r() * (p - 1));
      start[a] = (k + p * Math.floor(r() * (4 / p))) & 3;
    }
  };
  let level: Level = { id, w, h, tiles, start, budget: null, lesson };
  for (let tries = 0; tries < 8; tries++) {
    scramble();
    level = { ...level, start: [...start] };
    if (!flow(level, level.start).solved) break;
  }
  if (flow(level, level.start).solved) return null;

  // ---- one answer: ask the solver, and pin an ambiguous tile if we may
  let result = solve(level, { limit: 2, maxNodes: SOLVE_NODES });
  for (let k = 0; k < 4 && spec.pinAmbiguity && result.solutions.length > 1; k++) {
    const [s1, s2] = result.solutions as [number[], number[]];
    const differ = open.filter((a) => {
      const tile = tiles[a]!;
      return turnable(tile) && tile.kind !== 'dam' && s1[a] !== s2[a];
    });
    if (!differ.length) break;
    const a = pick(differ);
    fixTile(a);
    start[a] = 0;
    level = { ...level, tiles: [...tiles], start: [...start] };
    result = solve(level, { limit: 2, maxNodes: SOLVE_NODES });
  }
  if (!result.solutions.length) return null;
  const unique = result.complete && result.solutions.length === 1;
  if (flow(level, level.start).solved) return null;

  if (spec.slack !== null) {
    const need = turnsToSolve(level);
    level = { ...level, budget: need + Math.max(2, Math.round(need * spec.slack)) };
  }
  return { level, unique, nodes: result.nodes };
}
