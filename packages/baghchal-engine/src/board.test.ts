import {
  LINES,
  areAdjacent,
  hasDiagonals,
  jumpTarget,
  neighbours,
  nodeAt,
  nodeName,
  pointOf,
} from './board';

describe('board graph', () => {
  it('numbers points row by row', () => {
    expect(pointOf(0)).toEqual({ row: 0, col: 0 });
    expect(pointOf(7)).toEqual({ row: 1, col: 2 });
    expect(nodeAt(4, 4)).toBe(24);
    expect(nodeAt(5, 0)).toBeNull();
    expect(nodeAt(0, -1)).toBeNull();
    expect(() => pointOf(25)).toThrow(RangeError);
  });

  it('names columns by letter and rows by number', () => {
    expect(nodeName(0)).toBe('A1');
    expect(nodeName(12)).toBe('C3');
    expect(nodeName(24)).toBe('E5');
  });

  it('runs diagonals only through points where row + column is even', () => {
    expect(hasDiagonals(0)).toBe(true);
    expect(hasDiagonals(12)).toBe(true);
    expect(hasDiagonals(1)).toBe(false);
    expect(hasDiagonals(7)).toBe(false);
  });

  it('joins each point to its neighbours along the lines', () => {
    expect([...neighbours(0)].sort((a, b) => a - b)).toEqual([1, 5, 6]);
    expect([...neighbours(1)].sort((a, b) => a - b)).toEqual([0, 2, 6]);
    expect([...neighbours(7)].sort((a, b) => a - b)).toEqual([2, 6, 8, 12]);
    expect(neighbours(12)).toHaveLength(8);
    expect(areAdjacent(1, 7)).toBe(false);
    expect(areAdjacent(0, 6)).toBe(true);
  });

  it('has 40 orthogonal and 16 diagonal segments, each listed once', () => {
    expect(LINES).toHaveLength(56);
    expect(new Set(LINES.map(([a, b]) => `${a}-${b}`)).size).toBe(56);
    expect(LINES.every(([a, b]) => a < b)).toBe(true);
  });

  it('finds where a jump lands', () => {
    expect(jumpTarget(0, 1)).toBe(2);
    expect(jumpTarget(0, 6)).toBe(12);
    expect(jumpTarget(2, 1)).toBe(0);
    // No diagonal line through 1, so no diagonal jump from it.
    expect(jumpTarget(1, 7)).toBeNull();
    // The line ends at the edge.
    expect(jumpTarget(1, 0)).toBeNull();
    expect(jumpTarget(0, 12)).toBeNull();
  });
});
