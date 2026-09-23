import type { PlayerColor } from '@/domain';

/**
 * Pixel-free board geometry: every cell as a (row, col) on a 15x15 grid.
 * Verified against two independent open-source Ludo implementations and
 * confirmed self-consistent under a 90°-rotation about the grid center —
 * indices line up exactly with domain/board.ts (entries at 0/13/26/39,
 * safe squares 8 steps past each entry), so this is purely a rendering
 * concern layered on top of geometry the domain already validated.
 */
export const GRID_SIZE = 15;

export type Cell = readonly [row: number, col: number];

export const TRACK_CELLS: readonly Cell[] = [
  [6, 1],
  [6, 2],
  [6, 3],
  [6, 4],
  [6, 5],
  [5, 6],
  [4, 6],
  [3, 6],
  [2, 6],
  [1, 6],
  [0, 6],
  [0, 7],
  [0, 8],
  [1, 8],
  [2, 8],
  [3, 8],
  [4, 8],
  [5, 8],
  [6, 9],
  [6, 10],
  [6, 11],
  [6, 12],
  [6, 13],
  [6, 14],
  [7, 14],
  [8, 14],
  [8, 13],
  [8, 12],
  [8, 11],
  [8, 10],
  [8, 9],
  [9, 8],
  [10, 8],
  [11, 8],
  [12, 8],
  [13, 8],
  [14, 8],
  [14, 7],
  [14, 6],
  [13, 6],
  [12, 6],
  [11, 6],
  [10, 6],
  [9, 6],
  [8, 5],
  [8, 4],
  [8, 3],
  [8, 2],
  [8, 1],
  [8, 0],
  [7, 0],
  [6, 0],
];

export const HOME_COLUMN_CELLS: Record<PlayerColor, readonly Cell[]> = {
  RED: [
    [7, 1],
    [7, 2],
    [7, 3],
    [7, 4],
    [7, 5],
  ],
  GREEN: [
    [1, 7],
    [2, 7],
    [3, 7],
    [4, 7],
    [5, 7],
  ],
  YELLOW: [
    [7, 13],
    [7, 12],
    [7, 11],
    [7, 10],
    [7, 9],
  ],
  BLUE: [
    [13, 7],
    [12, 7],
    [11, 7],
    [10, 7],
    [9, 7],
  ],
};

/** The literal home/finished resting spot, one step past the home column. */
export const FINISH_CELL: Record<PlayerColor, Cell> = {
  RED: [7, 6],
  GREEN: [6, 7],
  YELLOW: [7, 8],
  BLUE: [8, 7],
};

export const YARD_REST_SPOTS: Record<PlayerColor, readonly Cell[]> = {
  RED: [
    [1, 1],
    [1, 4],
    [4, 1],
    [4, 4],
  ],
  GREEN: [
    [1, 10],
    [1, 13],
    [4, 10],
    [4, 13],
  ],
  YELLOW: [
    [10, 10],
    [10, 13],
    [13, 10],
    [13, 13],
  ],
  BLUE: [
    [10, 1],
    [10, 4],
    [13, 1],
    [13, 4],
  ],
};

export const YARD_BLOCKS: Record<PlayerColor, { readonly row: number; readonly col: number }> = {
  RED: { row: 0, col: 0 },
  GREEN: { row: 0, col: 9 },
  YELLOW: { row: 9, col: 9 },
  BLUE: { row: 9, col: 0 },
};
export const YARD_BLOCK_SIZE = 6;
