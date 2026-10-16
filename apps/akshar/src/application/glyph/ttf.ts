import { CLOSE, LINE, MOVE, QUAD, type Cmd } from './path';

/**
 * A small TrueType reader: just enough to turn one character into its
 * outline (cmap → glyf, simple and composite glyphs). Skia on the web
 * (CanvasKit) cannot make a path from text, so the web build reads the
 * Baloo font's own outlines with this; tests use it to check that every
 * letter really exists in its font.
 */
export interface TrueTypeFont {
  readonly unitsPerEm: number;
  readonly ascender: number;
  readonly descender: number;
  /** 0 when the font has no glyph for the code point (it would be a tofu box). */
  glyphId(codePoint: number): number;
  /**
   * The outline of one character at `size` px with its baseline origin at
   * (x, y), y pointing down like a screen (and like Skia's text paths).
   */
  outline(char: string, size: number, x?: number, y?: number): Cmd[];
}

interface Point {
  x: number;
  y: number;
  on: boolean;
}

export function readTrueType(buffer: ArrayBuffer | Uint8Array): TrueTypeFont {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const u16 = (o: number) => view.getUint16(o);
  const i16 = (o: number) => view.getInt16(o);
  const u32 = (o: number) => view.getUint32(o);

  const tables = new Map<string, number>();
  const numTables = u16(4);
  for (let i = 0; i < numTables; i++) {
    const rec = 12 + i * 16;
    const tag = String.fromCharCode(bytes[rec]!, bytes[rec + 1]!, bytes[rec + 2]!, bytes[rec + 3]!);
    tables.set(tag, u32(rec + 8));
  }
  const table = (tag: string): number => {
    const o = tables.get(tag);
    if (o === undefined) throw new Error(`Font has no ${tag} table`);
    return o;
  };

  const head = table('head');
  const unitsPerEm = u16(head + 18);
  const longLoca = i16(head + 50) === 1;
  const hhea = table('hhea');
  const ascender = i16(hhea + 4);
  const descender = i16(hhea + 6);
  const loca = table('loca');
  const glyf = table('glyf');

  const glyphId = makeCmap(table('cmap'), u16, u32, i16);

  const glyphOffset = (gid: number): [number, number] => {
    const a = longLoca ? u32(loca + gid * 4) : u16(loca + gid * 2) * 2;
    const b = longLoca ? u32(loca + gid * 4 + 4) : u16(loca + gid * 2 + 2) * 2;
    return [glyf + a, b - a];
  };

  /** Contours of a glyph in font units (y up), composites resolved. */
  const contours = (gid: number, depth = 0): Point[][] => {
    const [o, len] = glyphOffset(gid);
    if (len <= 0 || depth > 8) return [];
    const count = i16(o);
    if (count >= 0) return simpleGlyph(o, count);
    return compositeGlyph(o + 10, depth);
  };

  const simpleGlyph = (o: number, count: number): Point[][] => {
    const ends: number[] = [];
    for (let i = 0; i < count; i++) ends.push(u16(o + 10 + i * 2));
    const nPoints = count ? ends[count - 1]! + 1 : 0;
    let p = o + 10 + count * 2;
    p += 2 + u16(p); // instructions
    const flags: number[] = [];
    while (flags.length < nPoints) {
      const f = bytes[p++]!;
      flags.push(f);
      if (f & 8) {
        let repeat = bytes[p++]!;
        while (repeat-- > 0) flags.push(f);
      }
    }
    const xs: number[] = [];
    let v = 0;
    for (const f of flags) {
      if (f & 2) {
        const d = bytes[p++]!;
        v += f & 16 ? d : -d;
      } else if (!(f & 16)) {
        v += i16(p);
        p += 2;
      }
      xs.push(v);
    }
    const ys: number[] = [];
    v = 0;
    for (const f of flags) {
      if (f & 4) {
        const d = bytes[p++]!;
        v += f & 32 ? d : -d;
      } else if (!(f & 32)) {
        v += i16(p);
        p += 2;
      }
      ys.push(v);
    }
    const out: Point[][] = [];
    let start = 0;
    for (const end of ends) {
      const c: Point[] = [];
      for (let k = start; k <= end; k++)
        c.push({ x: xs[k]!, y: ys[k]!, on: (flags[k]! & 1) === 1 });
      out.push(c);
      start = end + 1;
    }
    return out;
  };

  const compositeGlyph = (o: number, depth: number): Point[][] => {
    const out: Point[][] = [];
    let p = o;
    for (;;) {
      const flags = u16(p);
      const component = u16(p + 2);
      p += 4;
      let dx = 0;
      let dy = 0;
      if (flags & 1) {
        dx = i16(p);
        dy = i16(p + 2);
        p += 4;
      } else {
        dx = view.getInt8(p);
        dy = view.getInt8(p + 1);
        p += 2;
      }
      // Point-matched components (flag 2 clear) are rare in these fonts; they sit at the origin.
      if (!(flags & 2)) {
        dx = 0;
        dy = 0;
      }
      let a = 1;
      let b = 0;
      let c = 0;
      let d = 1;
      const f2dot14 = (q: number) => i16(q) / 16384;
      if (flags & 8) {
        a = d = f2dot14(p);
        p += 2;
      } else if (flags & 0x40) {
        a = f2dot14(p);
        d = f2dot14(p + 2);
        p += 4;
      } else if (flags & 0x80) {
        a = f2dot14(p);
        b = f2dot14(p + 2);
        c = f2dot14(p + 4);
        d = f2dot14(p + 6);
        p += 8;
      }
      for (const contour of contours(component, depth + 1)) {
        out.push(
          contour.map((pt) => ({
            x: pt.x * a + pt.y * c + dx,
            y: pt.x * b + pt.y * d + dy,
            on: pt.on,
          })),
        );
      }
      if (!(flags & 0x20)) break;
    }
    return out;
  };

  return {
    unitsPerEm,
    ascender,
    descender,
    glyphId,
    outline(char, size, x = 0, y = 0) {
      const cp = char.codePointAt(0);
      if (cp === undefined) return [];
      const gid = glyphId(cp);
      if (gid === 0) return [];
      const s = size / unitsPerEm;
      const cmds: Cmd[] = [];
      for (const contour of contours(gid)) {
        appendContour(
          cmds,
          contour.map((pt) => ({ x: x + pt.x * s, y: y - pt.y * s, on: pt.on })),
        );
      }
      return cmds;
    },
  };
}

