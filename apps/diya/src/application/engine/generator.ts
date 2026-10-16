import { random } from 'app-kit';
import {
  colourOf,
  DX,
  DY,
  kindOf,
  WHITE,
  type Dir,
  type GlassHue,
  type Lesson,
  type Level,
  type Piece,
  type Placement,
  type Tile,
} from '@/domain/entities/Board';
import {
  clearCell,
  compile,
  DIYA,
  EMPTY,
  emptyGrid,
  FLAME,
  GLASS,
  MIRROR_L,
  MIRROR_R,
  ONEWAY,
  PRISM,
  setPiece,
  SLEEPER,
  WALL,
  arrangementOf,
  type Grid,
} from './grid';
import { solve } from './solver';
import { solved, trace } from './trace';

/** What kind of board to build. */
export interface LevelSpec {
  readonly w: number;
  readonly h: number;
  readonly flames: number;
  /** Pieces built into the light's path: the tray, pivots and fixed pieces together. */
  readonly pieces: number;
  /** Of those, mirrors left on the board to be turned in place. */
  readonly pivots: number;
  /** Of those, pieces left on the board, locked. */
  readonly fixed: number;
  /** At most this many prisms. */
  readonly prisms: number;
  /** At most this many coloured glass panes. */
  readonly glass: number;
  /** Prefer a lamp where two colours meet. */
  readonly mixing: boolean;
  readonly oneways: number;
  readonly sleepers: number;
  readonly walls: number;
  readonly diyas: readonly [number, number];
  /** Search effort to aim for (log2 of solver nodes), from about 1 (trivial) to 12. */
  readonly difficulty: number;
  /** Rounds of narrowing towards a single answer (0 leaves the board open, for early levels). */
  readonly harden: number;
  /** Boards to build and choose the closest to `difficulty` from. */
  readonly candidates: number;
}

export interface Generated {
  readonly level: Level;
  /** log2 of the boards the solver traced to settle it; a difficulty measure. */
  readonly effort: number;
  readonly solutions: number;
}

/** Budget for the solver while choosing boards; boards it cannot settle are not shipped. */
const CHECK_BUDGET = 40_000;
/** Builds tried before a spec is called too tight (the caller then relaxes it). */
const MAX_ATTEMPTS = 400;

/**
 * Builds a solvable level from a seed. It lays light first: flames, then
 * pieces wherever the beams already run, then lamps where the light ends or
 * where two colours cross. Lamps take the colour that reaches them. Walls,
 * sleeping lamps and one-way glass go only where light does not need to
 * pass, so the built arrangement stays a solution. The pieces the player
 * must place are then lifted off into the tray. The solver confirms each
 * board, measures its difficulty, and the closest to the target ships.
 */
export function generate(
  spec: LevelSpec,
  seed: number,
  id: string,
  lesson?: Lesson,
): Generated | null {
  const rnd = random(seed);
  let best: Generated | null = null;
  let found = 0;
  let bestScore = Infinity;
  for (let attempt = 0; attempt < MAX_ATTEMPTS && found < spec.candidates; attempt++) {
    const built = build(spec, rnd, id, lesson);
    if (!built) continue;
    const level = spec.harden > 0 ? harden(built, rnd, spec.harden, spec.sleepers > 0) : built;
    const check = solve(level, { maxSolutions: 6, budget: CHECK_BUDGET });
    if (check.solutions.length === 0) continue;
    found++;
    const effort = Math.log2(1 + check.nodes / check.solutions.length);
    // Close to the target effort, and as near to one answer as the board allows.
    const score =
      Math.abs(effort - spec.difficulty) +
      (spec.harden > 0 ? (check.solutions.length - 1) * 1.5 : 0) +
      (check.complete ? 0 : 3);
    if (score < bestScore) {
      bestScore = score;
      best = { level, effort, solutions: check.solutions.length };
    }
  }
  return best;
}

function solutionKey(placements: readonly Placement[]): string {
  return placements
    .map(
      (p) =>
        `${p.at}:${p.piece.type}${p.piece.type === 'mirror' ? p.piece.slant : p.piece.type === 'glass' ? p.piece.hue : ''}`,
    )
    .sort()
    .join(' ');
}

/**
 * Narrows a board towards one answer: while the solver finds another way
 * to light every lamp, put a wall (or a sleeping lamp) on a cell that other
 * way's light crosses and the intended light never does.
 */
