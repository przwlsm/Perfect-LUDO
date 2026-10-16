import {
  ALL_PLAYER_COLORS,
  getBoardPosition,
  getFinishProgress,
  type Piece,
  type PlayerColor,
} from '@/domain';
import type { Cell } from './boardLayout';

/**
 * The round table's geometry, in grid cells, is designed around a hub of
 * radius 3 with up to six arms. Seven and eight arms (each three cells wide)
 * cannot all meet a hub that small, so those tables push every arm outward
 * and grow the grid to match; the cells themselves stay the same size
 * relative to the grid, which is why the bigger tables look smaller on
 * screen and get pinch-to-zoom.
 */
export function radialInner(count: number): number {
  return count <= 6 ? 3 : count === 7 ? 4.2 : 4.8;
}
/** How far every designed radius moves out for this many seats. */
export function radialShift(count: number): number {
  return radialInner(count) - 3;
}
/** Cells across the (square) grid the round table is drawn in. */
export function radialGrid(count: number): number {
  return 19 + 2 * radialShift(count);
}
/** @deprecated The six-seat grid; boards must use radialGrid(count). */
export const RADIAL_GRID = 19;

/** Each arm has thirteen track cells, a five-cell home lane and a four-piece yard. */
export function radialPoint(seat: number, count: number, radius: number, side = 0): Cell {
  const angle = -Math.PI / 2 + (seat * Math.PI * 2) / count;
  const centre = (radialGrid(count) - 1) / 2;
  return [
    centre + Math.sin(angle) * radius + Math.cos(angle) * side,
    centre + Math.cos(angle) * radius - Math.sin(angle) * side,
  ];
}
export function radialTrack(count: number): readonly Cell[] {
  const d = radialShift(count);
  return Array.from({ length: count }, (_, seat) => [
    ...[7, 6, 5, 4, 3].map((r) => radialPoint(seat, count, r + d, 1)),
    ...[3, 4, 5, 6, 7, 8].map((r) => radialPoint((seat + 1) % count, count, r + d, -1)),
    radialPoint((seat + 1) % count, count, 8 + d),
    radialPoint((seat + 1) % count, count, 8 + d, 1),
  ]).flat();
}
export function radialHome(color: PlayerColor, count: number): readonly Cell[] {
  const seat = ALL_PLAYER_COLORS.indexOf(color);
  const d = radialShift(count);
  return [7, 6, 5, 4, 3].map((r) => radialPoint(seat, count, r + d));
}
export function radialYard(color: PlayerColor, count: number): Cell {
  return radialPoint(ALL_PLAYER_COLORS.indexOf(color) + 0.5, count, 6.3 + radialShift(count));
}
export function radialPieceCell(piece: Piece, slot: number, count: number): Cell {
  const seat = ALL_PLAYER_COLORS.indexOf(piece.color);
  if (piece.progress === 0) {
    const [r, c] = radialYard(piece.color, count);
    return [r + (Math.floor(slot / 2) - 0.5) * 1.35, c + ((slot % 2) - 0.5) * 1.35];
  }
  if (piece.progress === getFinishProgress(count)) {
    // The hub grows with the table, so finished coins can spread out a little more.
    const [r, c] = radialPoint(seat, count, 1.4 + radialShift(count) * 0.4);
    return [r + (Math.floor(slot / 2) - 0.5) * 0.5, c + ((slot % 2) - 0.5) * 0.5];
  }
  const position = getBoardPosition(piece.color, piece.progress, count)!;
  return position.zone === 'SHARED_TRACK'
    ? radialTrack(count)[position.square]!
    : radialHome(piece.color, count)[position.step - 1]!;
}

/** Half the width of an arm (three cells) plus a hairline gap, in cells. */
const ARM_HALF_WIDTH = 1.6;

/**
 * The triangular home between a seat's arm and the next one: its base spans
 * the two arms' outer ends and its apex points at the centre, filling the
 * wedge without touching either arm. Grid coordinates, like radialPoint.
 */
export function radialHomeTriangle(
  color: PlayerColor,
  count: number,
): { apex: Cell; left: Cell; right: Cell } {
  const seat = ALL_PLAYER_COLORS.indexOf(color);
  const d = radialShift(count);
  // Where the two arms' facing edges would meet, plus a little room.
  const apexRadius = ARM_HALF_WIDTH / Math.sin(Math.PI / count) + 0.15;
  return {
    apex: radialPoint(seat + 0.5, count, apexRadius),
    left: radialPoint(seat, count, 8.5 + d, ARM_HALF_WIDTH),
    right: radialPoint(seat + 1, count, 8.5 + d, -ARM_HALF_WIDTH),
  };
}
