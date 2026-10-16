import {
  getCurrentPlayer,
  getFinishProgress,
  type GameState,
  type MatchStats,
  type PlayerColor,
} from '@/domain';

/**
 * Adds whatever `color` achieved between two consecutive game states: a six
 * rolled, opponents' coins sent home, own coins reaching the finish. Pure, so
 * the same counting serves offline games and online snapshots alike.
 */
export function accumulateStats(
  stats: MatchStats,
  before: GameState,
  after: GameState,
  color: PlayerColor,
): MatchStats {
  let { sixes, captures, home } = stats;
  const mover = getCurrentPlayer(before).color;
  if (mover === color && before.lastRoll === null && after.lastRoll === 6) sixes += 1;

  const previous = new Map(before.players.flatMap((p) => p.pieces).map((p) => [p.id, p]));
  const finish = getFinishProgress(after.players.length);
  for (const piece of after.players.flatMap((p) => p.pieces)) {
    const was = previous.get(piece.id);
    if (!was || was.progress === piece.progress) continue;
    if (mover === color && piece.color !== color && piece.progress === 0 && was.progress > 0)
      captures += 1;
    if (piece.color === color && piece.progress === finish && was.progress !== finish) home += 1;
  }
  return { sixes, captures, home };
}
