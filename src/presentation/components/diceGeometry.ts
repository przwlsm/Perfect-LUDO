import type { ViewStyle } from 'react-native';
import type { DieValue } from '@/domain';

/** Reanimated infers a narrower, exact-literal type from a raw array here
 * than `ViewStyle['transform']` actually requires; naming the return type
 * explicitly is what lets `useAnimatedStyle` accept it. Excludes the CSS
 * string form of `transform` — this always returns the array form. */
type Transform = Extract<NonNullable<ViewStyle['transform']>, readonly unknown[]>;
export type Vec3 = readonly [number, number, number];
export const PIPS: Record<DieValue, readonly (readonly [number, number])[]> = {
  1: [[1, 1]],
  2: [
    [0, 0],
    [2, 2],
  ],
  3: [
    [0, 0],
    [1, 1],
    [2, 2],
  ],
  4: [
    [0, 0],
    [0, 2],
    [2, 0],
    [2, 2],
  ],
  5: [
    [0, 0],
    [0, 2],
    [1, 1],
    [2, 0],
    [2, 2],
  ],
  6: [
    [0, 0],
    [0, 2],
    [1, 0],
    [1, 2],
    [2, 0],
    [2, 2],
  ],
};
// Face centers. Opposing faces sum to seven.
export const FACES: readonly { value: DieValue; normal: Vec3 }[] = [
  { value: 1, normal: [0, 0, 1] },
  { value: 6, normal: [0, 0, -1] },
  { value: 3, normal: [1, 0, 0] },
  { value: 4, normal: [-1, 0, 0] },
  { value: 2, normal: [0, -1, 0] },
  { value: 5, normal: [0, 1, 0] },
];

/**
 * Where each face sits on the cube before it is shown or animated: the exact
 * inverse of the "bring this value to the front" rotation below, since that
 * rotation is defined as whatever undoes a face's resting placement. Every
 * face needs at most one axis, because two faces (1, and whichever six sits
 * opposite) never need to move to begin with.
 */
const FACE_PLACEMENT: Record<DieValue, { rotateX: number; rotateY: number }> = {
  1: { rotateX: 0, rotateY: 0 },
  2: { rotateX: Math.PI / 2, rotateY: 0 },
  3: { rotateX: 0, rotateY: Math.PI / 2 },
  4: { rotateX: 0, rotateY: -Math.PI / 2 },
  5: { rotateX: -Math.PI / 2, rotateY: 0 },
  6: { rotateX: 0, rotateY: Math.PI },
};

/** Rotates a point by an X-axis turn, then a Y-axis turn. */
export function orient(point: Vec3, value: DieValue, spin: number, tilt = 1): Vec3 {
  'worklet';
  const ax = value === 2 ? -Math.PI / 2 : value === 5 ? Math.PI / 2 : 0;
  const ay = value === 3 ? -Math.PI / 2 : value === 4 ? Math.PI / 2 : value === 6 ? Math.PI : 0;
  const rotate = (p: Vec3, x: number, y: number): Vec3 => {
    const py = p[1] * Math.cos(x) - p[2] * Math.sin(x),
      pz = p[1] * Math.sin(x) + p[2] * Math.cos(x);
    return [p[0] * Math.cos(y) + pz * Math.sin(y), py, -p[0] * Math.sin(y) + pz * Math.cos(y)];
  };
  return rotate(rotate(point, ax, ay), -0.42 * tilt + spin * 2, -0.55 * tilt + spin);
}

/**
 * A cube face's screen transform, and whether/how strongly to show it.
 *
 * Built from `perspective`/`rotateX`/`rotateY`/`translateX`/`translateY`
 * rather than a single computed matrix: those are pure rotations plus a
 * screen-space translation, so React Native never has to decompose out a
 * skew component to apply them. A hand-flattened 2D projection matrix, by
 * contrast, *is* generally a skewed matrix for a tilted face — and Android
 * silently drops skew on View transforms (fixed for `skewX`/`skewY`
 * themselves, but not for skew arriving inside a raw `matrix`), which is
 * what made every face render as a stretched rectangle instead of the
 * tilted parallelogram it should be.
 *
 * There is no `translateZ` here — Reanimated's Android bridge for view
 * updates driven by a navigation transition (as opposed to its own
 * worklets) doesn't recognise it and throws ("Unsupported transform:
 * translateZ") the moment a screen transition runs while a die is mounted.
 * It also isn't needed: `n`, the face's fully-rotated world normal, already
 * gives the on-screen offset directly — exactly the translation the old
 * flattened matrix used — so the push outward is two ordinary 2D
 * translations, applied after the rotations so they land in screen space.
 */
export function projectFace(
  face: (typeof FACES)[number],
  value: DieValue,
  spin: number,
  edge: number,
  tilt = 1,
): { visible: boolean; depth: number; shade: number; transform: Transform } {
  'worklet';
  const n = orient(face.normal, value, spin, tilt);
  const ax = value === 2 ? -Math.PI / 2 : value === 5 ? Math.PI / 2 : 0;
  const ay = value === 3 ? -Math.PI / 2 : value === 4 ? Math.PI / 2 : value === 6 ? Math.PI : 0;
  const spinX = -0.42 * tilt + spin * 2;
  const spinY = -0.55 * tilt + spin;
  const placement = FACE_PLACEMENT[face.value];
  return {
    visible: n[2] > 0.001,
    depth: n[2],
    shade: Math.max(0, Math.min(0.4, 0.18 + n[0] * 0.2 + n[1] * 0.3)),
    // Read right to left: place the face on the cube, turn the whole cube to
    // show `value` at rest, apply the live roll on top of that, then shift
    // the result outward on screen by its rotated normal. React Native
    // applies the LAST entry to the view first, and `orient` above turns
    // about X before Y at each stage, so each X/Y pair is listed Y then X —
    // the two must compose identically or the visibility/shading/offset
    // computed from `n` describe a different cube than the one drawn (at rest
    // only one axis turns per stage so it happens to agree; mid-tumble it
    // hides the front face and shows two edge-on slivers instead). A fixed,
    // flat list (never a conditionally spread one) so every entry keeps the
    // plain object-literal shape the style types expect.
    transform: [
      { translateX: (n[0] * edge) / 2 },
      { translateY: (n[1] * edge) / 2 },
      { perspective: edge * 4 },
      { rotateY: `${spinY}rad` },
      { rotateX: `${spinX}rad` },
      { rotateY: `${ay}rad` },
      { rotateX: `${ax}rad` },
      { rotateY: `${placement.rotateY}rad` },
      { rotateX: `${placement.rotateX}rad` },
    ] as Transform,
  };
}
