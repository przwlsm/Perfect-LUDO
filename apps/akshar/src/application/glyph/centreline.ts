import type { Pt, Rect } from './path';

export type Contains = (x: number, y: number) => boolean;

export interface GlyphShape {
  /** Grid points inside the glyph: what the learner should cover. */
  readonly inside: readonly Pt[];
  /** Dots along the middle of every stroke: the dotted guide. */
  readonly dots: readonly Pt[];
  /** Typical half-width of the glyph's strokes, in px. */
  readonly halfWidth: number;
  readonly cell: number;
}

/**
 * Reads a glyph's shape from nothing but a point-in-glyph test. There is no
 * stroke-order data for these scripts, so the middle of each stroke is
 * found geometrically: a distance transform over a grid, keeping the ridge
 * cells (those at least as far from the edge as all their neighbours). The
 * ridge is the stroke's centre line, which becomes the dotted guide; its
 * depth is the stroke's half-width, which sets how close the pen must pass.
 */
export function analyseGlyph(contains: Contains, area: Rect, cell: number): GlyphShape {
  const cols = Math.max(1, Math.ceil(area.width / cell));
  const rows = Math.max(1, Math.ceil(area.height / cell));
  const at = (c: number, r: number) => r * cols + c;
  const inside = new Uint8Array(cols * rows);
  const points: Pt[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = area.x + (c + 0.5) * cell;
      const y = area.y + (r + 0.5) * cell;
      if (contains(x, y)) {
        inside[at(c, r)] = 1;
        points.push({ x, y });
      }
    }
  }

  // Chamfer (3-4) distance to the nearest outside cell, in thirds of a cell.
  const BIG = 1e9;
  const d = new Float64Array(cols * rows);
  for (let i = 0; i < d.length; i++) d[i] = inside[i] ? BIG : 0;
  const get = (c: number, r: number) =>
    c < 0 || r < 0 || c >= cols || r >= rows ? 0 : d[at(c, r)]!;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = at(c, r);
      if (!inside[i]) continue;
      d[i] = Math.min(
        d[i]!,
        get(c - 1, r) + 3,
        get(c, r - 1) + 3,
        get(c - 1, r - 1) + 4,
        get(c + 1, r - 1) + 4,
      );
    }
  }
  for (let r = rows - 1; r >= 0; r--) {
    for (let c = cols - 1; c >= 0; c--) {
      const i = at(c, r);
      if (!inside[i]) continue;
      d[i] = Math.min(
        d[i]!,
        get(c + 1, r) + 3,
        get(c, r + 1) + 3,
        get(c + 1, r + 1) + 4,
        get(c - 1, r + 1) + 4,
      );
    }
  }

  const ridge: { x: number; y: number; depth: number }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = d[at(c, r)]!;
      if (v === 0) continue;
      let top = true;
      for (let dr = -1; dr <= 1 && top; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if ((dr || dc) && get(c + dc, r + dr) > v) {
            top = false;
            break;
          }
        }
      }
      if (top) {
        ridge.push({
          x: area.x + (c + 0.5) * cell,
          y: area.y + (r + 0.5) * cell,
          depth: (v / 3) * cell,
        });
      }
    }
  }

  const depths = ridge.map((p) => p.depth).sort((a, b) => a - b);
  const halfWidth = depths.length ? depths[Math.floor(depths.length / 2)]! : cell;

  // Keep the deepest ridge points first, spaced like a dotted line. Shallow
  // ridge spurs (towards sharp corners) are dropped.
  const spacing = Math.max(halfWidth * 1.15, cell * 2.2);
  const dots: Pt[] = [];
  const sorted = ridge.filter((p) => p.depth >= halfWidth * 0.45).sort((a, b) => b.depth - a.depth);
  for (const p of sorted) {
    if (dots.every((q) => (q.x - p.x) ** 2 + (q.y - p.y) ** 2 >= spacing * spacing)) {
      dots.push({ x: p.x, y: p.y });
    }
  }
  return { inside: points, dots, halfWidth, cell };
}
