/**
 * The board of a Diya puzzle: a grid of cells, flames that send out beams of
 * light, lamps that want light of exactly their colour, and the pieces that
 * steer it. Pure data; the rules that move light live in `application`.
 */

/** 0 = up, 1 = right, 2 = down, 3 = left (clockwise). */
export type Dir = 0 | 1 | 2 | 3;
export const DX: readonly number[] = [0, 1, 0, -1];
export const DY: readonly number[] = [-1, 0, 1, 0];

/**
 * Colours of light as bits. A beam carries exactly one; a lamp sees the
 * union of every beam that reaches it, so red and yellow arriving together
 * read as orange.
 */
export const RED = 1;
export const YELLOW = 2;
export const BLUE = 4;
export const WHITE = 8;
/** A beam's colour. */
export type Hue = 1 | 2 | 4 | 8;
/** A glass pane's colour (glass never makes white light). */
export type GlassHue = 1 | 2 | 4;

/** The colours a lamp can ask for: white, a primary, or a mix of two primaries. */
export type LampColour = 'white' | 'red' | 'yellow' | 'blue' | 'orange' | 'green' | 'purple';

export const LAMP_COLOURS: Readonly<Record<LampColour, number>> = {
  white: WHITE,
  red: RED,
  yellow: YELLOW,
  blue: BLUE,
  orange: RED | YELLOW,
  green: YELLOW | BLUE,
  purple: RED | BLUE,
};

/** The colour name of a mask a lamp can ask for, or null for anything else (e.g. white with red). */
export function colourOf(mask: number): LampColour | null {
  for (const [name, m] of Object.entries(LAMP_COLOURS)) if (m === mask) return name as LampColour;
  return null;
}

/** `/` leans right (slant 0), `\` leans left (slant 1). */
export type Slant = 0 | 1;

/** A piece the player places from the tray. */
export type PieceKind = 'mirror' | 'prism' | 'red' | 'yellow' | 'blue';

/** A piece as it sits on the board, with its orientation. */
export type Piece =
  | { readonly type: 'mirror'; readonly slant: Slant }
  | { readonly type: 'prism' }
  | { readonly type: 'glass'; readonly hue: GlassHue };

/** What the board itself holds before the player touches it. */
export type Tile =
  | { readonly kind: 'wall' }
  | { readonly kind: 'flame'; readonly dir: Dir; readonly hue: Hue }
  | { readonly kind: 'diya'; readonly need: number }
  /** A sleeping lamp: no light may reach it. */
  | { readonly kind: 'sleeper' }
  /** One-way glass: light passes only while travelling in `dir`. */
  | { readonly kind: 'oneway'; readonly dir: Dir }
  /** A piece set into the board: `fixed` never moves; `pivot` turns in place. */
  | { readonly kind: 'piece'; readonly piece: Piece; readonly lock: 'fixed' | 'pivot' };

/** One piece of a solution: what goes where (a pivot appears with its winning slant). */
export interface Placement {
  readonly at: number;
  readonly piece: Piece;
}

/** The one-line lesson shown the first time a new idea appears. */
export type Lesson =
  | 'rotate'
  | 'place'
  | 'walls'
  | 'prism'
  | 'glass'
  | 'mixing'
  | 'fixed'
  | 'oneway'
  | 'sleeper'
  | 'twoFlames';

export interface Level {
  /** "12" for a level, "d212" for a daily puzzle. */
  readonly id: string;
  readonly w: number;
  readonly h: number;
  /** Row-major, `w * h` long; null is an empty floor cell. */
  readonly tiles: readonly (Tile | null)[];
  /** The pieces the player places, as kinds. */
  readonly tray: readonly PieceKind[];
  /** A known way to light every lamp (tray pieces and pivots). */
  readonly solution: readonly Placement[];
  readonly lesson?: Lesson;
}

export function kindOf(piece: Piece): PieceKind {
  if (piece.type === 'glass')
    return piece.hue === RED ? 'red' : piece.hue === YELLOW ? 'yellow' : 'blue';
  return piece.type;
}

export function pieceOf(kind: PieceKind, slant: Slant = 0): Piece {
  switch (kind) {
    case 'mirror':
      return { type: 'mirror', slant };
    case 'prism':
      return { type: 'prism' };
    case 'red':
      return { type: 'glass', hue: RED };
    case 'yellow':
      return { type: 'glass', hue: YELLOW };
    case 'blue':
      return { type: 'glass', hue: BLUE };
  }
}

export function samePiece(a: Piece, b: Piece): boolean {
  if (a.type !== b.type) return false;
  if (a.type === 'mirror' && b.type === 'mirror') return a.slant === b.slant;
  if (a.type === 'glass' && b.type === 'glass') return a.hue === b.hue;
  return true;
}

/** Number of lamps that need lighting. */
export function lampCount(level: Level): number {
  return level.tiles.filter((t) => t?.kind === 'diya').length;
}
