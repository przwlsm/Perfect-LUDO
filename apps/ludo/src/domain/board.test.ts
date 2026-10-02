import { getBoardPosition, getEntrySquare, isSafeSquare, TRACK_LENGTH } from './board';

describe('getEntrySquare', () => {
  it('spaces the four entry squares evenly around the 52-square track', () => {
    expect(getEntrySquare('RED')).toBe(0);
    expect(getEntrySquare('GREEN')).toBe(13);
    expect(getEntrySquare('YELLOW')).toBe(26);
    expect(getEntrySquare('BLUE')).toBe(39);
  });
});

describe('getBoardPosition', () => {
  it('returns null for a piece still in the yard', () => {
    expect(getBoardPosition('RED', 0)).toBeNull();
  });

  it('returns null for a finished piece', () => {
    expect(getBoardPosition('RED', 57)).toBeNull();
  });

  it('places progress 1 exactly on the entry square', () => {
    expect(getBoardPosition('RED', 1)).toEqual({ zone: 'SHARED_TRACK', square: 0 });
    expect(getBoardPosition('BLUE', 1)).toEqual({ zone: 'SHARED_TRACK', square: 39 });
  });

  it('wraps the shared track around the board for a full lap', () => {
    // BLUE enters at 39; after 13 steps it should wrap back to square 0.
    expect(getBoardPosition('BLUE', 14)).toEqual({ zone: 'SHARED_TRACK', square: 0 });
  });

  it('moves a piece into its own home column after 51 shared-track steps', () => {
    expect(getBoardPosition('RED', 52)).toEqual({ zone: 'HOME_COLUMN', color: 'RED', step: 1 });
    expect(getBoardPosition('RED', 56)).toEqual({ zone: 'HOME_COLUMN', color: 'RED', step: 5 });
  });
});

describe('isSafeSquare', () => {
  it('treats every entry square as safe', () => {
    expect(isSafeSquare(0)).toBe(true);
    expect(isSafeSquare(13)).toBe(true);
    expect(isSafeSquare(26)).toBe(true);
    expect(isSafeSquare(39)).toBe(true);
  });

  it('treats the star square 8 steps ahead of each entry as safe', () => {
    expect(isSafeSquare(8)).toBe(true);
    expect(isSafeSquare(21)).toBe(true);
  });

  it('treats an ordinary square as unsafe', () => {
    expect(isSafeSquare(1)).toBe(false);
    expect(isSafeSquare(50)).toBe(false);
  });

  it('never reports a square outside the track as safe', () => {
    for (let square = 0; square < TRACK_LENGTH; square += 1) {
      expect(typeof isSafeSquare(square)).toBe('boolean');
    }
  });
});
