import { mix, readableOn } from './color';
import type { Scheme } from './palette';

export interface BoardTheme {
  readonly id: string;
  readonly background: string;
  readonly surface: string;
  readonly accent: string;
  readonly frame: string;
  readonly tile: string;
  readonly line: string;
  readonly wood?: boolean;
  readonly pieceStyle?: 'coin' | 'pawn';
  readonly colors: {
    PURPLE: string;
    ORANGE: string;
    PINK: string;
    CYAN: string;
    RED: string;
    GREEN: string;
    YELLOW: string;
    BLUE: string;
  };
}
// Neo-Arcade player colours: crimson, emerald, amber gold, royal blue.
const classic = { RED: '#ef4444', GREEN: '#10b981', YELLOW: '#f59e0b', BLUE: '#3b82f6' };
function theme(
  id: string,
  background: string,
  surface: string,
  accent: string,
  frame: string,
  tile: string,
  colors = classic,
): BoardTheme {
  return {
    id,
    background,
    surface,
    accent,
    frame,
    tile,
    line: '#18233835',
    // Orange is a deep red-orange so it never reads as the amber yellow beside it.
    colors: { ...colors, PURPLE: '#a77bea', ORANGE: '#f26b1d', PINK: '#f472b6', CYAN: '#22d3ee' },
  };
}
export const BOARD_THEMES: readonly BoardTheme[] = [
  theme('classic', '#0e1322', '#1a1f2f', '#ffb95f', '#b77739', '#fff8e9'),
  {
    ...theme('heritage', '#191b18', '#282d26', '#dfba72', '#ba8f58', '#eee3c8', {
      RED: '#a94236',
      GREEN: '#376d47',
      YELLOW: '#d6a323',
      BLUE: '#275875',
    }),
    line: '#65553c70',
    wood: true,
    pieceStyle: 'pawn',
  },
  theme('royal', '#171127', '#281e39', '#eec779', '#bb8b37', '#fff1d4', {
    RED: '#db607c',
    GREEN: '#41bfa2',
    YELLOW: '#eabb48',
    BLUE: '#8d8ae7',
  }),
  theme('neon', '#0b1021', '#18203b', '#7cebf7', '#703add', '#dfe9ff', {
    RED: '#ff528f',
    GREEN: '#43efc0',
    YELLOW: '#f9e65c',
    BLUE: '#6e7dff',
  }),
  theme('forest', '#0d1e1b', '#18322b', '#a8dfab', '#765638', '#f0f0d8'),
  theme('ocean', '#0b1b2d', '#15314a', '#72dcff', '#326e95', '#e5f9ff'),
  theme('rose', '#241725', '#382439', '#f1b5ce', '#b57694', '#fff0f7', {
    RED: '#d9699d',
    GREEN: '#79bfa9',
    YELLOW: '#efbd7c',
    BLUE: '#a58cdc',
  }),
  theme('sunset', '#281917', '#3a2924', '#ffbe83', '#b57145', '#fff0d9'),
  theme('arctic', '#101e2b', '#203342', '#abedff', '#8dabbf', '#f4fdff', {
    RED: '#e7899e',
    GREEN: '#69cdbd',
    YELLOW: '#edce72',
    BLUE: '#7ba9e6',
  }),
  theme('cosmic', '#15112c', '#251d43', '#c6a4ff', '#7155bd', '#eee6ff'),
  theme('jade', '#102520', '#203b30', '#d2e5a1', '#6f9272', '#e8f3da'),
  theme('candy', '#23192d', '#392746', '#f7afe0', '#c97abd', '#fff1fb', {
    RED: '#f88db8',
    GREEN: '#76d5bd',
    YELLOW: '#f3d984',
    BLUE: '#9aa6fa',
  }),
  theme('obsidian', '#141619', '#25282c', '#ebcc86', '#b09657', '#eee7d6', {
    RED: '#cf6d73',
    GREEN: '#74ac96',
    YELLOW: '#d4b568',
    BLUE: '#7d97bf',
  }),
  // Festival of Lights: a marigold night, first sold for Diwali 2026.
  theme('diwali', '#241736', '#37244e', '#ffcf6f', '#b3722f', '#fff3dd', {
    RED: '#ff6b5e',
    GREEN: '#3ddba6',
    YELLOW: '#ffc94d',
    BLUE: '#7d8bff',
  }),
  // Holi: a white board splashed with gulal, vivid player colours.
  theme('holi', '#2a1a3a', '#3d2654', '#ff5fa2', '#b3407a', '#fffaf2', {
    RED: '#ff3d7f',
    GREEN: '#2ad17e',
    YELLOW: '#ffb000',
    BLUE: '#3f8cff',
  }),
  // Onam: banana-leaf green with marigold and jasmine.
  theme('onam', '#15301f', '#1b3826', '#ffc24b', '#9c7a2a', '#fbf6e4', {
    RED: '#e8533f',
    GREEN: '#39b06f',
    YELLOW: '#ffcf3f',
    BLUE: '#3d7bd9',
  }),
  // Pongal: terracotta and turmeric, a kolam on the tiles.
  theme('pongal', '#3a1d10', '#46261a', '#ffb547', '#b86a2b', '#fff1dc', {
    RED: '#d8452f',
    GREEN: '#4caa5b',
    YELLOW: '#f5b82e',
    BLUE: '#3b6fd8',
  }),
  // Eid: emerald night with gold and a pale moonlit tile.
  theme('eid', '#0f2a24', '#153129', '#e9cf6a', '#9a7f36', '#f4f8f0', {
    RED: '#e5556b',
    GREEN: '#35c48f',
    YELLOW: '#f4c74f',
    BLUE: '#5b8cf0',
  }),
  // Christmas: midnight blue, holly red and green, snow-white tiles.
  theme('christmas', '#0e1a33', '#1b2b4f', '#ff5a5f', '#a63a3e', '#f7fbff', {
    RED: '#e63946',
    GREEN: '#2fa360',
    YELLOW: '#f6c54c',
    BLUE: '#5aa9ff',
  }),
];
export function getBoardTheme(id: string): BoardTheme {
  return BOARD_THEMES.find((t) => t.id === id) ?? BOARD_THEMES[0]!;
}

