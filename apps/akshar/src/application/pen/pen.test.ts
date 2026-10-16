import { chaikin, penOutline, penSpine, penWidths, thin, type PenStyle } from './pen';

const ROUND: PenStyle = { width: 12, nib: 'round' };
const line = (n: number, step: number, dt: number, dir: [number, number] = [1, 0]) =>
  Array.from({ length: n }, (_, i) => ({ x: i * step * dir[0], y: i * step * dir[1], t: i * dt }));

describe('pen', () => {
  it('drops samples that barely moved', () => {
    expect(
      thin([
        { x: 0, y: 0, t: 0 },
        { x: 0.3, y: 0, t: 4 },
        { x: 3, y: 0, t: 8 },
      ]),
    ).toHaveLength(2);
  });

  it('a slow line pools wider than a quick one', () => {
    const slow = penWidths(line(30, 3, 40), ROUND);
    const fast = penWidths(line(30, 3, 1), ROUND);
    expect(slow[15]!).toBeGreaterThan(fast[15]! * 1.4);
  });

  it('settles in and eases off at the ends', () => {
    const w = penWidths(line(30, 3, 20), ROUND);
    expect(w[0]!).toBeLessThan(w[15]!);
    expect(w[29]!).toBeLessThan(w[15]!);
  });

  it('a broad nib is thin along its edge and wide across it', () => {
    const broad: PenStyle = { width: 12, nib: 'broad' };
    const along = Math.cos((-35 * Math.PI) / 180);
    const across = Math.sin((-35 * Math.PI) / 180);
    const thinW = penWidths(line(20, 3, 20, [along, across]), broad)[10]!;
    const wideW = penWidths(line(20, 3, 20, [-across, along]), broad)[10]!;
    expect(wideW).toBeGreaterThan(thinW * 2.5);
  });

  it('chalk keeps one width', () => {
    const w = penWidths(line(20, 3, 5), { width: 10, nib: 'chalk' });
    expect(w[8]).toBeCloseTo(w[12]!);
  });

  it('smooths corners but keeps both ends', () => {
    const pts = [
      { x: 0, y: 0, w: 1 },
      { x: 10, y: 0, w: 1 },
      { x: 10, y: 10, w: 1 },
    ];
    const out = chaikin(pts, 1);
    expect(out[0]).toEqual(pts[0]);
    expect(out[out.length - 1]).toEqual(pts[2]);
    expect(out.some((p) => p.x === 10 && p.y === 0)).toBe(false);
  });

  it('outlines a stroke as one closed polygon with round ends', () => {
    const samples = line(10, 5, 20);
    const poly = penOutline(samples, ROUND);
    const spine = penSpine(samples, ROUND);
    // Two sides plus two caps of five points each.
    expect(poly.length).toBe((spine.length * 2 + 10) * 2);
    const xs = poly.filter((_, i) => i % 2 === 0);
    expect(Math.min(...xs)).toBeLessThan(0);
    expect(Math.max(...xs)).toBeGreaterThan(45);
  });

  it('a touch is a round dot; nothing is nothing', () => {
    expect(penOutline([{ x: 5, y: 5, t: 0 }], ROUND)).toHaveLength(40);
    expect(penOutline([], ROUND)).toEqual([]);
  });
});
