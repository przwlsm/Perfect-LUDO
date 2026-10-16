import { analyseGlyph } from '../glyph/centreline';
import { CLOSE, flatten, LINE, makeContains, MOVE, type Cmd } from '../glyph/path';
import {
  accuracy,
  alignTo,
  coverage,
  densify,
  dilate,
  scoreAttempt,
  starsFor,
  type Stroke,
} from './score';

const bar: Cmd[] = [[MOVE, 20, 90], [LINE, 180, 90], [LINE, 180, 110], [LINE, 20, 110], [CLOSE]];
const contains = makeContains(flatten(bar));
const shape = analyseGlyph(contains, { x: 0, y: 0, width: 200, height: 200 }, 2);
const glyphBounds = { x: 20, y: 90, width: 160, height: 20 };

const line = (x0: number, y0: number, x1: number, y1: number): Stroke => [
  { x: x0, y: y0 },
  { x: x1, y: y1 },
];

const score = (strokes: Stroke[], mode: 'trace' | 'memory' = 'trace') =>
  scoreAttempt({
    mode,
    contains,
    glyphBounds,
    targets: shape.inside,
    halfWidth: shape.halfWidth,
    penRadius: 6,
    strokes,
  });

describe('scoring', () => {
  it('fills gaps between far-apart touch samples', () => {
    expect(densify([line(0, 0, 10, 0)], 2)).toHaveLength(6);
    expect(densify([[]], 2)).toEqual([]);
  });

  it('measures coverage and accuracy', () => {
    const targets = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ];
    expect(coverage(targets, [{ x: 1, y: 1 }], 3)).toBe(0.5);
    expect(coverage([], [{ x: 1, y: 1 }], 3)).toBe(0);
    expect(
      accuracy(
        [
          { x: 50, y: 100 },
          { x: 50, y: 10 },
        ],
        contains,
      ),
    ).toBe(0.5);
    expect(accuracy([], contains)).toBe(0);
  });

  it('dilation forgives ink just outside the edge', () => {
    expect(contains(100, 114)).toBe(false);
    expect(dilate(contains, 6)(100, 114)).toBe(true);
    expect(dilate(contains, 6)(100, 130)).toBe(false);
  });

  it('a line down the middle covers the whole bar', () => {
    const a = score([line(20, 100, 180, 100)]);
    expect(a.coverage).toBeGreaterThan(0.95);
    expect(a.accuracy).toBe(1);
    expect(a.stars).toBe(2);
  });

  it('half the bar is one star at best', () => {
    const a = score([line(20, 100, 120, 100)]);
    expect(a.coverage).toBeGreaterThan(0.55);
    expect(a.coverage).toBeLessThan(0.75);
    expect(a.stars).toBeLessThanOrEqual(1);
  });

  it('wandering off the letter costs accuracy', () => {
    const a = score([line(20, 100, 180, 100), line(100, 100, 100, 190)]);
    expect(a.accuracy).toBeLessThan(0.8);
    expect(a.stars).toBeLessThan(2);
  });

  it('nothing written scores nothing', () => {
    const a = score([]);
    expect(a.stars).toBe(0);
    expect(a.missed).toHaveLength(shape.inside.length);
  });

  it('memory mode judges shape wherever it was written', () => {
    expect(score([line(10, 20, 90, 20)], 'trace').stars).toBe(0);
    expect(score([line(10, 20, 90, 20)], 'memory').stars).toBe(3);
  });

  it('aligns ink onto a target, keeping proportions', () => {
    const out = alignTo(
      [
        { x: 0, y: 0 },
        { x: 10, y: 5 },
      ],
      { x: 100, y: 100, width: 40, height: 40 },
    );
    expect(out[0]).toEqual({ x: 100, y: 110 });
    expect(out[1]).toEqual({ x: 140, y: 130 });
  });

  it('stars: tracing tops out at two, memory gives the third', () => {
    expect(starsFor('trace', 1, 1)).toBe(2);
    expect(starsFor('trace', 0.7, 0.7)).toBe(1);
    expect(starsFor('trace', 0.3, 1)).toBe(0);
    expect(starsFor('memory', 0.8, 0.8)).toBe(3);
    expect(starsFor('memory', 0.6, 0.6)).toBe(2);
    expect(starsFor('memory', 0.2, 0.9)).toBe(0);
  });
});
