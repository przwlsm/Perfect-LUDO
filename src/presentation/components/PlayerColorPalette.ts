import type { PlayerColor } from '@/domain';

/** Single source of truth for each color's on-screen hex value. */
export const PLAYER_COLOR_HEX: Record<PlayerColor, string> = {
  PURPLE: '#a77bea',
  ORANGE: '#ee9147',
  RED: '#ef4444',
  GREEN: '#22c55e',
  YELLOW: '#eab308',
  BLUE: '#3b82f6',
};
