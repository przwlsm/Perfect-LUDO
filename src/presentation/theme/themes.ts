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
    RED: string;
    GREEN: string;
    YELLOW: string;
    BLUE: string;
  };
}
const classic = { RED: '#ef5464', GREEN: '#22c99a', YELLOW: '#ffc746', BLUE: '#548bff' };
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
    colors: { ...colors, PURPLE: '#a77bea', ORANGE: '#ee9147' },
  };
}
export const BOARD_THEMES: readonly BoardTheme[] = [
  theme('classic', '#0e1322', '#1a2235', '#ffc568', '#b77739', '#fff8e9'),
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
];
export function getBoardTheme(id: string): BoardTheme {
  return BOARD_THEMES.find((t) => t.id === id) ?? BOARD_THEMES[0]!;
}
export const DICE_FINISHES: Record<
  string,
  { face: string; pip: string; edge?: string; radius?: number; glow?: string; wood?: boolean }
> = {
  ivory: { face: '#fff8e9', pip: '#26334c' },
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
export const ui = {
  text: '#f5f3ff',
  muted: '#a3adc4',
  subtle: '#738098',
  line: '#ffffff12',
  green: '#4edea3',
  gold: '#ffc568',
  violet: '#a78bfa',
  danger: '#ff8795',
};
