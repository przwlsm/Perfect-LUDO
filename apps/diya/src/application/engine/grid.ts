import type { Level, Piece, Placement, Slant, Tile } from '@/domain/entities/Board';

/**
 * A board compiled to typed arrays for fast tracing: one code and one
 * argument byte per cell. The solver and generator change cells in place
 * and trace thousands of times, so this stays allocation-free.
 */
export const EMPTY = 0;
export const WALL = 1;
export const FLAME = 2;
export const DIYA = 3;
export const SLEEPER = 4;
export const ONEWAY = 5;
/** `/` */
export const MIRROR_R = 6;
/** `\` */
export const MIRROR_L = 7;
export const PRISM = 8;
export const GLASS = 9;

export interface Grid {
  readonly w: number;
  readonly h: number;
  readonly code: Uint8Array;
  /** Flame: dir | hue << 2. Diya: needed mask. One-way: dir. Glass: hue. */
  readonly arg: Uint8Array;
}

export function emptyGrid(w: number, h: number): Grid {
  return { w, h, code: new Uint8Array(w * h), arg: new Uint8Array(w * h) };
}

export function cloneGrid(g: Grid): Grid {
  return { w: g.w, h: g.h, code: g.code.slice(), arg: g.arg.slice() };
}

export function setPiece(g: Grid, at: number, piece: Piece): void {
  if (piece.type === 'mirror') {
    g.code[at] = piece.slant === 0 ? MIRROR_R : MIRROR_L;
    g.arg[at] = 0;
  } else if (piece.type === 'prism') {
    g.code[at] = PRISM;
    g.arg[at] = 0;
  } else {
    g.code[at] = GLASS;
    g.arg[at] = piece.hue;
  }
}

export function clearCell(g: Grid, at: number): void {
  g.code[at] = EMPTY;
  g.arg[at] = 0;
}

export function setTile(g: Grid, at: number, tile: Tile | null): void {
  if (!tile) return clearCell(g, at);
  switch (tile.kind) {
    case 'wall':
      g.code[at] = WALL;
      g.arg[at] = 0;
      return;
    case 'flame':
      g.code[at] = FLAME;
      g.arg[at] = tile.dir | (tile.hue << 2);
      return;
    case 'diya':
      g.code[at] = DIYA;
      g.arg[at] = tile.need;
      return;
    case 'sleeper':
      g.code[at] = SLEEPER;
      g.arg[at] = 0;
      return;
    case 'oneway':
      g.code[at] = ONEWAY;
      g.arg[at] = tile.dir;
      return;
    case 'piece':
      return setPiece(g, at, tile.piece);
  }
}

/** The pieces and pivot turns a player has made on top of a level. */
export interface Arrangement {
  readonly placed: Readonly<Record<number, Piece>>;
  readonly pivots: Readonly<Record<number, Slant>>;
}

export const NO_ARRANGEMENT: Arrangement = { placed: {}, pivots: {} };

/** The level's own tiles, then the player's pieces and pivot turns on top. */
export function compile(level: Level, arrangement: Arrangement = NO_ARRANGEMENT): Grid {
  const g = emptyGrid(level.w, level.h);
  level.tiles.forEach((tile, at) => setTile(g, at, tile));
  for (const [at, slant] of Object.entries(arrangement.pivots)) {
    setPiece(g, Number(at), { type: 'mirror', slant });
  }
  for (const [at, piece] of Object.entries(arrangement.placed)) setPiece(g, Number(at), piece);
  return g;
}

/** The arrangement a list of placements makes: pivots turned, tray pieces set down. */
export function arrangementOf(level: Level, placements: readonly Placement[]): Arrangement {
  const placed: Record<number, Piece> = {};
  const pivots: Record<number, Slant> = {};
  for (const p of placements) {
    const t = level.tiles[p.at];
    if (t?.kind === 'piece' && t.lock === 'pivot') {
      if (p.piece.type === 'mirror') pivots[p.at] = p.piece.slant;
    } else placed[p.at] = p.piece;
  }
  return { placed, pivots };
}
