import { boardFromString } from 'baghchal-engine';
import { initialPieces, piecesFromBoard, trackPieces } from './PieceTracker';

describe('piecesFromBoard', () => {
  it('lists every piece on the board', () => {
    const pieces = piecesFromBoard(boardFromString('TG..................G..T.'));
    expect(pieces.map((piece) => [piece.kind, piece.node])).toEqual([
      ['T', 0],
      ['G', 1],
      ['G', 20],
      ['T', 23],
    ]);
    expect(new Set(pieces.map((piece) => piece.id)).size).toBe(4);
  });
});

describe('trackPieces', () => {
  it('starts with four tigers in the corners', () => {
    expect(initialPieces().map((piece) => piece.node)).toEqual([0, 4, 20, 24]);
  });

  it('adds a numbered goat on placement', () => {
    const pieces = trackPieces(initialPieces(), { kind: 'place', to: 12 }, 0);
    expect(pieces).toHaveLength(5);
    expect(pieces[4]).toEqual({ id: 'goat-0', kind: 'G', node: 12 });
  });

  it('keeps a piece’s identity when it moves', () => {
    const pieces = trackPieces(initialPieces(), { kind: 'move', from: 0, to: 1 }, 0);
    expect(pieces.find((piece) => piece.id === 'tiger-0')?.node).toBe(1);
  });

  it('removes the jumped goat and moves the tiger', () => {
    const start = trackPieces(initialPieces(), { kind: 'place', to: 1 }, 0);
    const pieces = trackPieces(start, { kind: 'jump', from: 0, over: 1, to: 2 }, 1);
    expect(pieces.some((piece) => piece.id === 'goat-0')).toBe(false);
    expect(pieces.find((piece) => piece.id === 'tiger-0')?.node).toBe(2);
  });
});
