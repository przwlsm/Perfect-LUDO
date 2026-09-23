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
});
