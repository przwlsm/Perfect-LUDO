import type {
  Dir,
  GlassHue,
  Hue,
  Level,
  Piece,
  PieceKind,
  Placement,
  Tile,
} from '@/domain/entities/Board';

/**
 * A compact text form for shipping levels: `id;w;h;cells;tray;solution;lesson`.
 * Each cell is two characters: a kind letter and an argument digit.
 *
 * `..` floor · `#0` wall · `F<x>` flame (x packs direction and colour) ·
 * `D<need>` lamp · `Z0` sleeper · `O<dir>` one-way glass ·
 * `M<slant>` `P0` `G<hue>` fixed mirror, prism, glass · `m<slant>` pivot mirror.
 */
const HEX = '0123456789abcdef';

function pieceCode(piece: Piece, pivot: boolean): string {
  if (piece.type === 'mirror') return (pivot ? 'm' : 'M') + piece.slant;
  if (piece.type === 'prism') return 'P0';
  return 'G' + piece.hue;
}

function tileCode(t: Tile | null): string {
  if (!t) return '..';
  switch (t.kind) {
    case 'wall':
      return '#0';
    case 'flame':
      return 'F' + HEX[t.dir | (t.hue === 8 ? 0 : t.hue << 2)];
    case 'diya':
      return 'D' + HEX[t.need];
    case 'sleeper':
      return 'Z0';
    case 'oneway':
      return 'O' + t.dir;
    case 'piece':
      return pieceCode(t.piece, t.lock === 'pivot');
  }
}

function decodePiece(kind: string, arg: number): Piece {
  if (kind === 'M' || kind === 'm') return { type: 'mirror', slant: arg === 0 ? 0 : 1 };
  if (kind === 'P') return { type: 'prism' };
  return { type: 'glass', hue: arg as GlassHue };
}

function decodeTile(code: string): Tile | null {
  const kind = code[0]!;
  const arg = HEX.indexOf(code[1]!);
  switch (kind) {
    case '.':
      return null;
    case '#':
      return { kind: 'wall' };
    case 'F': {
      const hue = arg >> 2;
      return { kind: 'flame', dir: (arg & 3) as Dir, hue: (hue === 0 ? 8 : hue) as Hue };
    }
    case 'D':
      return { kind: 'diya', need: arg };
    case 'Z':
      return { kind: 'sleeper' };
    case 'O':
      return { kind: 'oneway', dir: arg as Dir };
    case 'm':
      return { kind: 'piece', piece: decodePiece(kind, arg), lock: 'pivot' };
    default:
      return { kind: 'piece', piece: decodePiece(kind, arg), lock: 'fixed' };
  }
}

export function encodeLevel(level: Level): string {
  const cells = level.tiles.map(tileCode).join('');
  const solution = level.solution
    .map((p) => `${p.at.toString(36)}:${pieceCode(p.piece, false)}`)
    .join(',');
  return [
    level.id,
    level.w,
    level.h,
    cells,
    level.tray.join(','),
    solution,
    level.lesson ?? '',
  ].join(';');
}

export function decodeLevel(text: string): Level {
  const [id, w, h, cells, tray, solution, lesson] = text.split(';');
  const width = Number(w);
  const height = Number(h);
  const tiles: (Tile | null)[] = [];
  for (let i = 0; i < width * height; i++) tiles.push(decodeTile(cells!.slice(i * 2, i * 2 + 2)));
  const placements: Placement[] = solution
    ? solution.split(',').map((s) => {
        const [at, code] = s.split(':');
        return { at: parseInt(at!, 36), piece: decodePiece(code![0]!, HEX.indexOf(code![1]!)) };
      })
    : [];
  return {
    id: id!,
    w: width,
    h: height,
    tiles,
    tray: tray ? (tray.split(',') as PieceKind[]) : [],
    solution: placements,
    ...(lesson ? { lesson: lesson as Level['lesson'] } : {}),
  };
}

/** A level drawn in text, for tests and the plan (`F` flame, `o` lamp, `z` sleeping lamp). */
export function drawLevel(level: Level, withSolution = false): string {
  const put = new Map<number, Piece>();
  if (withSolution) for (const p of level.solution) put.set(p.at, p.piece);
  const rows: string[] = [];
  for (let y = 0; y < level.h; y++) {
    let row = '';
    for (let x = 0; x < level.w; x++) {
      const at = y * level.w + x;
      const t = level.tiles[at] ?? null;
      const p = put.get(at);
      const glyph = (piece: Piece, upper: boolean) =>
        piece.type === 'mirror'
          ? piece.slant === 0
            ? '/'
            : '\\'
          : piece.type === 'prism'
            ? upper
              ? '*'
              : '+'
            : ' RY B'[piece.hue]!;
      if (p) row += glyph(p, false);
      else if (!t) row += '.';
      else if (t.kind === 'wall') row += '#';
      else if (t.kind === 'flame') row += '^>v<'[t.dir];
      else if (t.kind === 'diya') row += 'o';
      else if (t.kind === 'sleeper') row += 'z';
      else if (t.kind === 'oneway') row += 'AEVW'[t.dir];
      else row += glyph(t.piece, true);
      row += ' ';
    }
    rows.push(row.trimEnd());
  }
  return rows.join('\n');
}
