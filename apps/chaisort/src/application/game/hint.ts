import { route, search } from '../engine/solver';
import { isSolved, type Pos, type Pour } from '../engine/state';

export type Hint =
  /** The next pour on a shortest route the solver found, and how many pours that route takes. */
  | { readonly kind: 'pour'; readonly pour: Pour; readonly left: number }
  /**
   * The counter can no longer be sorted (or not within reach): go back to
   * position `at` in the history, where it still can, and pour this next.
   */
  | { readonly kind: 'undo'; readonly at: number; readonly pour: Pour; readonly left: number }
  | { readonly kind: 'solved' }
  /** Nothing found within the effort allowed; restarting is the way. */
  | { readonly kind: 'restart' };

/**
 * A hint for the player's history of positions (last = now). From the
 * current position it asks for a shortest route; if there is none, it
 * walks back through the history to the latest position that can still be
 * sorted. Every pour it suggests is on a route the solver actually found.
 */
export function findHint(history: readonly Pos[], budget = 40_000): Hint {
  const last = history.length - 1;
  const now = history[last];
  if (!now) return { kind: 'restart' };
  if (isSolved(now)) return { kind: 'solved' };
  const here = route(now, budget);
  if (here.status === 'solved' && here.path[0]) {
    return { kind: 'pour', pour: here.path[0], left: here.path.length };
  }
  // Walk back: a quick, greedy check first, then the best route from there.
  const step = Math.max(2_000, Math.floor(budget / 8));
  for (let i = last - 1; i >= 0; i--) {
    const pos = history[i]!;
    const quick = search(pos, { budget: step, weight: 3 });
    if (quick.status !== 'solved') continue;
    const best = route(pos, budget);
    const path = best.status === 'solved' ? best.path : quick.path;
    if (path[0]) return { kind: 'undo', at: i, pour: path[0], left: path.length };
  }
  return { kind: 'restart' };
}
