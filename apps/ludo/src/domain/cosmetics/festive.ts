/**
 * Festive boards carry a live effect over the table: sparkles and diyas
 * for Diwali, colour splashes for Holi, falling flowers for Onam, a sun and
 * kolam for Pongal, a crescent and lanterns for Eid, snow and Santa for
 * Christmas. The board ids are store items (catalog.ts); the effect is drawn
 * by the presentation layer and never changes the rules.
 */
export const FESTIVE_EFFECTS = ['diwali', 'holi', 'onam', 'pongal', 'eid', 'christmas'] as const;
export type FestiveEffect = (typeof FESTIVE_EFFECTS)[number];

const BY_BOARD: Record<string, FestiveEffect> = {
  diwali: 'diwali',
  holi: 'holi',
  onam: 'onam',
  pongal: 'pongal',
  eid: 'eid',
  christmas: 'christmas',
};

/** The effect a board plays, or null for an ordinary board. */
export function festiveEffectOf(boardId: string): FestiveEffect | null {
  return BY_BOARD[boardId] ?? null;
}
