import { hasFinished, isInHomeColumn, isInYard, isOnSharedTrack, type Piece } from './Piece';

function piece(progress: number): Piece {
  return { id: 'RED-0', color: 'RED', progress };
}

describe('piece progress predicates', () => {
  it('classifies a piece in the yard', () => {
    expect(isInYard(piece(0))).toBe(true);
    expect(isInYard(piece(1))).toBe(false);
  });

  it('classifies a piece on the shared track', () => {
    expect(isOnSharedTrack(piece(1))).toBe(true);
    expect(isOnSharedTrack(piece(51))).toBe(true);
    expect(isOnSharedTrack(piece(0))).toBe(false);
    expect(isOnSharedTrack(piece(52))).toBe(false);
  });

  it('classifies a piece in its home column', () => {
    expect(isInHomeColumn(piece(52))).toBe(true);
    expect(isInHomeColumn(piece(56))).toBe(true);
    expect(isInHomeColumn(piece(51))).toBe(false);
    expect(isInHomeColumn(piece(57))).toBe(false);
  });

  it('classifies a finished piece', () => {
    expect(hasFinished(piece(57))).toBe(true);
    expect(hasFinished(piece(56))).toBe(false);
  });
});
