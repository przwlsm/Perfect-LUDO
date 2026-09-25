import { ALL_PLAYER_COLORS, type PlayerColor } from '@/domain';

/** Reserve a perimeter for accessible dice, independently of the board's cell scale. */
export function tableLayout(width: number, height: number, count = 4) {
  const size = Math.max(1, Math.min(width - 8, height - 8, 920));
  const control = size >= 500 ? 60 : 48;
  const inset = count > 4 ? Math.ceil(control * 0.72) + 4 : control + 4;
  return { size, control, inset, board: Math.max(1, size - inset * 2) };
}

/**
 * A 2-player table keeps the dice out of the board's way, on whichever axis
 * the screen has room to spare: above and below in portrait (where height
 * is plentiful), left and right in landscape (where it is not). Either way
 * the board itself grows to fill the axis that used to be spent on dice
 * margins, instead of the old inset-on-every-side layout that shrank it.
 */
export function twoPlayerLayout(width: number, height: number) {
  const control = Math.max(width, height) >= 500 ? 60 : 48;
  const gap = 10;
  const side = width > height;
  const boardSize = Math.max(
    1,
    Math.min(
      side ? width - control * 2 - gap * 2 - 16 : width - 16,
      side ? height - 16 : height - control * 2 - gap * 2,
      880,
    ),
  );
  return { board: boardSize, control, gap, side };
}

export function seatPlacement(
  color: PlayerColor,
  count: number,
  layout: ReturnType<typeof tableLayout>,
) {
  const { size, board, control, inset } = layout;
  if (count > 4) {
    const angle = -Math.PI / 2 + ((ALL_PLAYER_COLORS.indexOf(color) + 0.5) * Math.PI * 2) / count;
    const radius = board / 2 + 3;
    return {
      x: size / 2 + Math.cos(angle) * radius,
      y: size / 2 + Math.sin(angle) * radius,
      rotation: (angle * 180) / Math.PI - 90,
    };
  }
  const near = inset + board * 0.2,
    far = inset + board * 0.8;
  const edge = control / 2 + 2;
  const seats = {
    RED: { x: edge, y: near, rotation: 90 },
    GREEN: { x: far, y: edge, rotation: 180 },
    YELLOW: { x: size - edge, y: far, rotation: -90 },
    BLUE: { x: near, y: size - edge, rotation: 0 },
  };
  return seats[color as keyof typeof seats];
}
