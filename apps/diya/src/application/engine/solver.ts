import {
  kindOf,
  pieceOf,
  type Level,
  type Piece,
  type PieceKind,
  type Placement,
  type Slant,
} from '@/domain/entities/Board';
import { clearCell, compile, DIYA, EMPTY, setPiece, SLEEPER, type Grid } from './grid';
import { couldBecome, solved, trace } from './trace';

export interface SolveOptions {
  /** Stop after this many solutions (default 1). */
  readonly maxSolutions?: number;
  /** Give up after tracing this many boards (default 250 000). */
  readonly budget?: number;
  /** Tray pieces that must stay where they are (a player's pieces, when completing their board). */
  readonly pinned?: readonly Placement[];
  /** Pivots that must keep their slant (turned by a hint). */
  readonly fixedPivots?: Readonly<Record<number, Slant>>;
}

export interface SolveResult {
  /** Each solution: the tray pieces' places plus every pivot's slant. */
  readonly solutions: Placement[][];
  /** Boards traced: the search's effort, used as a difficulty measure. */
  readonly nodes: number;
  /** True when the search ran to the end (or to `maxSolutions`) within the budget. */
  readonly complete: boolean;
}

const KINDS: readonly PieceKind[] = ['mirror', 'prism', 'red', 'yellow', 'blue'];

/**
 * Finds ways to light every lamp by placing tray pieces and turning pivots.
 *
 * A placement off every beam changes nothing, so the search only ever
 * places a piece where light currently flows. It places pieces in the order
 * light reaches their cells, and each cell light passes before the chosen one
 * is frozen empty for that branch; so every set of placements is visited at
 * most once. Light that reaches a lamp before the next free cell can never
 * be taken back, so a lamp already given a wrong colour (or a sleeping lamp
 * woken) ends the branch at once.
 */
export function solve(level: Level, options: SolveOptions = {}): SolveResult {
  const maxSolutions = options.maxSolutions ?? 1;
  const budget = options.budget ?? 250_000;
  const grid = compile(level);
  const inventory = new Map<PieceKind, number>(KINDS.map((k) => [k, 0]));
  for (const k of level.tray) inventory.set(k, (inventory.get(k) ?? 0) + 1);
  for (const p of options.pinned ?? []) {
    setPiece(grid, p.at, p.piece);
    const kind = kindOf(p.piece);
    inventory.set(kind, Math.max(0, (inventory.get(kind) ?? 0) - 1));
  }
  const pivots: number[] = [];
  const settled: Placement[] = [];
  level.tiles.forEach((t, at) => {
    if (t?.kind !== 'piece' || t.lock !== 'pivot') return;
    const slant = options.fixedPivots?.[at];
    if (slant === undefined) pivots.push(at);
    else {
      setPiece(grid, at, { type: 'mirror', slant });
      settled.push({ at, piece: { type: 'mirror', slant } });
    }
  });

  const solutions: Placement[][] = [];
  const stack: Placement[] = [];
  const forbidden = new Uint8Array(level.w * level.h);
  let remaining = [...inventory.values()].reduce((a, b) => a + b, 0);
  let nodes = 0;
  let aborted = false;
  let slants: Slant[] = [];

  const dfs = (): boolean => {
    if (nodes >= budget) {
      aborted = true;
      return true;
    }
    nodes++;
    const t = trace(grid);
    if (solved(grid, t)) {
      solutions.push([
        ...settled,
        ...pivots.map(
          (at, i) => ({ at, piece: { type: 'mirror', slant: slants[i]! } }) as Placement,
        ),
        ...stack,
      ]);
      return solutions.length >= maxSolutions;
    }
    if (remaining === 0) return false;
    const frozen = new Uint8Array(grid.code.length);
    const added: number[] = [];
    let ai = 0;
    let stop = false;
    outer: for (let k = 0; k < t.order.length; k++) {
      const cell = t.order[k]!;
      const time = t.orderTime[k]!;
      while (ai < t.arrivals.length && t.arrivals[ai + 2]! <= time) {
        const lamp = t.arrivals[ai]!;
        frozen[lamp] = frozen[lamp]! | t.arrivals[ai + 1]!;
        ai += 3;
        if (!lampMayStillWork(grid, lamp, frozen[lamp]!)) break outer;
      }
      if (forbidden[cell] || grid.code[cell] !== EMPTY) continue;
      const here = t.hues[cell]!;
      for (const kind of KINDS) {
        if ((inventory.get(kind) ?? 0) === 0) continue;
        for (const piece of options_(kind, here)) {
          setPiece(grid, cell, piece);
          inventory.set(kind, inventory.get(kind)! - 1);
          remaining--;
          stack.push({ at: cell, piece });
          stop = dfs();
          stack.pop();
          remaining++;
          inventory.set(kind, inventory.get(kind)! + 1);
          clearCell(grid, cell);
          if (stop) break outer;
        }
      }
      forbidden[cell] = 1;
      added.push(cell);
    }
    for (const c of added) forbidden[c] = 0;
    return stop;
  };

  const combos = 1 << pivots.length;
  for (let combo = 0; combo < combos; combo++) {
    slants = pivots.map((_, i) => ((combo >> i) & 1) as Slant);
    pivots.forEach((at, i) => setPiece(grid, at, { type: 'mirror', slant: slants[i]! }));
    if (dfs()) break;
  }
  return { solutions, nodes, complete: !aborted };
}

function lampMayStillWork(grid: Grid, lamp: number, mask: number): boolean {
  const c = grid.code[lamp];
  if (c === SLEEPER) return mask === 0;
  if (c === DIYA) return couldBecome(mask, grid.arg[lamp]!);
  return true;
}

/** The ways a piece of `kind` can go into a cell crossed by light of `hues`. */
function options_(kind: PieceKind, hues: number): Piece[] {
  if (kind === 'mirror') return [pieceOf('mirror', 0), pieceOf('mirror', 1)];
  const piece = pieceOf(kind);
  // Glass the colour of the only light crossing it changes nothing.
  if (piece.type === 'glass' && hues === piece.hue) return [];
  return [piece];
}
