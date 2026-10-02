import type { PlayerColor } from '@/domain';
import { yardBlock } from './boardLayout';

/**
 * Where everything goes on the game table: the board as large as the screen
 * allows, and one player panel per seat parked beside that seat's own home
 * corner — above and below the board in portrait, left and right of it in
 * landscape. Nothing overlaps the board, so no board space is spent on
 * margins for dice.
 *
 * `before` is the top row (portrait) or left column (landscape); `after` is
 * the bottom row or right column. A `null` entry is an empty corner (e.g. a
 * 2-player game on the 4-corner board) kept so the others stay beside their
 * own yard instead of sliding toward the middle.
 */
export interface TableArrangement {
  readonly orientation: 'portrait' | 'landscape';
  readonly board: number;
  readonly panel: { readonly width: number; readonly height: number };
  readonly gap: number;
  readonly before: readonly (PlayerColor | null)[];
  readonly after: readonly (PlayerColor | null)[];
}

const GAP = 8;
const EDGE = 12;
const EPSILON = 1e-6;

/** Screen direction from the board centre to a seat's yard, as unit x/y. */
function yardDirection(color: PlayerColor, flip: boolean): { x: number; y: number } {
  const block = yardBlock(color as Parameters<typeof yardBlock>[0], flip);
  return { x: block.col === 0 ? -1 : 1, y: block.row === 0 ? -1 : 1 };
}

export function tableArrangement(
  width: number,
  height: number,
  colors: readonly PlayerColor[],
  flip = false,
): TableArrangement {
  const count = colors.length;
  const landscape = width > height;
  if (count > 4) {
    // The round board has one shared dice in its centre and each name on its
    // rim, so nothing sits beside it: the board takes the whole short side.
    return {
      orientation: landscape ? 'landscape' : 'portrait',
      board: Math.max(1, Math.min(width - EDGE, height - EDGE, 900)),
      panel: { width: 0, height: 0 },
      gap: GAP,
      before: [],
      after: [],
    };
  }
  const directions = colors.map((color) => ({ color, ...yardDirection(color, flip) }));

  // Split seats onto the two sides of the board facing their yard.
  const onBeforeSide = (d: { x: number; y: number }) =>
    landscape
      ? d.x < -EPSILON || (Math.abs(d.x) <= EPSILON && d.y < 0)
      : d.y < -EPSILON || (Math.abs(d.y) <= EPSILON && d.x < 0);
  const along = (d: { x: number; y: number }) => (landscape ? d.y : d.x);

  // Four fixed corners; empty ones stay as gaps.
  const at = (sideBefore: boolean, first: boolean) =>
    directions.find((d) => onBeforeSide(d) === sideBefore && along(d) < 0 === first)?.color ?? null;
  const before = [at(true, true), at(true, false)];
  const after = [at(false, true), at(false, false)];

  const perSide = Math.max(before.length, after.length, 1);
  const short = Math.min(width, height);
  let panelHeight = Math.round(Math.min(84, Math.max(56, short * 0.17)));

  if (!landscape) {
    const board = Math.max(1, Math.min(width - EDGE, height - 2 * (panelHeight + GAP) - EDGE, 900));
    const panelWidth = Math.min(panelHeight * 2.6, (board - (perSide - 1) * GAP) / perSide);
    return {
      orientation: 'portrait',
      board,
      panel: { width: Math.floor(panelWidth), height: panelHeight },
      gap: GAP,
      before,
      after,
    };
  }

  // Landscape: panels stack in a column each side, so they must also fit the height.
  panelHeight = Math.min(panelHeight, Math.floor((height - EDGE - (perSide - 1) * GAP) / perSide));
  const panelWidth = Math.round(panelHeight * 2.7);
  const board = Math.max(1, Math.min(height - EDGE, width - 2 * (panelWidth + GAP) - EDGE, 900));
  return {
    orientation: 'landscape',
    board,
    panel: { width: panelWidth, height: panelHeight },
    gap: GAP,
    before,
    after,
  };
}
