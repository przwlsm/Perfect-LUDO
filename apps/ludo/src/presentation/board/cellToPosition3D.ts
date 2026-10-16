import { GRID_SIZE } from './boardLayout';

/** Converts a (row, col) grid cell into 3D world coordinates centered on the origin. */
export function cellToPosition3D(
  row: number,
  col: number,
  unit = 1,
  gridSize = GRID_SIZE,
): readonly [number, number, number] {
  const CENTER = (gridSize - 1) / 2;
  return [(col - CENTER) * unit, 0, (row - CENTER) * unit];
}
