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

/** WCAG relative luminance, 0 (black) to 1 (white). */
export function luminance(hex: string): number {
  const c = parse(hex);
  if (!c) return 0;
  const [r, g, b] = c.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two colours (1 to 21). AA body text needs 4.5. */
export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** True when dark text reads better than light text on this colour. */
export function isLight(hex: string): boolean {
  return contrast(hex, '#000000') > contrast(hex, '#ffffff');
}
