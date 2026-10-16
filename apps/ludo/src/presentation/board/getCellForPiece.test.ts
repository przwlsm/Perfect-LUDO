import type { Piece } from '@/domain';
import { FINISH_CELL, HOME_COLUMN_CELLS, TRACK_CELLS, YARD_REST_SPOTS } from './boardLayout';
import { getCellForPiece } from './getCellForPiece';

function piece(progress: number): Piece {
  return { id: 'RED-0', color: 'RED', progress };
}

describe('getCellForPiece', () => {
  it('places a yard piece at one of its color rest spots', () => {
    expect(getCellForPiece(piece(0), 2)).toEqual(YARD_REST_SPOTS.RED[2]);
  });

  it('wraps the yard slot index into range', () => {
    expect(getCellForPiece(piece(0), 5)).toEqual(YARD_REST_SPOTS.RED[1]); // 5 % 4 = 1
  });

  it('places a shared-track piece at the matching track cell', () => {
    expect(getCellForPiece(piece(1), 0)).toEqual(TRACK_CELLS[0]); // RED entry square
  });

  it('places a home-column piece at the matching column cell', () => {
    expect(getCellForPiece(piece(53), 0)).toEqual(HOME_COLUMN_CELLS.RED[1]); // step 2
  });

  it('places a finished piece at its color finish cell', () => {
    expect(getCellForPiece(piece(57), 0)).toEqual(FINISH_CELL.RED);
  });

  describe('flip', () => {
    it('parks a flipped yard piece at the opposite color rest spot', () => {
      expect(getCellForPiece(piece(0), 2, 2, true)).toEqual(YARD_REST_SPOTS.YELLOW[2]);
    });

    it('places a flipped shared-track piece exactly half way around the ring', () => {
      expect(getCellForPiece(piece(1), 0, 2, true)).toEqual(TRACK_CELLS[26]); // RED entry + 26
    });

    it('places a flipped home-column piece in the opposite color column', () => {
      expect(getCellForPiece(piece(53), 0, 2, true)).toEqual(HOME_COLUMN_CELLS.YELLOW[1]);
    });

    it('finishes a flipped piece at the opposite color finish cell', () => {
      expect(getCellForPiece(piece(57), 0, 2, true)).toEqual(FINISH_CELL.YELLOW);
    });

    it('flipping RED renders exactly where an un-flipped YELLOW piece would sit', () => {
      for (const progress of [0, 1, 30, 53, 57]) {
        const flippedRed = getCellForPiece({ id: 'x', color: 'RED', progress }, 1, 2, true);
        const plainYellow = getCellForPiece({ id: 'x', color: 'YELLOW', progress }, 1, 2, false);
        expect(flippedRed).toEqual(plainYellow);
      }
    });
  });
});
