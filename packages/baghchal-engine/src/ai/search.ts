import { applyLegalMove, legalMoves, sameMove, type Move } from '../rules';
import { positionKey, type GameState } from '../state';
import { WIN_SCORE, evaluate } from './evaluate';

export type AiLevel = 'novice' | 'tactician' | 'grandmaster';

export interface AiTier {
  /** Plies searched at most. */
  readonly maxDepth: number;
  /** Thinking time at most, in milliseconds. */
  readonly timeMs: number;
  /** Random points added to each candidate's score before choosing: how often it errs. */
  readonly noise: number;
}

export const AI_LEVELS: Readonly<Record<AiLevel, AiTier>> = {
  novice: { maxDepth: 2, timeMs: 80, noise: 300 },
  tactician: { maxDepth: 4, timeMs: 350, noise: 30 },
  grandmaster: { maxDepth: 10, timeMs: 1200, noise: 0 },
};

export interface AiOptions {
  readonly level: AiLevel;
  /** Thinking time instead of the tier's, e.g. a quick hint from the strongest tier. */
  readonly timeMs?: number;
  /** Source of the tier's noise; inject for a repeatable choice. */
  readonly random?: () => number;
  /** The clock; inject to test the time budget. */
  readonly now?: () => number;
}

export interface AiChoice {
  readonly move: Move;
  /** The chosen move's score from the mover's side, before noise. */
  readonly score: number;
  /** The deepest search that finished in time. */
  readonly depth: number;
  readonly nodes: number;
}

interface RootScore {
  readonly move: Move;
  readonly score: number;
}

interface TableEntry {
  readonly depth: number;
  readonly score: number;
  readonly flag: 'exact' | 'lower' | 'upper';
  readonly move: Move | null;
}

const INFINITY = 1_000_000_000;
/** Scores this close to a win mean a forced result was found; searching deeper changes nothing. */
const DECIDED = WIN_SCORE - 1000;

class OutOfTime extends Error {}

/**
 * The move the computer plays. Iterative deepening under the tier's time
 * budget, so a slow phone simply searches less deep rather than stalling;
 * each pass orders the root moves by the previous pass, which is what makes
 * alpha-beta prune well.
 */
export function chooseMove(state: GameState, options: AiOptions): AiChoice {
  const tier = AI_LEVELS[options.level];
  const random = options.random ?? Math.random;
  const now = options.now ?? Date.now;
  const moves = legalMoves(state);
  const first = moves[0];
  if (!first) throw new Error('No legal moves to choose from');
  if (moves.length === 1) return { move: first, score: 0, depth: 0, nodes: 0 };

  const search = new Search(now, now() + (options.timeMs ?? tier.timeMs));
  let ranked: RootScore[] = orderMoves(moves, null).map((move) => ({ move, score: 0 }));
  let depth = 0;
  for (let target = 1; target <= tier.maxDepth; target += 1) {
    const pass = search.root(state, ranked, target);
    if (!pass) break;
    ranked = pass;
    depth = target;
    if (Math.abs(ranked[0]?.score ?? 0) >= DECIDED) break;
  }

  let best = ranked[0] ?? { move: first, score: 0 };
  let bestNoisy = -Infinity;
  for (const candidate of ranked) {
    const noisy = candidate.score + random() * tier.noise;
    if (noisy > bestNoisy) {
      bestNoisy = noisy;
      best = candidate;
    }
  }
  return { move: best.move, score: best.score, depth, nodes: search.nodes };
}

class Search {
  nodes = 0;
  /**
   * Keyed by board, side to move and goats in hand; the quiet-move history is
   * left out, so a repetition draw seen along one path may be reused along
   * another. Rare, and worth the pruning.
   */
  private readonly table = new Map<string, TableEntry>();

  constructor(
    private readonly now: () => number,
    private readonly deadline: number,
  ) {}

  /** Every root move scored to `depth`, best first, or null when time ran out. */
  root(state: GameState, ranked: readonly RootScore[], depth: number): RootScore[] | null {
    const scores: RootScore[] = [];
    let alpha = -INFINITY;
    try {
      for (const { move } of ranked) {
        const score = -this.negamax(applyLegalMove(state, move), depth - 1, -INFINITY, -alpha);
        scores.push({ move, score });
        if (score > alpha) alpha = score;
      }
    } catch (error) {
      if (error instanceof OutOfTime) return null;
      throw error;
    }
    return scores.sort((a, b) => b.score - a.score);
  }

  /** The position's value for the side to move, searched `depth` plies further. */
  private negamax(state: GameState, depth: number, alphaIn: number, betaIn: number): number {
    this.nodes += 1;
    if ((this.nodes & 2047) === 0 && this.now() > this.deadline) throw new OutOfTime();
    if (state.result) return terminalScore(state);
    if (depth === 0) return perspective(state) * evaluate(state);

    let alpha = alphaIn;
    let beta = betaIn;
    const key = positionKey(state.board, state.turn) + state.goatsInHand;
    const known = this.table.get(key);
    if (known && known.depth >= depth) {
      if (known.flag === 'exact') return known.score;
      if (known.flag === 'lower') alpha = Math.max(alpha, known.score);
      else beta = Math.min(beta, known.score);
      if (alpha >= beta) return known.score;
    }

    let best = -INFINITY;
    let bestMove: Move | null = null;
    for (const move of orderMoves(legalMoves(state), known?.move ?? null)) {
      const score = -this.negamax(applyLegalMove(state, move), depth - 1, -beta, -alpha);
      if (score > best) {
        best = score;
        bestMove = move;
      }
      if (score > alpha) alpha = score;
      if (alpha >= beta) break;
    }
    const flag = best <= alphaIn ? 'upper' : best >= beta ? 'lower' : 'exact';
    this.table.set(key, { depth, score: best, flag, move: bestMove });
    return best;
  }
}

function perspective(state: GameState): 1 | -1 {
  return state.turn === 'tiger' ? 1 : -1;
}

function terminalScore(state: GameState): number {
  const result = state.result;
  if (!result || result.kind === 'draw') return 0;
  const score = WIN_SCORE - state.plies;
  return result.winner === state.turn ? score : -score;
}

/** Captures first, and the move the table liked last time before all. */
function orderMoves(moves: readonly Move[], preferred: Move | null): Move[] {
  const rank = (move: Move) =>
    preferred && sameMove(move, preferred) ? 0 : move.kind === 'jump' ? 1 : 2;
  return [...moves].sort((a, b) => rank(a) - rank(b));
}
