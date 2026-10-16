/**
 * Orthographic projection: the globe as seen from far away. `centerLon` is
 * the longitude facing the viewer (radians) and `tilt` the latitude at the
 * centre of the disc, so the northern hemisphere leans toward the viewer.
 * Worklets, so the globe spins on the UI thread.
 */
export interface Projected {
  /** -1..1 across the disc, +x right, +y up. */
  readonly x: number;
  readonly y: number;
  /** cos of the angle from the disc centre: 1 facing the viewer, ≤0 on the far side. */
  readonly depth: number;
}

const RAD = Math.PI / 180;

export function project(
  latDeg: number,
  lonDeg: number,
  centerLon: number,
  tilt: number,
): Projected {
  'worklet';
  const lat = latDeg * RAD;
  const dLon = lonDeg * RAD - centerLon;
  const cosLat = Math.cos(lat);
  const sinLat = Math.sin(lat);
  const cosT = Math.cos(tilt);
  const sinT = Math.sin(tilt);
  const cosD = Math.cos(dLon);
  return {
    x: cosLat * Math.sin(dLon),
    y: cosT * sinLat - sinT * cosLat * cosD,
    depth: sinT * sinLat + cosT * cosLat * cosD,
  };
}

/** The centre longitude (radians) that brings `lonDeg` to the front, nearest to `from`. */
export function facing(lonDeg: number, from: number): number {
  'worklet';
  const target = lonDeg * RAD;
  const twoPi = Math.PI * 2;
  let delta = (target - from) % twoPi;
  if (delta > Math.PI) delta -= twoPi;
  if (delta < -Math.PI) delta += twoPi;
  return from + delta;
}

/** The tilt that shows a place's latitude near the middle, kept gentle. */
export function tiltFor(latDeg: number): number {
  'worklet';
  return Math.max(-0.5, Math.min(0.6, latDeg * RAD * 0.8));
}
