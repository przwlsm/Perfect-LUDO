import { goatMoves, tigerMoves } from '../rules';
import type { GameState } from '../state';

/** A decided game scores this far from zero; every ply it takes costs one point, so quicker wins rank higher. */
export const WIN_SCORE = 100_000;

const CAPTURE = 1200;
/** A goat the tigers could take right now. */
const THREAT = 120;
const TIGER_MOVE = 12;
/** A tiger with nowhere to go is most of the way to being trapped. */
const TRAPPED_TIGER = 150;
const GOAT_MOVE = 4;

/**
 * How the position looks from the tigers' side (positive good for tigers,
 * negative good for goats), in points comparable to a capture. Captures
 * decide the game, so they dominate; then threats, then room to move.
 */
export function evaluate(state: GameState): number {
  const tiger = tigerMoves(state.board);
  const mobile = new Set<number>();
  let jumps = 0;
  for (const move of tiger) {
    if (move.kind === 'place') continue;
    if (move.kind === 'jump') jumps += 1;
    mobile.add(move.from);
  }
  const tigers = state.board.filter((cell) => cell === 'T').length;
  let score =
    CAPTURE * state.goatsCaptured +
    THREAT * jumps +
    TIGER_MOVE * (tiger.length - jumps) -
    TRAPPED_TIGER * (tigers - mobile.size);
  if (state.goatsInHand === 0) score -= GOAT_MOVE * goatMoves(state).length;
  return score;
}
