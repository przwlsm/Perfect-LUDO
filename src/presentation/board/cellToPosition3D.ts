import { GRID_SIZE } from './boardLayout';

const CENTER = (GRID_SIZE - 1) / 2;

/** Converts a (row, col) grid cell into 3D world coordinates centered on the origin. */
export function cellToPosition3D(
  row: number,
  col: number,
  unit = 1,
): readonly [number, number, number] {
  return [(col - CENTER) * unit, 0, (row - CENTER) * unit];
}
