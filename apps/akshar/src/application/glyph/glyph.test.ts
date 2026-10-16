import { analyseGlyph } from './centreline';
import {
  boundsOf,
  CLOSE,
  CONIC,
  CUBIC,
  fitToBox,
  flatten,
  LINE,
  makeContains,
  MOVE,
  QUAD,
  toSvg,
  transformCmds,
  type Cmd,
} from './path';

/** A square with a square hole, the hole wound the other way (like a font counter). */
const ring: Cmd[] = [
  [MOVE, 0, 0],
  [LINE, 100, 0],
  [LINE, 100, 100],
  [LINE, 0, 100],
  [CLOSE],
  [MOVE, 30, 30],
  [LINE, 30, 70],
  [LINE, 70, 70],
  [LINE, 70, 30],
  [CLOSE],
];

/** A horizontal bar 200 long and 20 thick. */
const bar: Cmd[] = [[MOVE, 0, 40], [LINE, 200, 40], [LINE, 200, 60], [LINE, 0, 60], [CLOSE]];

describe('glyph paths', () => {
  it('flattens lines and curves into polygons', () => {
    const polys = flatten([
      [MOVE, 0, 0],
      [QUAD, 50, 100, 100, 0],
      [CUBIC, 100, 50, 0, 50, 0, 0],
      [CONIC, 10, 10, 20, 0, 0.7],
      [CLOSE],
    ]);
    expect(polys).toHaveLength(1);
    const b = boundsOf(polys);
    expect(b.height).toBeGreaterThan(40);
    expect(b.height).toBeLessThanOrEqual(50.01);
  });

  it('uses the non-zero rule, so counters are holes', () => {
    const inside = makeContains(flatten(ring));
    expect(inside(10, 10)).toBe(true);
    expect(inside(50, 50)).toBe(false);
    expect(inside(150, 50)).toBe(false);
    expect(inside(90, 90)).toBe(true);
  });

  it('fits a glyph centred in the box, without over-magnifying tiny marks', () => {
    const fit = fitToBox({ x: 10, y: 20, width: 50, height: 100 }, 200, 0.5);
    expect(fit.scale).toBe(1);
    expect(fit.dx + 10 * fit.scale + 25).toBeCloseTo(100);
    expect(fit.dy + 20 * fit.scale + 50).toBeCloseTo(100);
    expect(fitToBox({ x: 0, y: 0, width: 2, height: 2 }, 200, 0.7, 5).scale).toBe(5);
  });

  it('transforms and exports SVG path data', () => {
    const moved = transformCmds(bar, 2, 10, 0);
    expect(moved[1]).toEqual([LINE, 410, 80]);
    expect(toSvg(bar)).toBe('M0 40L200 40L200 60L0 60Z');
    const conic = transformCmds([[CONIC, 1, 1, 2, 2, 0.5]], 2, 0, 0);
    expect(conic[0]![5]).toBe(0.5);
  });
});

describe('centre line', () => {
  it('finds dots down the middle of a stroke and its half-width', () => {
    const contains = makeContains(flatten(bar));
    const shape = analyseGlyph(contains, { x: 0, y: 0, width: 200, height: 100 }, 2);
    expect(shape.halfWidth).toBeGreaterThan(7);
    expect(shape.halfWidth).toBeLessThan(13);
    expect(shape.dots.length).toBeGreaterThan(8);
    for (const d of shape.dots) expect(Math.abs(d.y - 50)).toBeLessThanOrEqual(3);
    // Dots run the length of the bar.
    const xs = shape.dots.map((d) => d.x);
    expect(Math.min(...xs)).toBeLessThan(30);
    expect(Math.max(...xs)).toBeGreaterThan(170);
    expect(shape.inside.length).toBeGreaterThan(900);
  });

  it('an empty glyph has nothing to trace', () => {
    const shape = analyseGlyph(() => false, { x: 0, y: 0, width: 50, height: 50 }, 5);
    expect(shape.inside).toEqual([]);
    expect(shape.dots).toEqual([]);
  });
});
