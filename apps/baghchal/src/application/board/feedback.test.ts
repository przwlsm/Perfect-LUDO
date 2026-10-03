import { moveFeedback, resultSound } from './feedback';

describe('moveFeedback', () => {
  it('pairs each move with its sound and touch', () => {
    expect(moveFeedback({ kind: 'place', to: 1 })).toEqual({ sound: 'place', haptic: 'drop' });
    expect(moveFeedback({ kind: 'move', from: 0, to: 1 })).toEqual({
      sound: 'move',
      haptic: 'drop',
    });
    expect(moveFeedback({ kind: 'jump', from: 0, over: 1, to: 2 })).toEqual({
      sound: 'capture',
      haptic: 'capture',
    });
  });
});

describe('resultSound', () => {
  const tigers = { kind: 'win', winner: 'tiger', reason: 'captures' } as const;

  it('celebrates any win between two people', () => {
    expect(resultSound(tigers, null)).toBe('win');
  });

  it('depends on the seat against the computer', () => {
    expect(resultSound(tigers, 'tiger')).toBe('win');
    expect(resultSound(tigers, 'goat')).toBe('lose');
  });

  it('is silent on a draw', () => {
    expect(resultSound({ kind: 'draw', reason: 'repetition' }, 'goat')).toBeNull();
  });
});
