import { DEFAULT_BRUSH, DRY_MS, outline, thin, WET_MS, wetness, widths } from './brush';

const line = (n: number, step: number, dt: number) =>
  Array.from({ length: n }, (_, i) => ({ x: i * step, y: 0, t: i * dt }));

describe('brush', () => {
  it('drops samples that barely moved', () => {
    expect(
      thin([
        { x: 0, y: 0, t: 0 },
        { x: 0.5, y: 0, t: 5 },
        { x: 3, y: 0, t: 10 },
      ]),
    ).toHaveLength(2);
  });

  it('a slow stroke is wider than a fast one', () => {
    const slow = widths(line(40, 3, 30));
    const fast = widths(line(40, 3, 1));
    expect(slow[20]!).toBeGreaterThan(fast[20]! * 2);
  });

  it('tapers at both ends', () => {
    const w = widths(line(40, 3, 30));
    expect(w[0]!).toBeLessThan(w[20]!);
    expect(w[39]!).toBeLessThan(w[20]!);
  });

  it('stays within the brush limits', () => {
    for (const w of widths(line(60, 4, 10))) {
      expect(w).toBeLessThanOrEqual(DEFAULT_BRUSH.maxWidth);
      expect(w).toBeGreaterThanOrEqual(1);
    }
  });

  it('outlines a stroke as one closed polygon around it', () => {
    const o = outline(line(10, 5, 20));
    expect(o.length).toBe(10 * 2 * 2);
    const ys = o.filter((_, i) => i % 2 === 1);
    expect(Math.max(...ys)).toBeGreaterThan(0);
    expect(Math.min(...ys)).toBeLessThan(0);
  });

  it('a tap is a small round dab', () => {
    expect(outline([{ x: 5, y: 5, t: 0 }])).toHaveLength(32);
    expect(outline([])).toEqual([]);
  });

  it('dries slowly and then is gone', () => {
    expect(wetness(0)).toBe(1);
    expect(wetness(WET_MS)).toBe(1);
    const mid = wetness((WET_MS + DRY_MS) / 2);
    expect(mid).toBeGreaterThan(0.3);
    expect(mid).toBeLessThan(0.7);
    expect(wetness(DRY_MS)).toBe(0);
  });
});
