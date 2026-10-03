import { DEFAULT_LOOK, lookFor } from './cosmetics';

describe('lookFor', () => {
  it('combines a board and a piece look', () => {
    const look = lookFor('mahogany', 'jade');
    expect(look.board).toBe('#7a3b2e');
    expect(look.tiger).toBe('#2f9e6a');
  });

  it('falls back to the default for an unknown id', () => {
    expect(lookFor('throne', 'crystal')).toEqual(DEFAULT_LOOK);
    expect(lookFor('neon', 'brass_classic')).toEqual(DEFAULT_LOOK);
  });
});
