import { FACES, PIPS, orient, projectFace } from './diceGeometry';
import type { DieValue } from '@/domain';

it.each([1, 2, 3, 4, 5, 6] as DieValue[])(
  'shows only result %i after settling face-on',
  (value) => {
    const visible = FACES.filter((face) => projectFace(face, value, Math.PI * 2, 40, 0).visible);
    expect(visible.map((face) => face.value)).toEqual([value]);
  },
);

it.each([1, 2, 3, 4, 5, 6] as DieValue[])(
  'lands with %i as the main face and two visible side faces',
  (value) => {
    const faces = FACES.map((face) => ({ value: face.value, ...projectFace(face, value, 0, 40) }));
    expect(faces.filter((face) => face.visible)).toHaveLength(3);
    expect(faces.sort((a, b) => b.depth - a.depth)[0]!.value).toBe(value);
  },
);
it('uses correct pip counts and opposing faces sum to seven', () => {
  for (const face of FACES) {
    expect(PIPS[face.value]).toHaveLength(face.value);
    const opposite = FACES.find((other) => other.normal.every((n, i) => n === -face.normal[i]!))!;
    expect(face.value + opposite.value).toBe(7);
  }
});
/** Pulls the bare number out of each transform op, whether it's a plain
 * number (perspective, translateX/Y) or an angle string like `"1.2rad"`. */
function numbers(transform: readonly Record<string, unknown>[]): number[] {
  return transform.map((op) => {
    const raw = Object.values(op)[0];
    return typeof raw === 'string' ? parseFloat(raw) : (raw as number);
  });
}

it('keeps every transform value finite during a full tumble and returns to its resting pose', () => {
  for (const face of FACES) {
    for (let step = 0; step < 100; step++) {
      const p = projectFace(face, 4, (step * Math.PI) / 50, 40);
      expect(numbers(p.transform).every(Number.isFinite)).toBe(true);
      expect(Number.isFinite(p.depth)).toBe(true);
      expect(p.shade).toBeGreaterThanOrEqual(0);
    }
    // Angles differ numerically by a full turn (e.g. -0.42 vs -0.42 + 4π), so
    // compare what they actually render as rather than the raw radians.
    const rendered = (n: number) => [Math.sin(n), Math.cos(n)];
    const start = numbers(projectFace(face, 4, 0, 40).transform).flatMap(rendered);
    const after = numbers(projectFace(face, 4, Math.PI * 2, 40).transform).flatMap(rendered);
    after.forEach((n, i) => expect(n).toBeCloseTo(start[i]!));
  }
});

it('never asks React Native to skew a face — only rotate, translate in 2D and set perspective', () => {
  // Never `translateZ`: Reanimated's Android bridge for view updates driven
  // by a navigation transition doesn't recognise it and crashes the app the
  // moment a screen transition runs while a die is mounted — a real incident
  // this test exists to catch a second time. Never `matrix`/`skewX`/`skewY`
  // either: that's the Android skew bug this whole approach replaced.
  const allowedKeys = new Set(['perspective', 'rotateX', 'rotateY', 'translateX', 'translateY']);
  for (const face of FACES) {
    for (const spin of [0, 0.3, Math.PI / 2, Math.PI, 5]) {
      const p = projectFace(face, 4, spin, 40);
      for (const op of p.transform) {
        expect(Object.keys(op)).toHaveLength(1);
        expect(allowedKeys.has(Object.keys(op)[0]!)).toBe(true);
      }
    }
  }
});

/**
 * Applies a transform list to a vector the way React Native does: the list
 * is multiplied left to right, so the LAST entry acts on the view first and
 * the first entry acts last. Same rotation conventions as RN's MatrixMath.
 */
function renderedNormal(transform: readonly Record<string, unknown>[]): [number, number, number] {
  let [x, y, z] = [0, 0, 1];
  for (const op of [...transform].reverse()) {
    const [key, raw] = Object.entries(op)[0]!;
    const a = typeof raw === 'string' ? parseFloat(raw) : (raw as number);
    if (key === 'rotateX')
      [y, z] = [y * Math.cos(a) - z * Math.sin(a), y * Math.sin(a) + z * Math.cos(a)];
    if (key === 'rotateY')
      [x, z] = [x * Math.cos(a) + z * Math.sin(a), -x * Math.sin(a) + z * Math.cos(a)];
  }
  return [x, y, z];
}

it('rotates each face on screen exactly as the visibility and shading math assumes', () => {
  // The visibility test (`n[2] > 0`), the shading and the outward translation
  // all come from `orient`; the on-screen rotation comes from the transform
  // list. If the two compose their rotations in different orders they agree
  // at rest (only one axis is turning) but disagree mid-tumble, where RN then
  // draws the edge-on faces and hides the one facing the viewer — the die
  // collapses into an "L" of two slivers for most of the roll.
  for (const face of FACES) {
    for (const value of [1, 2, 3, 4, 5, 6] as DieValue[]) {
      for (const spin of [0, 0.37, 1.1, 2.4, 4.9]) {
        for (const tilt of [0, 0.5, 1]) {
          const p = projectFace(face, value, spin, 40, tilt);
          const n = orient(face.normal, value, spin, tilt);
          const drawn = renderedNormal(p.transform);
          drawn.forEach((c, i) => expect(c).toBeCloseTo(n[i]!, 6));
          expect(p.visible).toBe(drawn[2] > 0.001);
        }
      }
    }
  }
});
