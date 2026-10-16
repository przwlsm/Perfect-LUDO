import type { GameState, PlayerColor } from '@/domain';
import type { IPlayerController } from '../ports/IPlayerController';

/**
 * The domain's GameState has no notion of who controls each color — that's
 * an application-level concern (human vs AI vs, later, remote). A session
 * pairs the two.
 */
export interface GameSession {
  readonly state: GameState;
  readonly controllers: ReadonlyMap<PlayerColor, IPlayerController>;
}

export function getControllerForColor(session: GameSession, color: PlayerColor): IPlayerController {
  const controller = session.controllers.get(color);
  if (!controller) {
    throw new Error(`No controller registered for color ${color}`);
  }
  return controller;
}
