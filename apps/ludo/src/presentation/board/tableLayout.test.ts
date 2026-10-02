import { seatColors } from '@/domain';
import { tableArrangement } from './tableLayout';

const SCREENS: readonly [number, number][] = [
  [320, 560],
  [360, 620],
  [412, 760],
  [768, 900],
  [740, 300],
  [844, 280],
  [1024, 640],
  [1440, 760],
];

describe.each([2, 3, 4, 5, 6, 7, 8])('table for %i players', (count) => {
  const colors = seatColors(count);

  it.each(SCREENS)('fits the board and every panel inside %i x %i', (width, height) => {
    const t = tableArrangement(width, height, colors);
    if (count > 4) {
      // Round board: no panels, the board takes the whole short side.
      expect([...t.before, ...t.after]).toEqual([]);
      expect(t.board).toBeLessThanOrEqual(Math.min(width, height));
      expect(t.board).toBeGreaterThanOrEqual(Math.min(width, height, 912) - 12);
      return;
    }
    const seats = [...t.before, ...t.after].filter(Boolean);
    expect(seats.sort()).toEqual([...colors].sort());
    expect(t.panel.height).toBeGreaterThanOrEqual(44);
    expect(t.board).toBeGreaterThan(150);
    const perSide = Math.max(t.before.length, t.after.length);
    if (t.orientation === 'portrait') {
      expect(height >= width).toBe(true);
      expect(t.board).toBeLessThanOrEqual(width);
      expect(t.board + 2 * (t.panel.height + t.gap)).toBeLessThanOrEqual(height);
      expect(perSide * t.panel.width + (perSide - 1) * t.gap).toBeLessThanOrEqual(t.board + 1);
    } else {
      expect(t.board).toBeLessThanOrEqual(height);
      expect(t.board + 2 * (t.panel.width + t.gap)).toBeLessThanOrEqual(width);
      expect(perSide * t.panel.height + (perSide - 1) * t.gap).toBeLessThanOrEqual(height);
    }
  });

  it('uses nearly the full width for the board in portrait', () => {
    const t = tableArrangement(360, 640, colors);
    expect(t.board).toBeGreaterThanOrEqual(360 - 12);
  });
});

describe('classic board seats each panel beside its own yard', () => {
  it('puts every colour at its corner in portrait', () => {
    const t = tableArrangement(360, 640, seatColors(4));
    expect(t.before).toEqual(['RED', 'GREEN']);
    expect(t.after).toEqual(['BLUE', 'YELLOW']);
  });
  it('moves the flipped colours to the opposite corners', () => {
    const t = tableArrangement(360, 640, seatColors(4), true);
    expect(t.before).toEqual(['YELLOW', 'BLUE']);
    expect(t.after).toEqual(['GREEN', 'RED']);
  });
  it('keeps empty corners as gaps in a 2-player game', () => {
    const t = tableArrangement(360, 640, seatColors(2), true);
    expect(t.before).toEqual(['YELLOW', null]);
    expect(t.after).toEqual([null, 'RED']);
  });
  it('uses left and right columns in landscape', () => {
    const t = tableArrangement(800, 360, seatColors(4));
    expect(t.orientation).toBe('landscape');
    expect(t.before).toEqual(['RED', 'BLUE']);
    expect(t.after).toEqual(['GREEN', 'YELLOW']);
  });
});

describe('round board (5-8 players)', () => {
  it.each([5, 6, 7, 8])(
    'gives %i players the full width in portrait, with no side panels',
    (count) => {
      const t = tableArrangement(360, 700, seatColors(count));
      expect(t.board).toBe(348);
      expect(t.before).toEqual([]);
      expect(t.after).toEqual([]);
    },
  );
});