/** TrueType's quadratic contour (with implied on-curve midpoints) as path commands. */
function appendContour(out: Cmd[], pts: readonly Point[]): void {
  const n = pts.length;
  if (n === 0) return;
  // Start on an on-curve point, or at the midpoint of two off-curve ones.
  let startIndex = pts.findIndex((p) => p.on);
  let start: Point;
  if (startIndex < 0) {
    const a = pts[0]!;
    const b = pts[1 % n]!;
    start = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, on: true };
    startIndex = 0;
  } else {
    start = pts[startIndex]!;
  }
  out.push([MOVE, start.x, start.y]);
  let control: Point | null = null;
  for (let k = 1; k <= n; k++) {
    const p = pts[(startIndex + k) % n]!;
    if (p.on) {
      out.push(control ? [QUAD, control.x, control.y, p.x, p.y] : [LINE, p.x, p.y]);
      control = null;
    } else if (control) {
      const mx = (control.x + p.x) / 2;
      const my = (control.y + p.y) / 2;
      out.push([QUAD, control.x, control.y, mx, my]);
      control = p;
    } else {
      control = p;
    }
  }
  if (control) out.push([QUAD, control.x, control.y, start.x, start.y]);
  out.push([CLOSE]);
}

function makeCmap(
  cmap: number,
  u16: (o: number) => number,
  u32: (o: number) => number,
  i16: (o: number) => number,
): (cp: number) => number {
  const n = u16(cmap + 2);
  let format4 = -1;
  let format12 = -1;
  for (let i = 0; i < n; i++) {
    const rec = cmap + 4 + i * 8;
    const platform = u16(rec);
    const encoding = u16(rec + 2);
    const sub = cmap + u32(rec + 4);
    const format = u16(sub);
    const unicode = platform === 0 || (platform === 3 && (encoding === 1 || encoding === 10));
    if (!unicode) continue;
    if (format === 12 && format12 < 0) format12 = sub;
    if (format === 4 && format4 < 0) format4 = sub;
  }
  if (format12 >= 0) {
    const groups = u32(format12 + 12);
    return (cp) => {
      for (let g = 0; g < groups; g++) {
        const rec = format12 + 16 + g * 12;
        const first = u32(rec);
        const last = u32(rec + 4);
        if (cp >= first && cp <= last) return u32(rec + 8) + (cp - first);
      }
      return 0;
    };
  }
  if (format4 < 0) return () => 0;
  const segX2 = u16(format4 + 6);
  const ends = format4 + 14;
  const starts = ends + segX2 + 2;
  const deltas = starts + segX2;
  const ranges = deltas + segX2;
  return (cp) => {
    if (cp > 0xffff) return 0;
    for (let s = 0; s < segX2; s += 2) {
      const end = u16(ends + s);
      if (cp > end) continue;
      const first = u16(starts + s);
      if (cp < first) return 0;
      const delta = i16(deltas + s);
      const range = u16(ranges + s);
      if (range === 0) return (cp + delta) & 0xffff;
      const g = u16(ranges + s + range + (cp - first) * 2);
      return g === 0 ? 0 : (g + delta) & 0xffff;
    }
    return 0;
  };
}
