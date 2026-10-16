import type { Dir, Lesson, Level, Tile, Water } from '@/domain/entities/Board';

/**
 * Boards drawn by hand, for the first steps and for How to play. Each cell
 * is three characters: kind, openings in its solved orientation (hex, bit 0
 * north, 1 east, 2 south, 3 west) and the rotation it starts at.
 *
 *   ###  rock            +++  bridge
 *   p..  channel         P..  fixed channel
 *   s..  rain spring     t..  temple tank
 *   f..  paddy field     l..  lotus pond
 *   d..  check-dam (second character: its outlet direction, 0–3)
 */
export function parseBoard(
  id: string,
  rows: readonly string[],
  lesson?: Lesson,
  budget: number | null = null,
): Level {
  const grid = rows.map((row) => row.trim().split(/\s+/));
  const h = grid.length;
  const w = grid[0]!.length;
  const tiles: Tile[] = [];
  const start: number[] = [];
  for (const row of grid) {
    if (row.length !== w) throw new Error(`Board ${id}: ragged rows`);
    for (const cell of row) {
      const [k, m, s] = [cell[0]!, cell[1]!, cell[2]!];
      const mask = parseInt(m, 16) || 0;
      const fixed = k === k.toUpperCase() && k !== '#' && k !== '+';
      const lower = k.toLowerCase();
      start.push(Number(s) || 0);
      if (k === '#') tiles.push({ kind: 'rock' });
      else if (k === '+') tiles.push({ kind: 'bridge' });
      else if (lower === 'p') tiles.push({ kind: 'pipe', mask, fixed });
      else if (lower === 's' || lower === 't')
        tiles.push({ kind: 'source', mask, water: (lower === 't' ? 1 : 0) as Water, fixed });
      else if (lower === 'f' || lower === 'l')
        tiles.push({ kind: 'field', mask, water: (lower === 'l' ? 1 : 0) as Water, fixed });
      else if (lower === 'd') tiles.push({ kind: 'dam', out: (mask & 3) as Dir, fixed });
      else throw new Error(`Board ${id}: unknown cell "${cell}"`);
    }
  }
  return { id, w, h, tiles, start, budget, ...(lesson ? { lesson } : {}) };
}

/** The first two levels: a short channel, then a branch to two fields. */
export const HANDMADE: Readonly<Record<number, { rows: readonly string[]; lesson?: Lesson }>> = {
  1: {
    lesson: 'rotate',
    rows: [
      '### s40 ### ###', //
      '### p51 ### ###',
      '### p30 pC3 ###',
      '### ### f10 ###',
    ],
  },
  2: {
    rows: [
      's40 ### ### ###', //
      'p73 pA1 pC3 ###',
      'p50 ### p51 ###',
      'f10 ### p30 f83',
    ],
  },
};

/** The hillside on the home screen and the valley previews: three fields off one spring. */
export const HERO = parseBoard('hero', [
  '### ### ### s40 ### ###',
  'f40 ### p60 pB0 pA0 pC0',
  'p30 pA0 pD0 ### ### p50',
  '### ### f10 ### f20 p90',
]);

/**
 * Tiny boards for How to play, each showing one idea. The player can turn
 * their tiles; each is one tap or two from solved.
 */
export const HOW_BOARDS: Readonly<Record<'turn' | 'spill' | 'bridge' | 'dam' | 'two', Level>> = {
  turn: parseBoard('how-turn', ['s20 pA1 pC0', '### ### f13']),
  spill: parseBoard('how-spill', ['s20 pE2 f80', '### f12 ###']),
  bridge: parseBoard('how-bridge', ['### s40 ###', 's20 +++ f83', '### f12 ###']),
  dam: parseBoard('how-dam', ['s20 d12 pC3', '### ### f10']),
  two: parseBoard('how-two', ['s20 pA1 f80', 't20 pA0 l83']),
};
