import { ALL_PLAYER_COLORS, getFinishProgress } from '@/domain';
import {
  radialTrack,
  radialPieceCell,
  RADIAL_GRID,
  radialHome,
  radialHomeTriangle,
} from './radialLayout';
describe.each([5, 6])('%i-arm board geometry', (count) => {
  it('has a continuous closed route and distinct visible cells', () => {
    const track = radialTrack(count);
    expect(track).toHaveLength(count * 13);
    expect(new Set(track.map((cell) => cell.map((n) => n.toFixed(5)).join(','))).size).toBe(
      track.length,
    );
    track.forEach(([r, c], index) => {
      const [nextR, nextC] = track[(index + 1) % track.length]!;
      expect(Math.hypot(r - nextR, c - nextC)).toBeLessThan(2.2);
      expect(Math.min(r, c)).toBeGreaterThan(0);
      expect(Math.max(r, c)).toBeLessThan(RADIAL_GRID - 1);
    });
  });
  it('keeps every yard coin separate and connects the track to the correct home lane', () => {
    const yards: string[] = [];
    ALL_PLAYER_COLORS.slice(0, count).forEach((color) => {
      for (let slot = 0; slot < 4; slot++) {
        const cell = radialPieceCell({ id: `${color}-${slot}`, color, progress: 0 }, slot, count);
        yards.push(cell.join(','));
      }
      const [r, c] = radialPieceCell({ id: color, color, progress: count * 13 - 1 }, 0, count);
      const [hr, hc] = radialHome(color, count)[0]!;
      expect(Math.hypot(r - hr, c - hc)).toBeCloseTo(1);
      expect(
        radialPieceCell({ id: color, color, progress: getFinishProgress(count) }, 0, count).every(
          Number.isFinite,
        ),
      ).toBe(true);
    });
    expect(new Set(yards).size).toBe(count * 4);
  });
});

describe.each([5, 6])('%i-player triangle homes', (count) => {
  const colors = ALL_PLAYER_COLORS.slice(0, count);
  // Signed area test: is point p on the inside of every edge of triangle t?
  const cross = (a: readonly number[], b: readonly number[], p: readonly number[]) =>
    (b[1]! - a[1]!) * (p[0]! - a[0]!) - (b[0]! - a[0]!) * (p[1]! - a[1]!);
  const inside = (t: ReturnType<typeof radialHomeTriangle>, p: readonly number[]) => {
    const d = [cross(t.apex, t.left, p), cross(t.left, t.right, p), cross(t.right, t.apex, p)];
    return d.every((v) => v >= 0) || d.every((v) => v <= 0);
  };

  it.each(colors)('keeps every track and home-lane cell out of %s', (color) => {
    const t = radialHomeTriangle(color, count);
    const cells = [...radialTrack(count), ...colors.flatMap((c) => radialHome(c, count))];
    for (const cell of cells) expect(inside(t, cell)).toBe(false);
  });

  it.each(colors)('holds all four %s coins waiting at home', (color) => {
    const t = radialHomeTriangle(color, count);
    for (let slot = 0; slot < 4; slot++)
      expect(
        inside(t, radialPieceCell({ id: `${color}-${slot}`, color, progress: 0 }, slot, count)),
      ).toBe(true);
  });

  it('stays inside the round board', () => {
    for (const color of colors) {
      const t = radialHomeTriangle(color, count);
      for (const [r, c] of [t.apex, t.left, t.right])
        expect(Math.hypot(r! - 9, c! - 9)).toBeLessThanOrEqual(RADIAL_GRID / 2);
    }
  });
});
