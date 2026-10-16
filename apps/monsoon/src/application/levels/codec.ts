import type { Dir, Lesson, Level, Tile, Water } from '@/domain/entities/Board';

/**
 * Levels as short text, so 300 of them ship in one small file:
 * `id;w;h;budget;lesson;cells`, two characters per cell. The first names
 * the kind (upper case when fixed), the second packs the openings (or a
 * dam's outlet) and the starting rotation into one base-64 digit.
 */
const DIGITS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

function kindChar(tile: Tile): string {
  switch (tile.kind) {
    case 'rock':
      return '#';
    case 'bridge':
      return '+';
    case 'pipe':
      return tile.fixed ? 'P' : 'p';
    case 'source':
      return tile.water === 0 ? (tile.fixed ? 'S' : 's') : tile.fixed ? 'T' : 't';
    case 'field':
      return tile.water === 0 ? (tile.fixed ? 'F' : 'f') : tile.fixed ? 'L' : 'l';
    case 'dam':
      return tile.fixed ? 'D' : 'd';
  }
}

export function encodeLevel(level: Level): string {
  const cells = level.tiles
    .map((tile, a) => {
      const rot = (level.start[a] ?? 0) & 3;
      const shape =
        tile.kind === 'rock' || tile.kind === 'bridge'
          ? 0
          : tile.kind === 'dam'
            ? tile.out
            : tile.mask;
      return kindChar(tile) + DIGITS[shape * 4 + rot];
    })
    .join('');
  return [level.id, level.w, level.h, level.budget ?? '', level.lesson ?? '', cells].join(';');
}

export function decodeLevel(text: string): Level {
  const [id, w, h, budget, lesson, cells] = text.split(';') as [
    string,
    string,
    string,
    string,
    string,
    string,
  ];
  const tiles: Tile[] = [];
  const start: number[] = [];
  for (let i = 0; i < cells.length; i += 2) {
    const k = cells[i]!;
    const v = DIGITS.indexOf(cells[i + 1]!);
    const shape = v >> 2;
    start.push(v & 3);
    const fixed = k === k.toUpperCase();
    const lower = k.toLowerCase();
    if (k === '#') tiles.push({ kind: 'rock' });
    else if (k === '+') tiles.push({ kind: 'bridge' });
    else if (lower === 'p') tiles.push({ kind: 'pipe', mask: shape, fixed });
    else if (lower === 's' || lower === 't')
      tiles.push({ kind: 'source', mask: shape, water: (lower === 't' ? 1 : 0) as Water, fixed });
    else if (lower === 'f' || lower === 'l')
      tiles.push({ kind: 'field', mask: shape, water: (lower === 'l' ? 1 : 0) as Water, fixed });
    else if (lower === 'd') tiles.push({ kind: 'dam', out: (shape & 3) as Dir, fixed });
    else throw new Error(`Unknown cell "${k}" in level ${id}`);
  }
  return {
    id,
    w: Number(w),
    h: Number(h),
    tiles,
    start,
    budget: budget === '' ? null : Number(budget),
    ...(lesson ? { lesson: lesson as Lesson } : {}),
  };
}
