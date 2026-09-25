import { ALL_PLAYER_COLORS } from '@/domain';
import { seatPlacement, tableLayout, twoPlayerLayout } from './tableLayout';

describe.each([2, 3, 4, 5, 6])('responsive table for %i players', (count) => {
  it.each([
    [320, 620],
    [390, 720],
    [844, 280],
    [768, 900],
    [1024, 640],
    [1440, 760],
  ])('keeps rotated dice visible and separated at %i x %i', (width, height) => {
    const layout = tableLayout(width, height, count);
    const colors =
      count === 2
        ? [ALL_PLAYER_COLORS[0], ALL_PLAYER_COLORS[2]]
        : ALL_PLAYER_COLORS.slice(0, count);
    const seats = colors.map((color) => seatPlacement(color, count, layout));
    expect(layout.size).toBeLessThanOrEqual(Math.min(width, height));
    expect(layout.board).toBeGreaterThan(160);
    expect(layout.control).toBeGreaterThanOrEqual(44);
    seats.forEach((seat, index) => {
      const angle = (seat.rotation * Math.PI) / 180;
      const extent = (layout.control / 2) * (Math.abs(Math.cos(angle)) + Math.abs(Math.sin(angle)));
      expect(seat.x - extent).toBeGreaterThanOrEqual(0);
      expect(seat.y - extent).toBeGreaterThanOrEqual(0);
      expect(seat.x + extent).toBeLessThanOrEqual(layout.size);
      expect(seat.y + extent).toBeLessThanOrEqual(layout.size);
      seats.slice(index + 1).forEach((other) => {
        expect(Math.hypot(other.x - seat.x, other.y - seat.y)).toBeGreaterThan(
          layout.control * Math.SQRT2,
        );
      });
    });
  });
});

describe.each([
  [320, 620],
  [390, 720],
  [844, 280],
  [768, 900],
  [1024, 640],
  [1612, 500],
])('two-player table at %i x %i', (width, height) => {
  it('puts the dice on the axis with room to spare and grows the board on the other', () => {
    const overlay = tableLayout(width, height, 2);
    const layout = twoPlayerLayout(width, height);
    expect(layout.control).toBeGreaterThanOrEqual(44);
    expect(layout.side).toBe(width > height);
    const diceSpan = layout.control * 2 + layout.gap * 2;
    if (layout.side) {
      // Landscape: a dice column either side still fits the width, and the
      // board takes (nearly) the full height instead of losing it to dice rows.
      expect(layout.board + diceSpan).toBeLessThanOrEqual(width + 1);
      expect(layout.board).toBeLessThanOrEqual(height);
      expect(layout.board).toBeGreaterThanOrEqual(Math.min(height - 16, 880));
    } else {
      // Portrait: a dice row above and below still fits the height.
      expect(layout.board + diceSpan).toBeLessThanOrEqual(height + 1);
      expect(layout.board).toBeLessThanOrEqual(width);
    }
    // The whole point: no dice margins on the tight axis means more board
    // than the old inset-on-every-side layout could give the same screen.
    expect(layout.board).toBeGreaterThan(overlay.board);
  });
});
