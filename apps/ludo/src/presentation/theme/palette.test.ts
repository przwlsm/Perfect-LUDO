import { contrast } from './color';
import { DARK, LIGHT, PALETTES, type Scheme } from './palette';
import { BADGE, MARIGOLD, NAVY_HERO } from './surfaces';
import { BOARD_THEMES, themeForScheme } from './themes';

const TEXT_TOKENS = [
  'text',
  'muted',
  'subtle',
  'green',
  'gold',
  'violet',
  'danger',
  'blue',
  'gem',
] as const;
const SCHEMES: Scheme[] = ['light', 'dark'];

describe.each(SCHEMES)('%s mode', (scheme) => {
  const ui = PALETTES[scheme];
  const themes = BOARD_THEMES.map((theme) => themeForScheme(theme, scheme));
  const pages = [
    ui.background,
    ui.inset,
    ...themes.flatMap((theme) => [theme.background, theme.surface]),
  ];

  it.each(TEXT_TOKENS)('%s text passes WCAG AA on every page and card', (token) => {
    const failures = pages
      .map((bg) => ({ bg, ratio: contrast(ui[token], bg) }))
      .filter(({ ratio }) => ratio < 4.5)
      .map(({ bg, ratio }) => `${bg} ${ratio.toFixed(2)}`);
    expect(failures).toEqual([]);
  });

  it('every theme accent reads as text on its own page and cards', () => {
    const failures = themes
      .filter(
        (theme) =>
          contrast(theme.accentText, theme.background) < 4.5 ||
          contrast(theme.accentText, theme.surface) < 4.5,
      )
      .map((theme) => theme.id);
    expect(failures).toEqual([]);
  });
});

it('day mode keeps each theme recognisable: tinted paper, not plain white', () => {
  const light = BOARD_THEMES.map((theme) => themeForScheme(theme, 'light').background);
  expect(new Set(light).size).toBe(BOARD_THEMES.length);
});

it('every night text token reads on every stop of the navy hero', () => {
  const failures = NAVY_HERO.flatMap((stop) =>
    TEXT_TOKENS.filter((token) => contrast(DARK[token], stop) < 4.5).map(
      (token) => `${token} on ${stop}`,
    ),
  );
  expect(failures).toEqual([]);
});

it('navy and muted text read on every stop of the marigold card', () => {
  const failures = MARIGOLD.flatMap((stop) =>
    (['text', 'muted'] as const)
      .filter((token) => contrast(LIGHT[token], stop) < 4.5)
      .map((token) => `${token} on ${stop}`),
  );
  expect(failures).toEqual([]);
});

it('white badge text reads on every badge fill', () => {
  const failures = Object.entries(BADGE)
    .filter(([, fill]) => contrast('#ffffff', fill) < 4.5)
    .map(([name]) => name);
  expect(failures).toEqual([]);
});

describe.each(SCHEMES)('%s mode controls', (scheme) => {
  const ui = PALETTES[scheme];
  const cards = scheme === 'light' ? ['#ffffff', ui.background] : ['#1a1f2f', ui.background];

  it('the off track of a switch stands out from cards (3:1, as controls need)', () => {
    const failures = cards.filter((card) => contrast(ui.track, card) < 3);
    expect(failures).toEqual([]);
  });

  it('a disabled button label still reads', () => {
    expect(contrast(ui.subtle, ui.surfaceHigh)).toBeGreaterThanOrEqual(4.5);
  });
});
