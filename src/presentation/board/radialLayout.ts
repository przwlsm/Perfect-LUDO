import {
  ALL_PLAYER_COLORS,
  getBoardPosition,
  getFinishProgress,
  type Piece,
  type PlayerColor,
} from '@/domain';
import type { Cell } from './boardLayout';
export const RADIAL_GRID = 19;
/** Each arm has thirteen track cells, a five-cell home lane and a four-piece yard. */
export function radialPoint(seat: number, count: number, radius: number, side = 0): Cell {
  const angle = -Math.PI / 2 + (seat * Math.PI * 2) / count;
  return [
    9 + Math.sin(angle) * radius + Math.cos(angle) * side,
    9 + Math.cos(angle) * radius - Math.sin(angle) * side,
  ];
}
export function radialTrack(count: number): readonly Cell[] {
  return Array.from({ length: count }, (_, seat) => [
    ...[7, 6, 5, 4, 3].map((r) => radialPoint(seat, count, r, 1)),
    ...[3, 4, 5, 6, 7, 8].map((r) => radialPoint((seat + 1) % count, count, r, -1)),
    radialPoint((seat + 1) % count, count, 8),
    radialPoint((seat + 1) % count, count, 8, 1),
  ]).flat();
}
export function radialHome(color: PlayerColor, count: number): readonly Cell[] {
  const seat = ALL_PLAYER_COLORS.indexOf(color);
  return [7, 6, 5, 4, 3].map((r) => radialPoint(seat, count, r));
}
export function radialYard(color: PlayerColor, count: number): Cell {
  return radialPoint(ALL_PLAYER_COLORS.indexOf(color) + 0.5, count, 6.3);
}
export function radialPieceCell(piece: Piece, slot: number, count: number): Cell {
  const seat = ALL_PLAYER_COLORS.indexOf(piece.color);
  if (piece.progress === 0) {
    const [r, c] = radialYard(piece.color, count);
    return [r + (Math.floor(slot / 2) - 0.5) * 1.35, c + ((slot % 2) - 0.5) * 1.35];
  }
  if (piece.progress === getFinishProgress(count)) {
    const [r, c] = radialPoint(seat, count, 1.4);
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
  // Where the two arms' facing edges would meet, plus a little room.
  const apexRadius = ARM_HALF_WIDTH / Math.sin(Math.PI / count) + 0.15;
  return {
    apex: radialPoint(seat + 0.5, count, apexRadius),
    left: radialPoint(seat, count, 8.5, ARM_HALF_WIDTH),
    right: radialPoint(seat + 1, count, 8.5, -ARM_HALF_WIDTH),
  };
}
