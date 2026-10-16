/**
 * Cup themes: the same puzzles poured into different cups. The kulhad is
 * the stall's own and always free; the others come with Plus, or for a day
 * after a rewarded video. Themes change looks only, never rules.
 */
export type CupThemeId = 'kulhad' | 'cutting' | 'copper' | 'porcelain' | 'nightmarket';

export interface CupTheme {
  readonly id: CupThemeId;
  readonly premium: boolean;
}

export const CUP_THEMES: readonly CupTheme[] = [
  { id: 'kulhad', premium: false },
  { id: 'cutting', premium: true },
  { id: 'copper', premium: true },
  { id: 'porcelain', premium: true },
  { id: 'nightmarket', premium: true },
];

export function cupThemeById(id: string): CupTheme {
  return CUP_THEMES.find((f) => f.id === id) ?? CUP_THEMES[0]!;
}
