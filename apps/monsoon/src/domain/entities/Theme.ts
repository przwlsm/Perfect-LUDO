/**
 * Places the monsoon can fall on: the same puzzles in a different valley.
 * Rice terraces are the game's own and always free; the others come with
 * Plus, or for a day after a rewarded video. Themes change looks only.
 */
export type ThemeId = 'terraces' | 'backwaters' | 'tea' | 'stepwell' | 'nightrain';

export interface Theme {
  readonly id: ThemeId;
  readonly premium: boolean;
}

export const THEMES: readonly Theme[] = [
  { id: 'terraces', premium: false },
  { id: 'backwaters', premium: true },
  { id: 'tea', premium: true },
  { id: 'stepwell', premium: true },
  { id: 'nightrain', premium: true },
];

export function themeById(id: string): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0]!;
}
