import type { Piece } from '../entities/Piece';
import type { Player } from '../entities/Player';
import type { PlayerColor } from '../entities/PlayerColor';
import { getValidMoveForPiece, getValidMoves } from './MoveValidator';

function makePlayer(color: PlayerColor, progresses: readonly number[]): Player {
  const pieces: Piece[] = progresses.map((progress, index) => ({
    id: `${color}-${index}`,
    color,
    progress,
  }));
  return { id: color, color, pieces };
}

describe('getValidMoveForPiece', () => {
  it('lets a piece leave the yard only on a 6', () => {
    const players = [makePlayer('RED', [0, 0, 0, 0]), makePlayer('GREEN', [0, 0, 0, 0])];
    const piece = players[0]!.pieces[0]!;

    expect(getValidMoveForPiece(players, piece, 3)).toBeNull();

    const move = getValidMoveForPiece(players, piece, 6);
    expect(move).toEqual({
      pieceId: piece.id,
      fromProgress: 0,
      toProgress: 1,
      capturedPieceIds: [],
    });
  });

  it('rejects a move that would overshoot the finish', () => {
    const players = [makePlayer('RED', [55, 0, 0, 0]), makePlayer('GREEN', [0, 0, 0, 0])];
    const piece = players[0]!.pieces[0]!;

    expect(getValidMoveForPiece(players, piece, 5)).toBeNull(); // 55 + 5 = 60 > 57
  });

  it('allows landing exactly on the finish square', () => {
    const players = [makePlayer('RED', [55, 0, 0, 0]), makePlayer('GREEN', [0, 0, 0, 0])];
    const piece = players[0]!.pieces[0]!;

    expect(getValidMoveForPiece(players, piece, 2)?.toProgress).toBe(57);
  });

  it('captures a lone opponent piece on an unsafe square', () => {
    // RED entry is square 0; progress 1 -> square 0, which is safe, so use progress 3 -> square 2.
    // GREEN entry is 13, so GREEN progress 42 -> (13+42-1)%52 = 2, landing on RED's path.
    const green = makePlayer('GREEN', [42, 0, 0, 0]);
    const players = [makePlayer('RED', [1, 0, 0, 0]), green];
    const redPiece = players[0]!.pieces[0]!;

    const move = getValidMoveForPiece(players, redPiece, 2); // RED progress 1 -> 3 -> square 2
    expect(move).not.toBeNull();
    expect(move?.capturedPieceIds).toEqual([green.pieces[0]!.id]);
  });

  it('never captures on a safe square', () => {
    // GREEN's entry square (13) is safe. Put an opponent there via YELLOW progress landing on 13.
    // YELLOW entry is 26; progress p -> square (26+p-1)%52 = 13 => p = 13-26+1+52 = 40.
    const green = makePlayer('GREEN', [0, 0, 0, 0]); // GREEN progress 1 -> square 13 (its own entry, safe)
    const yellowOnSquare13 = makePlayer('YELLOW', [40, 0, 0, 0]);
    const players = [green, yellowOnSquare13];
    const greenPiece = players[0]!.pieces[0]!;

    const move = getValidMoveForPiece(players, greenPiece, 6); // leave yard -> progress 1 -> square 13
    expect(move).not.toBeNull();
    expect(move?.capturedPieceIds).toEqual([]);
  });

  it('blocks landing on a square held by two or more same-colored opponent pieces', () => {
    // Two GREEN pieces both on square 2 (progress 42 as computed above), RED tries to land there.
    const greenBlock = makePlayer('GREEN', [42, 42, 0, 0]);
    const players = [makePlayer('RED', [1, 0, 0, 0]), greenBlock];
    const redPiece = players[0]!.pieces[0]!;

    expect(getValidMoveForPiece(players, redPiece, 2)).toBeNull();
  });

  it('allows stacking on a square already held by the same color', () => {
    const players = [makePlayer('RED', [1, 3, 0, 0]), makePlayer('GREEN', [0, 0, 0, 0])];
    const firstRedPiece = players[0]!.pieces[0]!;

    // RED progress 1 -> 3, landing on the same square as the second RED piece.
    const move = getValidMoveForPiece(players, firstRedPiece, 2);
    expect(move).not.toBeNull();
    expect(move?.capturedPieceIds).toEqual([]);
  });
});

describe('getValidMoves', () => {
  it('returns one move per movable piece and skips finished pieces', () => {
    const players = [makePlayer('RED', [0, 10, 57, 20]), makePlayer('GREEN', [0, 0, 0, 0])];

    const moves = getValidMoves(players, 'RED', 5);

    // Piece 0 is in the yard and die isn't 6, so it can't move; piece 2 already finished.
    expect(moves.map((m) => m.pieceId).sort()).toEqual(['RED-1', 'RED-3'].sort());
  });

  it('returns an empty array for an unknown color', () => {
    const players = [makePlayer('RED', [0, 0, 0, 0])];
    expect(getValidMoves(players, 'BLUE', 6)).toEqual([]);
  });
});
