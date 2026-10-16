/** Small colour helpers for #rrggbb values. Anything else passes through unchanged. */

function parse(hex: string): [number, number, number] | null {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return null;
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** The colour with a new alpha, as rgba(). */
export function withAlpha(color: string, alpha: number): string {
  const c = parse(color);
  return c ? `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${alpha})` : color;
}

/** `t` of the way from `a` to `b` (0 = a, 1 = b). */
export function mix(a: string, b: string, t: number): string {
  const ca = parse(a);
  const cb = parse(b);
  if (!ca || !cb) return a;
  const ch = (i: number) =>
    Math.round(ca[i]! + (cb[i]! - ca[i]!) * t)
      .toString(16)
      .padStart(2, '0');
  return `#${ch(0)}${ch(1)}${ch(2)}`;
}
