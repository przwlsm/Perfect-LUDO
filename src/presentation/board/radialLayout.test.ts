import { ALL_PLAYER_COLORS, getFinishProgress } from '@/domain';
import { radialTrack, radialPieceCell, RADIAL_GRID, radialHome } from './radialLayout';
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