function harden(level: Level, rnd: Rnd, steps: number, sleepers: boolean): Level {
  const intended = trace(compile(level, arrangementOf(level, level.solution)));
  const key = solutionKey(level.solution);
  let current = level;
  for (let step = 0; step < steps; step++) {
    const found = solve(current, { maxSolutions: 2, budget: CHECK_BUDGET / 2 });
    const other = found.solutions.find((s) => solutionKey(s) !== key);
    if (!other) break;
    const lit = trace(compile(current, arrangementOf(current, other)));
    const spots: number[] = [];
    for (let at = 0; at < current.w * current.h; at++) {
      if (current.tiles[at] || intended.hues[at] || intended.lamp[at]) continue;
      if (lit.hues[at] || other.some((p) => p.at === at)) spots.push(at);
    }
    if (spots.length === 0) break;
    const at = pick(rnd, spots);
    const tiles = [...current.tiles];
    tiles[at] = sleepers && rnd() < 0.4 ? { kind: 'sleeper' } : { kind: 'wall' };
    current = { ...current, tiles };
  }
  return current;
}

type Rnd = () => number;
const pick = <T>(rnd: Rnd, items: readonly T[]): T => items[Math.floor(rnd() * items.length)]!;
/** Fisher-Yates with the level's own random numbers (never sort() with a random comparator: engines differ). */
function shuffle<T>(rnd: Rnd, items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}
const isPiece = (c: number) => c === MIRROR_R || c === MIRROR_L || c === PRISM || c === GLASS;

