import { describeMove } from './notation';

describe('describeMove', () => {
  it('writes placements, moves and jumps', () => {
    expect(describeMove({ kind: 'place', to: 12 })).toBe('C3');
    expect(describeMove({ kind: 'move', from: 0, to: 6 })).toBe('A1-B2');
    expect(describeMove({ kind: 'jump', from: 0, over: 1, to: 2 })).toBe('A1xC1');
  });
});
