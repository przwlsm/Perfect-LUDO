/**
 * Reads a TrueType font's character map: which code points it can draw.
 * Tests use it to prove every phrase shows in its own font (no tofu boxes).
 * (Adapted from Akshar's TrueType reader; only the cmap part is needed.)
 */
export function readCmap(buffer: ArrayBuffer | Uint8Array): (codePoint: number) => number {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const u16 = (o: number) => view.getUint16(o);
  const i16 = (o: number) => view.getInt16(o);
  const u32 = (o: number) => view.getUint32(o);

  let cmap = -1;
  const numTables = u16(4);
  for (let i = 0; i < numTables; i++) {
    const rec = 12 + i * 16;
    const tag = String.fromCharCode(bytes[rec]!, bytes[rec + 1]!, bytes[rec + 2]!, bytes[rec + 3]!);
    if (tag === 'cmap') cmap = u32(rec + 8);
  }
  if (cmap < 0) return () => 0;

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
