import { parseAiOpponent } from './aiOpponent';

describe('parseAiOpponent', () => {
  it('reads the level and side from route params', () => {
    expect(parseAiOpponent('tactician', 'tiger')).toEqual({ level: 'tactician', side: 'tiger' });
    expect(parseAiOpponent(['novice'], ['goat'])).toEqual({ level: 'novice', side: 'goat' });
  });

  it('defaults the computer to the goats', () => {
    expect(parseAiOpponent('grandmaster', undefined)).toEqual({
      level: 'grandmaster',
      side: 'goat',
    });
    expect(parseAiOpponent('grandmaster', 'dragon')).toEqual({
      level: 'grandmaster',
      side: 'goat',
    });
  });

  it('means pass-and-play when there is no valid level', () => {
    expect(parseAiOpponent(undefined, 'tiger')).toBeNull();
    expect(parseAiOpponent('legend', 'tiger')).toBeNull();
    expect(parseAiOpponent('constructor', 'tiger')).toBeNull();
  });
});
