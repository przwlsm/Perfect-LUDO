import { edgeBetween, gridOf, hEdge, vEdge } from '@/application/engine/grid';
import { clampPan, dotXY, edgeMid, fitBoard, nearestDot, nearestEdge, walkDots } from './geometry';

describe('board geometry', () => {
  const geom = fitBoard(5, 5, 400, 600);
  const grid = gridOf(5, 5);

  it('fits the board inside its area, centred, with a margin of floor', () => {
    expect(geom.floor.x).toBeGreaterThanOrEqual(0);
    expect(geom.floor.x + geom.floor.w).toBeLessThanOrEqual(400);
    expect(geom.floor.y + geom.floor.h).toBeLessThanOrEqual(600);
    expect(geom.bx + (geom.cols * geom.cell) / 2).toBeCloseTo(200);
    expect(geom.by + (geom.rows * geom.cell) / 2).toBeCloseTo(300);
    // Small boards do not blow up past a comfortable size.
    expect(fitBoard(3, 3, 1000, 1000).cell).toBeLessThanOrEqual(76);
  });

  it('finds the side under a finger anywhere near it', () => {
    for (const e of [hEdge(grid, 0, 0), hEdge(grid, 3, 2), vEdge(grid, 1, 5), vEdge(grid, 4, 0)]) {
      const { x, y } = edgeMid(geom, grid, e);
      expect(nearestEdge(geom, x, y)).toBe(e);
      // A generous hit area: a third of a cell off still lands on the same side.
      const horizontal = e < grid.horizontalCount;
      const off = geom.cell * 0.3;
      expect(nearestEdge(geom, x + (horizontal ? off : 0), y + (horizontal ? 0 : off))).toBe(e);
    }
    // In the middle of a square, the nearest of its four sides wins; far outside, none.
    expect(nearestEdge(geom, geom.bx - geom.cell * 2, geom.by)).toBe(-1);
  });

  it('snaps to dots only when the finger is close to one', () => {
    const d = 7;
    const { x, y } = dotXY(geom, grid, d);
    expect(nearestDot(geom, x + 2, y - 3)).toBe(d);
    expect(nearestDot(geom, x + geom.cell / 2, y + geom.cell / 2)).toBe(-1);
  });

  it('walks a fast drag dot by dot, so no side is skipped', () => {
    const w = 6;
    const path = walkDots(5, 0, 2 * w + 3);
    expect(path[path.length - 1]).toBe(2 * w + 3);
    expect(path).toHaveLength(5);
    let prev = 0;
    for (const d of path) {
      expect(edgeBetween(grid, prev, d)).toBeGreaterThanOrEqual(0);
      prev = d;
    }
  });

  it('keeps a zoomed board on screen', () => {
    const big = fitBoard(10, 10, 400, 600);
    const far = clampPan(big, 2, 5000, -5000);
    expect(far.tx).toBeLessThanOrEqual(-big.floor.x * 2);
    expect(far.ty).toBeGreaterThanOrEqual(big.height - (big.floor.y + big.floor.h) * 2);
  });
});
