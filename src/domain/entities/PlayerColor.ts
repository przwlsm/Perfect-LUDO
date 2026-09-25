export const PLAYER_COLORS = ['RED', 'GREEN', 'YELLOW', 'BLUE'] as const;

export type ClassicColor = (typeof PLAYER_COLORS)[number];
export const ALL_PLAYER_COLORS = [...PLAYER_COLORS, 'PURPLE', 'ORANGE'] as const;
export type PlayerColor = (typeof ALL_PLAYER_COLORS)[number];

export type DieValue = 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Seating for a given table size. Two players sit opposite each other rather
 * than side by side, which is the arrangement the physical game uses.
 */
export function seatColors(players: number): readonly PlayerColor[] {
  return players === 2 ? (['RED', 'YELLOW'] as const) : ALL_PLAYER_COLORS.slice(0, players);
}
