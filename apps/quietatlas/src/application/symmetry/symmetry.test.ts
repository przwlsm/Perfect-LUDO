import { applySlice, midpointCurve, slices } from './symmetry';

describe('symmetry', () => {
  it('makes one slice per fold, doubled with mirroring', () => {
    expect(slices(8, false)).toHaveLength(8);
    expect(slices(8, true)).toHaveLength(16);
  });

  it('rotates a point all the way round the centre', () => {
    const points = slices(4, false).map((s) => applySlice(s, 10, 0, 0, 0));
    expect(points[0]!.x).toBeCloseTo(10);
    expect(points[1]!.y).toBeCloseTo(10);
    expect(points[2]!.x).toBeCloseTo(-10);
    expect(points[3]!.y).toBeCloseTo(-10);
  });

  it('a mirrored slice reflects across the vertical axis first', () => {
    const [, mirrored] = slices(1, true);
    const p = applySlice(mirrored!, 13, 7, 10, 5);
    expect(p.x).toBeCloseTo(7);
    expect(p.y).toBeCloseTo(7);
  });

  it('smooths samples into curves through their midpoints', () => {
    const curve = midpointCurve([0, 0, 10, 0, 20, 10, 30, 10])!;
    expect(curve.start).toEqual([0, 0]);
    expect(curve.quads[0]).toEqual([10, 0, 15, 5]);
    expect(curve.quads.at(-1)).toEqual([30, 10, 30, 10]);
    expect(midpointCurve([])).toBeNull();
  });
});
