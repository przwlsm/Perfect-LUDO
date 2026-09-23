export interface BoardTheme {
  readonly id: string;
  readonly background: string;
  readonly surface: string;
  readonly accent: string;
  readonly frame: string;
  readonly tile: string;
  readonly line: string;
  readonly colors: { RED: string; GREEN: string; YELLOW: string; BLUE: string };
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
  return { id, background, surface, accent, frame, tile, line: '#18233835', colors };
}
export const BOARD_THEMES: readonly BoardTheme[] = [
  theme('classic', '#0e1322', '#1a2235', '#ffc568', '#b77739', '#fff8e9'),
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
export const DICE_FINISHES: Record<string, { face: string; pip: string }> = {
  ivory: { face: '#fff8e9', pip: '#26334c' },
  gold: { face: '#f8ce6f', pip: '#67401b' },
  ruby: { face: '#e65c71', pip: '#fff1ef' },
  mint: { face: '#94e5cb', pip: '#1c5b50' },
  galaxy: { face: '#8c70cd', pip: '#faf0ff' },
  midnight: { face: '#263246', pip: '#ecc979' },
};
export const ui = {
  text: '#f5f3ff',
  muted: '#a3adc4',
  subtle: '#738098',
  line: '#ffffff12',
  green: '#4edea3',
  gold: '#ffc568',
  danger: '#ff8795',
};
