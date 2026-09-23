export const PLAYER_COLORS = ['RED', 'GREEN', 'YELLOW', 'BLUE'] as const;

export type PlayerColor = (typeof PLAYER_COLORS)[number];

export type DieValue = 1 | 2 | 3 | 4 | 5 | 6;
