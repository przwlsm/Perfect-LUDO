import { ALL_PLAYER_COLORS, PLAYER_COLORS, type PlayerColor } from './entities/PlayerColor';

/** Number of squares on the shared circular track. */
export const TRACK_LENGTH = 52;

/** Squares are spaced 13 apart for 4 players sharing a 52-square track. */
const ENTRY_SPACING = 13;
export function getTrackLength(playerCount = 4): number {
  return playerCount > 4 ? playerCount * ENTRY_SPACING : TRACK_LENGTH;
}
export function getFinishProgress(playerCount = 4): number {
  return getTrackLength(playerCount) + 5;
}

/** How many steps ahead of a player's entry square its "star" safe square sits. */
const STAR_OFFSET = 8;

/**
 * Each player's entry square on the shared track (global square index).
 * Board geometry — never the yard/finish progress numbers — is the only
 * thing that changes if the visual board layout changes, which is why it
 * lives entirely in this file.
 */
export function getEntrySquare(color: PlayerColor): number {
  return ALL_PLAYER_COLORS.indexOf(color) * ENTRY_SPACING;
}

/**
 * Converts a piece's progress (see Piece.ts) into the square it occupies.
 * Returns null when the piece is in the yard or already finished, since
 * neither has a board square.
 */
export type BoardPosition =
  | { readonly zone: 'SHARED_TRACK'; readonly square: number }
  | { readonly zone: 'HOME_COLUMN'; readonly color: PlayerColor; readonly step: number };

export function getBoardPosition(
  color: PlayerColor,
  progress: number,
  playerCount = 4,
): BoardPosition | null {
  if (progress >= 1 && progress < getTrackLength(playerCount)) {
    const square = (getEntrySquare(color) + progress - 1) % getTrackLength(playerCount);
    return { zone: 'SHARED_TRACK', square };
  }
  if (progress >= getTrackLength(playerCount) && progress < getFinishProgress(playerCount)) {
    return { zone: 'HOME_COLUMN', color, step: progress - getTrackLength(playerCount) + 1 };
  }
  return null;
}

/**
 * Safe squares are immune to captures: every player's entry square, plus a
 * "star" square 8 steps ahead of each entry. A piece landing here is never
 * sent back to the yard.
 */
export function isSafeSquare(square: number, playerCount = 4): boolean {
  return (playerCount > 4 ? ALL_PLAYER_COLORS.slice(0, playerCount) : PLAYER_COLORS).some(
    (color) => {
      const entry = getEntrySquare(color);
      return square === entry || square === (entry + STAR_OFFSET) % getTrackLength(playerCount);
    },
  );
}
