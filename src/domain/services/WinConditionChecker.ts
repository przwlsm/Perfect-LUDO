import { hasPlayerWon } from '../entities/Player';
import type { Player } from '../entities/Player';
import type { PlayerColor } from '../entities/PlayerColor';

/** First player to bring all 4 pieces home wins and the game ends. */
export function findWinner(players: readonly Player[]): PlayerColor | null {
  const winner = players.find((player) => hasPlayerWon(player, players.length));
  return winner?.color ?? null;
}