function build(spec: LevelSpec, rnd: Rnd, id: string, lesson?: Lesson): Level | null {
  const { w, h } = spec;
  const g = emptyGrid(w, h);
  const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h;
  const neighbours = (at: number) => {
    const x = at % w;
    const y = (at - x) / w;
    const out: number[] = [];
    for (let d = 0; d < 4; d++) {
      const nx = x + DX[d]!;
      const ny = y + DY[d]!;
      if (inside(nx, ny)) out.push(ny * w + nx);
    }
    return out;
  };

  // Flames, each with room to shine before anything happens.
  for (let f = 0; f < spec.flames; f++) {
    let placed = false;
    for (let tries = 0; tries < 60 && !placed; tries++) {
      const x = Math.floor(rnd() * w);
      const y = Math.floor(rnd() * h);
      const at = y * w + x;
      if (g.code[at] !== EMPTY || neighbours(at).some((n) => g.code[n] !== EMPTY)) continue;
      const dirs = ([0, 1, 2, 3] as Dir[]).filter((d) => {
        for (let k = 1; k <= 3; k++) {
          const nx = x + DX[d]! * k;
          const ny = y + DY[d]! * k;
          if (!inside(nx, ny) || g.code[ny * w + nx] !== EMPTY) return false;
        }
        return true;
      });
      if (dirs.length === 0) continue;
      // Prefer flames near the edge, facing in.
      const edge = x === 0 || y === 0 || x === w - 1 || y === h - 1;
      if (!edge && rnd() < 0.6) continue;
      g.code[at] = FLAME;
      g.arg[at] = pick(rnd, dirs) | (WHITE << 2);
      placed = true;
    }
    if (!placed) return null;
  }

  // Pieces along the light, each sending it somewhere new.
  const built: Placement[] = [];
  let prisms = 0;
  let glass = 0;
  for (let i = 0; i < spec.pieces; i++) {
    let ok = false;
    for (let tries = 0; tries < 40 && !ok; tries++) {
      const before = trace(g);
      const cells = before.order.filter(
        (at) => !neighbours(at).some((n) => isPiece(g.code[n]!) || g.code[n] === FLAME),
      );
      if (cells.length === 0) break;
      // Lean towards the far end of the light, so paths grow long and wander.
      const at =
        cells[Math.min(cells.length - 1, Math.floor(cells.length * (0.25 + 0.75 * rnd())))]!;
      const here = before.hues[at]!;
      let piece: Piece;
      const roll = rnd();
      const single = here === 1 || here === 2 || here === 4 || here === WHITE;
      if (glass < spec.glass && single && roll < (spec.mixing ? 0.45 : 0.3)) {
        const hues = ([1, 2, 4] as GlassHue[]).filter((hh) => hh !== here);
        piece = { type: 'glass', hue: pick(rnd, hues) };
      } else if (prisms < spec.prisms && roll < 0.62) {
        piece = { type: 'prism' };
      } else {
        piece = { type: 'mirror', slant: rnd() < 0.5 ? 0 : 1 };
      }
      setPiece(g, at, piece);
      const after = trace(g);
      const seenBefore = new Set(before.order);
      const fresh = after.order.filter((c) => !seenBefore.has(c)).length;
      let recoloured = 0;
      if (piece.type === 'glass') {
        for (let c = 0; c < w * h; c++) if (after.hues[c] !== before.hues[c]) recoloured++;
      }
      ok = piece.type === 'glass' ? recoloured >= 2 : fresh >= 2;
      if (ok) {
        built.push({ at, piece });
        if (piece.type === 'prism') prisms++;
        if (piece.type === 'glass') glass++;
      } else clearCell(g, at);
    }
    if (!ok) return null;
  }

  // Lamps where the light ends, or where two colours cross.
  {
    const t = trace(g, true);
    const ends = new Set<number>();
    for (let s = 0; s < t.segs.length; s += 6) {
      const x2 = t.segs[s + 2]!;
      const y2 = t.segs[s + 3]!;
      if (Number.isInteger(x2) || Number.isInteger(y2)) {
        const at = Math.floor(t.segs[s + 1]!) * w + Math.floor(t.segs[s]!);
        if (g.code[at] === EMPTY) ends.add(at);
      }
    }
    const crossings: number[] = [];
    for (const at of t.order) {
      const m = t.hues[at]!;
      if (colourOf(m) && m !== 1 && m !== 2 && m !== 4 && m !== WHITE) crossings.push(at);
    }
    const want = spec.diyas[0] + Math.floor(rnd() * (spec.diyas[1] - spec.diyas[0] + 1));
    const chosen: number[] = [];
    if (spec.mixing) {
      if (crossings.length === 0) return null;
      chosen.push(pick(rnd, crossings));
    }
    const pool = [...ends].filter((at) => !chosen.includes(at));
    while (chosen.length < want && pool.length > 0) {
      const k = Math.floor(rnd() * pool.length);
      chosen.push(pool.splice(k, 1)[0]!);
    }
    for (const at of chosen) g.code[at] = DIYA;
    // A lamp may cut off the light another was counting on; drop any left dark or mixed wrong.
    for (let round = 0; round < 4; round++) {
      const after = trace(g);
      let changed = false;
      for (const at of chosen) {
        if (g.code[at] !== DIYA) continue;
        const m = after.lamp[at]!;
        if (m === 0 || colourOf(m) === null) {
          g.code[at] = EMPTY;
          changed = true;
        } else g.arg[at] = m;
      }
      if (!changed) break;
    }
    const lamps = chosen.filter((at) => g.code[at] === DIYA);
    if (lamps.length < spec.diyas[0]) return null;
    if (spec.mixing && !lamps.some((at) => ![1, 2, 4, WHITE].includes(g.arg[at]!))) return null;
    if (!solved(g, trace(g))) return null;
    // With two flames, each must light something.
    if (spec.flames > 1) {
      for (let at = 0; at < w * h; at++) {
        if (g.code[at] !== FLAME) continue;
        const keep = g.arg[at]!;
        g.code[at] = EMPTY;
        const still = solved(g, trace(g));
        g.code[at] = FLAME;
        g.arg[at] = keep;
        if (still) return null;
      }
    }
  }

  // Every piece must matter: one that can go without breaking anything goes.
  for (let i = built.length - 1; i >= 0; i--) {
    const p = built[i]!;
    clearCell(g, p.at);
    if (solved(g, trace(g))) built.splice(i, 1);
    else setPiece(g, p.at, p.piece);
  }
  if (built.length < Math.max(1, spec.pieces - 1)) return null;

  const lit = trace(g, true);
  const offPath = (at: number) =>
    g.code[at] === EMPTY && lit.hues[at] === 0 && !neighbours(at).some((n) => g.code[n] === FLAME);

  // Sleeping lamps in line with a piece, where a wrong turn would wake them.
  for (let s = 0; s < spec.sleepers; s++) {
    const spots: number[] = [];
    for (const p of built) {
      const x = p.at % w;
      const y = (p.at - x) / w;
      for (let d = 0; d < 4; d++) {
        for (let k = 1; k <= 3; k++) {
          const nx = x + DX[d]! * k;
          const ny = y + DY[d]! * k;
          if (!inside(nx, ny)) break;
          const at = ny * w + nx;
          if (g.code[at] !== EMPTY) break;
          if (offPath(at)) spots.push(at);
        }
      }
    }
    if (spots.length === 0) return null;
    g.code[pick(rnd, spots)] = SLEEPER;
  }

  // One-way glass on a stretch only one beam crosses, pointing the way it goes.
  if (spec.oneways > 0) {
    const dirsInto = new Map<number, Set<number>>();
    for (let s = 0; s < lit.segs.length; s += 6) {
      const x1 = lit.segs[s]!;
      const y1 = lit.segs[s + 1]!;
      const x2 = lit.segs[s + 2]!;
      const y2 = lit.segs[s + 3]!;
      if (Number.isInteger(x2) || Number.isInteger(y2)) continue;
      const at = Math.floor(y2) * w + Math.floor(x2);
      const d = x2 > x1 ? 1 : x2 < x1 ? 3 : y2 > y1 ? 2 : 0;
      if (!dirsInto.has(at)) dirsInto.set(at, new Set());
      dirsInto.get(at)!.add(d);
    }
    const spots = [...dirsInto.entries()].filter(
      ([at, dirs]) =>
        g.code[at] === EMPTY &&
        dirs.size === 1 &&
        !neighbours(at).some((n) => g.code[n] === FLAME || isPiece(g.code[n]!)),
    );
    if (spots.length === 0) return null;
    for (let o = 0; o < spec.oneways && spots.length > 0; o++) {
      const [at, dirs] = spots.splice(Math.floor(rnd() * spots.length), 1)[0]!;
      g.code[at] = ONEWAY;
      g.arg[at] = [...dirs][0]!;
    }
  }

  // Walls where no light needs to go.
  const free: number[] = [];
  for (let at = 0; at < w * h; at++) if (offPath(at) && g.code[at] === EMPTY) free.push(at);
  for (let k = 0; k < spec.walls && free.length > 0; k++) {
    g.code[free.splice(Math.floor(rnd() * free.length), 1)[0]!] = WALL;
  }
  if (!solved(g, trace(g))) return null;

  // Decide which pieces stay on the board (pivots, fixed) and which go to the tray.
  const order = shuffle(rnd, built);
  const pivots: Placement[] = [];
  const fixed: Placement[] = [];
  const tray: Placement[] = [];
  for (const p of order) {
    if (pivots.length < spec.pivots && p.piece.type === 'mirror') {
      // Only a mirror whose turn matters makes a pivot.
      setPiece(g, p.at, { type: 'mirror', slant: p.piece.slant === 0 ? 1 : 0 });
      const matters = !solved(g, trace(g));
      setPiece(g, p.at, p.piece);
      if (matters) {
        pivots.push(p);
        continue;
      }
    }
    if (fixed.length < spec.fixed) fixed.push(p);
    else tray.push(p);
  }
  if (spec.pivots > 0 && pivots.length === 0) return null;
  if (spec.pieces > spec.pivots + spec.fixed && tray.length === 0) return null;

  const tiles: (Tile | null)[] = [];
  for (let at = 0; at < w * h; at++) tiles.push(tileAt(g, at));
  for (const p of pivots) {
    const slant = p.piece.type === 'mirror' && p.piece.slant === 0 ? 1 : 0;
    tiles[p.at] = { kind: 'piece', piece: { type: 'mirror', slant }, lock: 'pivot' };
  }
  for (const p of fixed) tiles[p.at] = { kind: 'piece', piece: p.piece, lock: 'fixed' };
  for (const p of tray) tiles[p.at] = null;

  const level: Level = {
    id,
    w,
    h,
    tiles,
    tray: tray.map((p) => kindOf(p.piece)).sort(),
    solution: [...pivots, ...tray].sort((a, b) => a.at - b.at),
    ...(lesson ? { lesson } : {}),
  };
  // The board must not start solved.
  const start = compile(level);
  if (solved(start, trace(start))) return null;
  return level;
}

function tileAt(g: Grid, at: number): Tile | null {
  const a = g.arg[at]!;
  switch (g.code[at]) {
    case WALL:
      return { kind: 'wall' };
    case FLAME:
      return { kind: 'flame', dir: (a & 3) as Dir, hue: (a >> 2) as 1 | 2 | 4 | 8 };
    case DIYA:
      return { kind: 'diya', need: a };
    case SLEEPER:
      return { kind: 'sleeper' };
    case ONEWAY:
      return { kind: 'oneway', dir: a as Dir };
    case MIRROR_R:
      return { kind: 'piece', piece: { type: 'mirror', slant: 0 }, lock: 'fixed' };
    case MIRROR_L:
      return { kind: 'piece', piece: { type: 'mirror', slant: 1 }, lock: 'fixed' };
    case PRISM:
      return { kind: 'piece', piece: { type: 'prism' }, lock: 'fixed' };
    case GLASS:
      return { kind: 'piece', piece: { type: 'glass', hue: a as GlassHue }, lock: 'fixed' };
    default:
      return null;
  }
}
