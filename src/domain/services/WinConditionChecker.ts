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
): PlayerColor | null {
  if (teams && players.length === 4) {
    for (let i = 0; i < 2; i++) {
      const pair = [players[i]!, players[i + 2]!];
      if (pair.every((player) => hasPlayerWon(player, 4))) {
        return pair.some((p) => p.color === mover) ? mover : pair[0]!.color;
      }
    }
    return null;
  }
  const winner = players.find((player) => hasPlayerWon(player, players.length));
  return winner?.color ?? null;
}
