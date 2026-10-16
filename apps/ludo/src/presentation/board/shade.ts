/**
 * Lightens (amount > 0) or darkens (amount < 0) a `#rrggbb` colour by mixing
 * it toward white or black. The 3D board derives its bevel, rim and shadow
 * tones from the theme this way, so every theme stays coherent in 3D
 * without a second palette to maintain.
 */
export function shade(hex: string, amount: number): string {
  const match = /^#([0-9a-f]{6})/i.exec(hex);
  if (!match) return hex;
  const value = parseInt(match[1]!, 16);
  const target = amount < 0 ? 0 : 255;
  const t = Math.min(1, Math.abs(amount));
  const channel = (offset: number) => {
    const c = (value >> offset) & 0xff;
    return Math.round(c + (target - c) * t);
  };
  return `#${[16, 8, 0].map((offset) => channel(offset).toString(16).padStart(2, '0')).join('')}`;
}
