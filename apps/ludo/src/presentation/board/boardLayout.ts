import { TRACK_LENGTH, type ClassicColor } from '@/domain';

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

export const HOME_COLUMN_CELLS: Record<ClassicColor, readonly Cell[]> = {
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
export const FINISH_CELL: Record<ClassicColor, Cell> = {
  RED: [7, 6],
  GREEN: [6, 7],
  YELLOW: [7, 8],
  BLUE: [8, 7],
};

// Fractional cells: resting pieces sit pulled toward their yard's centre
// (±1.25 cells from it) instead of hugging the inner box's border.
export const YARD_REST_SPOTS: Record<ClassicColor, readonly Cell[]> = {
  RED: [
    [1.25, 1.25],
    [1.25, 3.75],
    [3.75, 1.25],
    [3.75, 3.75],
  ],
  GREEN: [
    [1.25, 10.25],
    [1.25, 12.75],
    [3.75, 10.25],
    [3.75, 12.75],
  ],
  YELLOW: [
    [10.25, 10.25],
    [10.25, 12.75],
    [12.75, 10.25],
    [12.75, 12.75],
  ],
  BLUE: [
    [10.25, 1.25],
    [10.25, 3.75],
    [12.75, 1.25],
    [12.75, 3.75],
  ],
};

export const YARD_BLOCKS: Record<ClassicColor, { readonly row: number; readonly col: number }> = {
  RED: { row: 0, col: 0 },
  GREEN: { row: 0, col: 9 },
  YELLOW: { row: 9, col: 9 },
  BLUE: { row: 9, col: 0 },
};
export const YARD_BLOCK_SIZE = 6;

/**
 * The board's four quadrants are diagonal opposites under a 180° turn: RED's
 * corner (0,0) lands exactly on YELLOW's (9,9), and GREEN's on BLUE's — the
 * same 90°-rotation symmetry noted above, applied twice. "Flipping" a seat
 * therefore never recomputes a coordinate; it just reads its opposite
 * number's already-defined geometry.
 */
export const OPPOSITE_COLOR: Record<ClassicColor, ClassicColor> = {
  RED: 'YELLOW',
  YELLOW: 'RED',
  GREEN: 'BLUE',
  BLUE: 'GREEN',
};

/**
 * A 2-player table puts the local player's own colour nearest their thumbs
 * (bottom of the screen) rather than wherever the classic board happens to
 * draw it. These helpers are how every renderer (2D, 3D) applies that
 * without hand-rolling the swap in four different places.
 */
export function yardBlock(color: ClassicColor, flip: boolean) {
  return YARD_BLOCKS[flip ? OPPOSITE_COLOR[color] : color];
}
export function homeColumnCells(color: ClassicColor, flip: boolean) {
  return HOME_COLUMN_CELLS[flip ? OPPOSITE_COLOR[color] : color];
}
export function yardRestSpots(color: ClassicColor, flip: boolean) {
  return YARD_REST_SPOTS[flip ? OPPOSITE_COLOR[color] : color];
}
export function finishCell(color: ClassicColor, flip: boolean) {
  return FINISH_CELL[flip ? OPPOSITE_COLOR[color] : color];
}

/**
 * A shared-track square's position exactly half way around the 52-square
 * ring — the physical point a 180° turn moves it to. Entry squares (13
 * apart) map onto entry squares this way, which is what keeps a flipped
 * seat's launch point lined up with its (also flipped) yard.
 */
export function flipTrackSquare(square: number): number {
  return (square + TRACK_LENGTH / 2) % TRACK_LENGTH;
}
