import { createGame, type PlayerColor } from '@/domain';
import type { IPlayerController } from '../ports/IPlayerController';
import type { GameSession } from '../session/GameSession';

/**
 * Turn order follows the Map's insertion order, so callers control seating
 * order by the order they add entries to `playerControllers`.
 */
export function startGame(
  playerControllers: ReadonlyMap<PlayerColor, IPlayerController>,
): GameSession {
  const colors = [...playerControllers.keys()];
  return { state: createGame(colors), controllers: playerControllers };
}
