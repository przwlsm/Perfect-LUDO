import { getFinishProgress } from '../board';
import { hasPlayerWon } from '../entities/Player';
import type { Player } from '../entities/Player';
import type { PlayerColor } from '../entities/PlayerColor';

/**
 * First player to bring all 4 pieces home wins and the game ends. In a team
 * game a pair wins once both partners are home; the winner named is
 * `mover` when they belong to that pair (the move that completed it).
 */
export function findWinner(
  players: readonly Player[],
  teams = false,
  mover: PlayerColor | null = null,
  goal = 4,
): PlayerColor | null {
  const finish = getFinishProgress(players.length);
  const reached = (player: Player) =>
    goal >= 4
      ? hasPlayerWon(player, players.length)
      : player.pieces.filter((piece) => piece.progress === finish).length >= goal;
  if (teams && players.length === 4) {
    for (let i = 0; i < 2; i++) {
      const pair = [players[i]!, players[i + 2]!];
      if (pair.every(reached)) {
        return pair.some((p) => p.color === mover) ? mover : pair[0]!.color;
      }
    }
    return null;
  }
  const winner = players.find(reached);
  return winner?.color ?? null;
}
