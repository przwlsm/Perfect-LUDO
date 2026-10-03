import { colors } from './colors';

/** The six colours a look changes on the board. */
export interface BoardLook {
  readonly board: string;
  readonly boardLine: string;
  readonly tiger: string;
  readonly tigerEdge: string;
  readonly goat: string;
  readonly goatEdge: string;
}

type BoardColours = Pick<BoardLook, 'board' | 'boardLine'>;
type PieceColours = Pick<BoardLook, 'tiger' | 'tigerEdge' | 'goat' | 'goatEdge'>;

/** Mirrors the board rows of `store_items`. */
export const BOARD_LOOKS: Readonly<Record<string, BoardColours>> = {
  classic_wood: { board: colors.board, boardLine: colors.boardLine },
  mahogany: { board: '#7a3b2e', boardLine: '#2e120c' },
  ancient_slate: { board: '#5d6670', boardLine: '#1d2228' },
  cyberpunk: { board: '#141a2e', boardLine: '#3ff0ff' },
  golden_dawn: { board: '#e9c46a', boardLine: '#7a4e12' },
};

/** Mirrors the piece rows of `store_items`. */
export const PIECE_LOOKS: Readonly<Record<string, PieceColours>> = {
  brass_classic: {
    tiger: colors.tiger,
    tigerEdge: colors.tigerEdge,
    goat: colors.goat,
    goatEdge: colors.goatEdge,
  },
  jade: { tiger: '#2f9e6a', tigerEdge: '#0f3d27', goat: '#d9f2e6', goatEdge: '#5f8f7a' },
  ivory_ebony: { tiger: '#1c1a1a', tigerEdge: '#6b6161', goat: '#f8f2e4', goatEdge: '#9c8d6c' },
  neon: { tiger: '#ff2d95', tigerEdge: '#6b0040', goat: '#4dff88', goatEdge: '#0f6b35' },
};

export const DEFAULT_LOOK: BoardLook = {
  ...BOARD_LOOKS.classic_wood!,
  ...PIECE_LOOKS.brass_classic!,
};

/** The look for an equipped board and pieces; an unknown id falls back to the default. */
export function lookFor(boardId: string, piecesId: string): BoardLook {
  return {
    ...(BOARD_LOOKS[boardId] ?? BOARD_LOOKS.classic_wood!),
    ...(PIECE_LOOKS[piecesId] ?? PIECE_LOOKS.brass_classic!),
  };
}
