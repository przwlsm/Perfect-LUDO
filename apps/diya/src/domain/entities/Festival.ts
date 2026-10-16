/**
 * Festival skins: the same puzzles under different lamps. Diwali is the
 * game's own and always free; the others come with Plus, or for a day after
 * a rewarded video. Skins change looks only, never rules.
 */
export type FestivalId = 'diwali' | 'christmas' | 'eid' | 'hanukkah' | 'lantern';

export interface Festival {
  readonly id: FestivalId;
  readonly premium: boolean;
}

export const FESTIVALS: readonly Festival[] = [
  { id: 'diwali', premium: false },
  { id: 'christmas', premium: true },
  { id: 'eid', premium: true },
  { id: 'hanukkah', premium: true },
  { id: 'lantern', premium: true },
];

export function festivalById(id: string): Festival {
  return FESTIVALS.find((f) => f.id === id) ?? FESTIVALS[0]!;
}