/** A board theme as the app chrome uses it in one appearance. */
export interface SchemeTheme extends BoardTheme {
  /** The accent as text: same hue, adjusted to 4.5:1 on background and surface. */
  readonly accentText: string;
}

/**
 * Every theme is designed for night. For day, its page and card colours
 * become a paper white tinted with the theme's own accent, so each pack keeps
 * its character; the accent itself stays for fills, and `accentText` is
 * darkened until it reads on white. The board, pieces and dice are unchanged.
 */
export function themeForScheme(base: BoardTheme, scheme: Scheme): SchemeTheme {
  if (scheme === 'dark') {
    return {
      ...base,
      accentText: readableOn(base.accent, [base.background, base.surface]),
    };
  }
  const background = mix('#fbf8f2', base.accent, 0.05);
  const surface = '#ffffff';
  return {
    ...base,
    background,
    surface,
    accentText: readableOn(base.accent, [background, surface]),
  };
}
export const DICE_FINISHES: Record<
  string,
  { face: string; pip: string; edge?: string; radius?: number; glow?: string; wood?: boolean }
> = {
  ivory: { face: '#fffdf7', pip: '#26334c' },
  gold: { face: '#f8ce6f', pip: '#67401b' },
  ruby: { face: '#e65c71', pip: '#fff1ef' },
  mint: { face: '#94e5cb', pip: '#1c5b50' },
  galaxy: { face: '#8c70cd', pip: '#faf0ff' },
  midnight: { face: '#263246', pip: '#ecc979' },
};
const SIGNATURE_DICE: Record<
  string,
  { face: string; pip: string; edge: string; radius: number; glow?: string; wood?: boolean }
> = {
  classic: { face: '#fff8e9', pip: '#ef5464', edge: '#c79458', radius: 10 },
  heritage: { face: '#e5c18b', pip: '#513720', edge: '#997045', radius: 7, wood: true },
  neon: { face: '#15223f', pip: '#7cebf7', edge: '#a060ff', radius: 5, glow: '#7cebf780' },
  royal: { face: '#412950', pip: '#ffe0a1', edge: '#b78c40', radius: 9 },
  forest: { face: '#37654a', pip: '#edf2ce', edge: '#183c2b', radius: 14 },
  ocean: { face: '#95ddeb', pip: '#133f67', edge: '#429aaa', radius: 12 },
  rose: { face: '#edc3d6', pip: '#753c63', edge: '#ba829f', radius: 16 },
  sunset: { face: '#efb079', pip: '#6b3322', edge: '#b2693f', radius: 8 },
  arctic: { face: '#e0f6ff', pip: '#417fa0', edge: '#92bbd0', radius: 4 },
  cosmic: { face: '#4d3677', pip: '#f4d0ff', edge: '#9874bd', radius: 11, glow: '#c6a4ff60' },
  jade: { face: '#75a481', pip: '#fcf1c3', edge: '#426848', radius: 6 },
  candy: { face: '#f5cee9', pip: '#9a548d', edge: '#d299c7', radius: 19 },
  obsidian: { face: '#292b2e', pip: '#ebcc86', edge: '#a48c57', radius: 3 },
  diwali: { face: '#3b2358', pip: '#ffd9a1', edge: '#c98f3f', radius: 12, glow: '#ffcf6f50' },
  holi: { face: '#fff5fb', pip: '#ff3d7f', edge: '#ffb000', radius: 14 },
  onam: { face: '#f8efc9', pip: '#2f6b44', edge: '#ffc24b', radius: 16 },
  pongal: { face: '#f5d8a8', pip: '#7a3b1a', edge: '#d88a3a', radius: 8 },
  eid: { face: '#1b3f36', pip: '#f1c860', edge: '#9a7f36', radius: 12, glow: '#f1c86050' },
  christmas: { face: '#f7fbff', pip: '#e63946', edge: '#2fa360', radius: 10 },
};
for (const [id, finish] of Object.entries(SIGNATURE_DICE)) DICE_FINISHES[id + '-dice'] = finish;

/** Pack cards have their own geometry and trim, beyond a palette swap. */
export function getCardDesign(id?: string | null) {
  const key = id?.replace(/-pack$/, '') ?? 'classic';
  const t = getBoardTheme(key);
  const radii: Record<string, number> = {
    classic: 14,
    heritage: 7,
    neon: 4,
    royal: 20,
    forest: 24,
    ocean: 28,
    rose: 22,
    sunset: 10,
    arctic: 3,
    cosmic: 18,
    jade: 8,
    candy: 30,
    obsidian: 2,
    diwali: 16,
    holi: 24,
    onam: 20,
    pongal: 8,
    eid: 18,
    christmas: 12,
  };
  return {
    borderRadius: radii[key] ?? 14,
    borderWidth: key === 'royal' || key === 'heritage' ? 2 : 1,
    borderColor: t.accent + '80',
    borderLeftWidth: key === 'forest' || key === 'jade' ? 5 : 1,
    borderBottomWidth: key === 'heritage' || key === 'sunset' ? 4 : 1,
    boxShadow:
      key === 'neon' || key === 'cosmic' ? '0 0 12px ' + t.accent + '30' : '0 3px 8px #00000020',
  };
}
