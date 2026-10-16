/**
 * Day-mode building blocks for the 60-30-10 rule (docs/THEMING.md), shared by
 * every screen so they apply it the same way. Night mode is untouched: each
 * helper returns the night look unchanged when the scheme is dark.
 */
import { luminance, readableOn } from './color';
import type { Palette } from './palette';

/** By day, cards lift off the ivory page with a soft navy shadow. */
export function liftByDay(ui: Palette): string | undefined {
  return ui.scheme === 'light' ? `0 6px 18px ${ui.shadow}` : undefined;
}

/**
 * An icon tile in a game colour (the 10%). By day: a solid tile, where light
 * hues (gold, mint) keep their true colour with a navy icon and deeper hues
 * are deepened just enough to carry a white icon. By night: the accent's
 * translucent tint with the accent as the icon, as before.
 */
export function iconTile(accent: string, ui: Palette): { background: string; icon: string } {
  if (ui.scheme === 'dark') return { background: `${accent}22`, icon: accent };
  if (luminance(accent) > 0.4) return { background: accent, icon: ui.text };
  return { background: readableOn(accent, ['#ffffff'], 3), icon: ui.onColor };
}

/** A small pill in a game colour, readable on a white day card. */
export function pillColors(accent: string, ui: Palette): { color: string; background: string } {
  if (ui.scheme === 'dark') return { color: accent, background: 'transparent' };
  return { color: readableOn(accent, ['#ffffff']), background: `${accent}1a` };
}

/**
 * The marigold highlight card (the 10%): navy text reads on it at 10:1 and
 * muted text at 5.7:1. Use for one celebratory card per screen.
 */
export const MARIGOLD = ['#ffe08a', '#ffc94d'] as const;

/**
 * The navy hero card (the 30%): royal blue into the brand navy. Render its
 * content inside `<SchemeScope scheme="dark">` so it takes night tokens.
 */
export const NAVY_HERO = ['#1e336e', '#1a2a62', '#141e4f'] as const;

/**
 * Progress and meter fills (the 10%): vivid game colours that read the same
 * by day and night. Never build a fill from a text token such as `ui.gold`:
 * by day those are deepened for reading on white and turn a bar muddy.
 */
export const FILLS = {
  blue: ['#6aa8ff', '#2f6be0'],
  gold: ['#ffd36b', '#f59e0b'],
  green: ['#34d399', '#059669'],
  /** Experience: green into blue, as on the level bar. */
  xp: ['#34d399', '#3b82f6'],
} as const;
export type FillTone = keyof typeof FILLS;

/**
 * Solid badge fills that carry white text at 4.5:1 or better in both modes
 * ("FREE", "LIVE", level and tier tags). The `ui.green`/`ui.blue`/`ui.danger`
 * tokens are text colours: pale at night, so white on them fails there.
 */
export const BADGE = {
  green: '#047857',
  blue: '#2563eb',
  red: '#dc2626',
} as const;
