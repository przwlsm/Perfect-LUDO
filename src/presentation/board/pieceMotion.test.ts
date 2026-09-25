import { getPieceWaypoints, PIECE_JUMP_MS, PIECE_SETTLE_MS, PIECE_STEP_MS } from './pieceMotion';
import { getCellForPiece } from './getCellForPiece';
import { type Piece, PLAYER_COLORS } from '@/domain';

it.each(PLAYER_COLORS)(
  'keeps %s movement on every track cell, including corners and home entry',
  (color) => {
    for (let from = 1; from < 57; from++) {
      const to = Math.min(57, from + 6);
      const piece: Piece = { id: `${color}-0`, color, progress: to };
      const path = getPieceWaypoints(piece, from, 0);
      expect(path).toHaveLength(to - from);
      path.forEach((cell, index) =>
        expect(cell).toEqual(getCellForPiece({ ...piece, progress: from + index + 1 }, 0)),
      );
    }
  },
);
it('returns captured pieces to their own yard slot in a single arc', () => {
  const piece: Piece = { id: 'RED-2', color: 'RED', progress: 0 };
  expect(getPieceWaypoints(piece, 41, 2)).toEqual([getCellForPiece(piece, 2)]);
});

it('waits for the longest possible walk before the next turn starts', () => {
  // A six walks six squares; the turn must not advance while the coin is
  // still hopping, or the next roll would land on a coin mid-flight.
  expect(PIECE_SETTLE_MS).toBeGreaterThan(PIECE_STEP_MS * 6);
  expect(PIECE_SETTLE_MS).toBeGreaterThan(PIECE_JUMP_MS);
});
