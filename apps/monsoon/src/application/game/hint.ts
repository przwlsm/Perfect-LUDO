import { openings, opposite, sameFacing, turnable, type Level } from '@/domain/entities/Board';
import { neighbour, partOfSide } from '../engine/flow';
import { solve } from '../engine/solver';
import type { PlayState } from './play';

export interface Hint {
  readonly at: number;
  /** The rotation the tile takes. */
  readonly rot: number;
}

/**
 * One tile turned the right way. The answer comes from the solver with the
 * hinted tiles pinned (on a board with several answers, the one closest to
 * what the player has). Among the tiles still facing wrong it picks the one
 * nearest the springs along the finished network, so each hint moves the
 * water a step further, and it never touches a tile the player already has
 * right.
 */
export function findHint(level: Level, state: PlayState): Hint | null {
  const pinned = new Map<number, number>();
  for (const at of state.hinted) pinned.set(at, state.rot[at] ?? 0);
  const result = solve(level, { limit: 6, pinned });
  if (!result.solutions.length) return null;
  const score = (s: readonly number[]) =>
    s.reduce((k, r, at) => k + (sameFacing(level.tiles[at]!, r, state.rot[at] ?? 0) ? 1 : 0), 0);
  const answer = [...result.solutions].sort((a, b) => score(b) - score(a))[0]!;

  const wrong = level.tiles
    .map((tile, at) => at)
    .filter((at) => {
      const tile = level.tiles[at]!;
      return (
        turnable(tile) &&
        !state.hinted.includes(at) &&
        !sameFacing(tile, answer[at]!, state.rot[at] ?? 0)
      );
    });
  if (!wrong.length) return null;

  const order = distances(level, answer);
  wrong.sort((a, b) => order[a]! - order[b]! || a - b);
  const at = wrong[0]!;
  // The facing the answer wants, reached by the fewest clockwise taps from where it is.
  const p = answer[at]!;
  const now = state.rot[at] ?? 0;
  let rot = p;
  for (let k = 0; k < 4; k++) {
    const r = (now + k) & 3;
    if (sameFacing(level.tiles[at]!, r, p)) {
      rot = r;
      break;
    }
  }
  return { at, rot };
}

/** Steps from the nearest spring for each cell, walking the finished network. */
function distances(level: Level, rot: readonly number[]): number[] {
  const n = level.tiles.length;
  const dist = new Array<number>(n).fill(1e6);
  const seen = new Uint8Array(n * 2);
  const queue: [number, number][] = [];
  level.tiles.forEach((tile, a) => {
    if (tile.kind === 'source') {
      dist[a] = 0;
      seen[a * 2] = 1;
      queue.push([a * 2, 0]);
    }
  });
  const openOf = (a: number, part: number) => {
    const tile = level.tiles[a]!;
    if (tile.kind === 'bridge') return part === 0 ? 0b0101 : 0b1010;
    return openings(tile, rot[a] ?? 0);
  };
  while (queue.length) {
    const [p, d0] = queue.shift()!;
    const a = p >> 1;
    const m = openOf(a, p & 1);
    for (let d = 0; d < 4; d++) {
      if (!(m & (1 << d))) continue;
      const b = neighbour(level, a, d);
      if (b < 0) continue;
      const q = b * 2 + partOfSide(level.tiles[b]!, opposite(d));
      if (seen[q]) continue;
      seen[q] = 1;
      dist[b] = Math.min(dist[b]!, d0 + 1);
      queue.push([q, d0 + 1]);
    }
  }
  return dist;
}

/** The state after a hint: the tile set right and locked. A hint is not a turn. */
export function applyHint(state: PlayState, hint: Hint): PlayState {
  const rot = [...state.rot];
  rot[hint.at] = hint.rot;
  return { ...state, rot, hinted: [...state.hinted, hint.at] };
}
