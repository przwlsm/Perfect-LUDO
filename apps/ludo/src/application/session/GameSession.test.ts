import { createGame } from '@/domain';
import { AIPlayerController } from '../ai/AIPlayerController';
import { RandomMoveStrategy } from '../ai/RandomMoveStrategy';
import { getControllerForColor, type GameSession } from './GameSession';

describe('getControllerForColor', () => {
  it('returns the registered controller for a color', () => {
    const controller = new AIPlayerController(new RandomMoveStrategy());
    const session: GameSession = {
      state: createGame(['RED', 'GREEN']),
      controllers: new Map([['RED', controller]]),
    };

    expect(getControllerForColor(session, 'RED')).toBe(controller);
  });

  it('throws when no controller is registered for the color', () => {
    const session: GameSession = {
      state: createGame(['RED', 'GREEN']),
      controllers: new Map(),
    };

    expect(() => getControllerForColor(session, 'GREEN')).toThrow();
  });
});
