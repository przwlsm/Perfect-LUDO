import {
  BLUE,
  LAMP_COLOURS,
  RED,
  YELLOW,
  type Dir,
  type GlassHue,
  type Lesson,
  type Level,
  type Piece,
  type PieceKind,
  type Placement,
  type Tile,
} from '@/domain/entities/Board';
import { kindOf } from '@/domain/entities/Board';

/**
 * The lessons, drawn by hand so each new idea arrives on a board that
 * teaches only that idea. Two characters per cell:
 *
 * `..` floor · `##` wall · `F^ F> Fv F<` flame and its direction ·
 * `dW dR dY dB dO dG dP` lamp and its colour · `zz` sleeping lamp ·
 * `o^ o> ov o<` one-way glass · `/f \f *f rf yf bf` fixed mirror, prism, glass ·
 * `/p \p` pivot mirror (shown turned the wrong way; the slant given is the answer) ·
 * `/t \t *t rt yt bt` a tray piece and where it belongs.
 */
const DIRS: Record<string, Dir> = { '^': 0, '>': 1, v: 2, '<': 3 };
const LAMPS: Record<string, number> = {
  W: LAMP_COLOURS.white,
  R: LAMP_COLOURS.red,
  Y: LAMP_COLOURS.yellow,
  B: LAMP_COLOURS.blue,
  O: LAMP_COLOURS.orange,
  G: LAMP_COLOURS.green,
  P: LAMP_COLOURS.purple,
};
const GLASS: Record<string, GlassHue> = { r: RED, y: YELLOW, b: BLUE };

function pieceFrom(ch: string): Piece | null {
  if (ch === '/') return { type: 'mirror', slant: 0 };
  if (ch === '\\') return { type: 'mirror', slant: 1 };
  if (ch === '*') return { type: 'prism' };
  const hue = GLASS[ch];
  return hue ? { type: 'glass', hue } : null;
}

export function parseBoard(id: string, rows: readonly string[], lesson?: Lesson): Level {
  const grid = rows.map((r) => r.trim().split(/\s+/));
  const h = grid.length;
  const w = grid[0]!.length;
  const tiles: (Tile | null)[] = [];
  const tray: PieceKind[] = [];
  const solution: Placement[] = [];
  grid.forEach((row, y) => {
    if (row.length !== w) throw new Error(`Level ${id}: row ${y} is ${row.length} wide`);
    row.forEach((cell, x) => {
      const at = y * w + x;
      const [a, b] = [cell[0]!, cell[1]!];
      if (cell === '..') return tiles.push(null);
      if (cell === '##') return tiles.push({ kind: 'wall' });
      if (cell === 'zz') return tiles.push({ kind: 'sleeper' });
      if (a === 'F') return tiles.push({ kind: 'flame', dir: DIRS[b]!, hue: 8 });
      if (a === 'd') return tiles.push({ kind: 'diya', need: LAMPS[b]! });
      if (a === 'o') return tiles.push({ kind: 'oneway', dir: DIRS[b]! });
      const piece = pieceFrom(a);
      if (!piece) throw new Error(`Level ${id}: unknown cell "${cell}"`);
      if (b === 'f') return tiles.push({ kind: 'piece', piece, lock: 'fixed' });
      if (b === 'p' && piece.type === 'mirror') {
        solution.push({ at, piece });
        return tiles.push({
          kind: 'piece',
          piece: { type: 'mirror', slant: piece.slant === 0 ? 1 : 0 },
          lock: 'pivot',
        });
      }
      if (b === 't') {
        solution.push({ at, piece });
        tray.push(kindOf(piece));
        return tiles.push(null);
      }
      throw new Error(`Level ${id}: unknown cell "${cell}"`);
    });
  });
  return { id, w, h, tiles, tray: tray.sort(), solution, ...(lesson ? { lesson } : {}) };
}

/** Hand-made levels by number. */
export const HANDMADE: Readonly<Record<number, { rows: readonly string[]; lesson?: Lesson }>> = {
  // Tap the mirror to turn it.
  1: {
    lesson: 'rotate',
    rows: [
      '.. .. .. .. ..',
      '.. /p .. dW ..',
      '.. .. .. .. ..',
      '.. .. .. .. ..',
      '.. F^ .. .. ..',
      '.. .. .. .. ..',
    ],
  },
  2: {
    rows: [
      '.. .. .. .. ..',
      '.. /p .. \\p ..',
      '.. .. .. .. ..',
      '.. .. .. .. ..',
      '.. F^ .. dW ..',
      '.. .. .. .. ..',
    ],
  },
  3: {
    rows: [
      '.. .. .. .. .. ..',
      '.. /p .. .. \\p ..',
      '.. .. .. .. .. ..',
      '.. .. .. .. .. ..',
      '.. dW .. .. .. ..',
      'F> .. .. .. /p ..',
      '.. .. .. .. .. ..',
    ],
  },
  // Drag a mirror from the tray onto the light.
  6: {
    lesson: 'place',
    rows: [
      '.. .. .. .. ..',
      '.. /t .. dW ..',
      '.. .. .. .. ..',
      '.. .. .. .. ..',
      '.. F^ .. .. ..',
      '.. .. .. .. ..',
    ],
  },
  7: {
    rows: [
      '.. .. .. .. ..',
      '.. /t .. \\t ..',
      '.. .. .. .. ..',
      '.. .. .. .. ..',
      '.. dW .. F^ ..',
      '.. .. .. .. ..',
    ],
  },
  // Walls stop light.
  11: {
    lesson: 'walls',
    rows: [
      '.. .. .. .. ..',
      '.. .. .. .. ..',
      '.. dW .. \\t ..',
      '## ## ## .. ..',
      '.. .. .. .. ..',
      '.. .. .. .. ..',
      'F> .. .. /t ..',
    ],
  },
  // A prism splits light to both sides.
  21: {
    lesson: 'prism',
    rows: [
      '.. .. .. .. .. ..',
      '.. .. .. .. .. ..',
      'dW .. .. *t .. dW',
      '.. .. .. .. .. ..',
      '.. .. .. .. .. ..',
      '.. .. .. F^ .. ..',
      '.. .. .. .. .. ..',
    ],
  },
  // Fixed pieces never move; work around them.
  31: {
    lesson: 'fixed',
    rows: [
      '.. .. .. .. .. ..',
      '.. /f .. .. \\t ..',
      '.. .. .. .. .. ..',
      '.. dW .. .. .. ..',
      '.. .. .. .. .. ..',
      'F> .. .. .. /t ..',
      '.. .. ## .. .. ..',
    ],
  },
  // Coloured glass tints light; a lamp wants exactly its colour.
  41: {
    lesson: 'glass',
    rows: [
      '.. .. .. .. ..',
      '.. .. dR .. ..',
      '.. .. .. .. ..',
      '.. .. rt .. ..',
      '.. .. .. .. ..',
      '.. .. F^ .. ..',
      '.. .. .. .. ..',
    ],
  },
  // Red and yellow light meeting at a lamp make orange.
  51: {
    lesson: 'mixing',
    rows: [
      '.. .. .. .. .. .. ..',
      '.. /f .. dO .. \\f ..',
      '.. rt .. .. .. yt ..',
      '.. .. .. .. .. .. ..',
      '.. \\f .. *f .. /f ..',
      '.. .. .. .. .. .. ..',
      '.. .. .. F^ .. .. ..',
    ],
  },
};
