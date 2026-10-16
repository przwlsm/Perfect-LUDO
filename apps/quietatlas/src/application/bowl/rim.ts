/**
 * A Himalayan singing bowl sings when a mallet (here, a finger) circles its
 * rim steadily. The faster and steadier the circling, the louder the hum;
 * stop, and it rings down slowly.
 */
export interface RimState {
  /** 0 silent … 1 full voice. */
  readonly level: number;
  /** The finger's last angle around the centre, radians; null when not on the rim. */
  readonly angle: number | null;
  /** Total angle travelled around the rim, radians (for ripples and stats). */
  readonly travelled: number;
}

export const SILENT_RIM: RimState = { level: 0, angle: null, travelled: 0 };

/** Angular speed (radians per second) that brings the bowl to full voice. */
const FULL_VOICE = 7;
/** Where the rim is, as fractions of the bowl's radius. */
const RIM_INNER = 0.55;
const RIM_OUTER = 1.2;
/** How quickly the voice follows the finger, per second. */
const RISE = 1.6;
/** How quickly it rings down when the finger stops or lifts, per second. */
const FALL = 0.35;

/**
 * Advances the bowl by `dt` seconds with the finger at (x, y) relative to
 * the bowl's centre (null when lifted).
 */
export function rub(
  s: RimState,
  finger: { x: number; y: number } | null,
  radius: number,
  dt: number,
): RimState {
  if (dt <= 0) return s;
  const onRim =
    finger !== null &&
    Math.hypot(finger.x, finger.y) >= radius * RIM_INNER &&
    Math.hypot(finger.x, finger.y) <= radius * RIM_OUTER;
  if (!onRim || !finger) {
    return {
      level: Math.max(0, s.level - FALL * dt * (0.4 + s.level)),
      angle: null,
      travelled: s.travelled,
    };
  }
  const angle = Math.atan2(finger.y, finger.x);
  if (s.angle === null) return { ...s, angle };
  let delta = angle - s.angle;
  // Take the short way round across the ±π seam.
  if (delta > Math.PI) delta -= Math.PI * 2;
  if (delta < -Math.PI) delta += Math.PI * 2;
  const target = Math.min(1, Math.abs(delta) / dt / FULL_VOICE);
  const level =
    target > s.level
      ? Math.min(target, s.level + RISE * dt * (target - s.level + 0.15))
      : Math.max(target, s.level - FALL * dt);
  return { level, angle, travelled: s.travelled + Math.abs(delta) };
}
