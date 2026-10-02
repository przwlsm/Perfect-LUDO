import { radialGrid } from './radialLayout';

/**
 * The camera the 3D round table (5-8 players) is drawn with, and the maths
 * to find where a point on that board lands on screen. Board3D renders with
 * these numbers and RoundBoardOverlay places the names and the shared dice
 * with them, so both always agree exactly.
 */
export const RADIAL_FOV = 42;
/** Aimed a touch in front of centre so the tilted board sits mid-frame. */
export const CAMERA_TARGET = [0, 0, 0.9] as const;

/** How far the camera backs off for a bigger table (the grid grows with it). */
export function radialReach(count: number): number {
  return radialGrid(count) / 19;
}

export function radialCameraPosition(count: number): readonly [number, number, number] {
  const reach = radialReach(count);
  return [0, 23 * reach, 14.5 * reach];
}

/**
 * Screen position of a world point on the round table, in a square view of
 * `size` pixels. `scale` is how many screen pixels one board cell spans
 * there, relative to the flat 2D board (1 = the same as 2D).
 */
export function projectRadial(
  count: number,
  size: number,
  world: readonly [number, number, number],
): { x: number; y: number; scale: number } {
  const eye = radialCameraPosition(count);
  const forward = normalize(sub(CAMERA_TARGET, eye));
  const right = normalize(cross(forward, [0, 1, 0]));
  const up = cross(right, forward);
  const d = sub(world, eye);
  const depth = dot(d, forward);
  const half = Math.tan(((RADIAL_FOV / 2) * Math.PI) / 180);
  const x = dot(d, right) / (depth * half);
  const y = dot(d, up) / (depth * half);
  return {
    x: ((x + 1) / 2) * size,
    y: ((1 - y) / 2) * size,
    // One world unit is one cell; the flat board shows `grid` cells across.
    scale: radialGrid(count) / (2 * depth * half),
  };
}

type Vec = readonly [number, number, number];
function sub(a: Vec, b: Vec): Vec {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}
function dot(a: Vec, b: Vec): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
function cross(a: Vec, b: Vec): Vec {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function normalize(a: Vec): Vec {
  const length = Math.hypot(a[0], a[1], a[2]);
  return [a[0] / length, a[1] / length, a[2] / length];
}
