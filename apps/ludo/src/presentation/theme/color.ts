/** Colour maths for `#rrggbb` (an `#rrggbbaa` alpha suffix is ignored). */

function channels(hex: string): [number, number, number] {
  const value = parseInt(hex.slice(1, 7), 16);
  return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
}

function toHex(rgb: readonly number[]): string {
  return `#${rgb.map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`;
}

/** WCAG relative luminance. */
export function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio, 1 to 21. */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** `a` moved toward `b` by `t` (0 = a, 1 = b). */
export function mix(a: string, b: string, t: number): string {
  const x = channels(a);
  const y = channels(b);
  return toHex(x.map((c, i) => c + (y[i]! - c) * t));
}

/**
 * `color` darkened (on a light background) or lightened (on a dark one) just
 * enough to reach `ratio` against every background, keeping its hue.
 */
export function readableOn(color: string, backgrounds: readonly string[], ratio = 4.5): string {
  const light = backgrounds.every((bg) => luminance(bg) > 0.4);
  const target = light ? '#000000' : '#ffffff';
  for (let t = 0; t <= 1; t += 0.02) {
    const candidate = mix(color, target, t);
    if (backgrounds.every((bg) => contrast(candidate, bg) >= ratio)) return candidate;
  }
  return target;
}
