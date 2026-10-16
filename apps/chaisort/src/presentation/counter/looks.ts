import type { CupThemeId } from '@/domain/entities/CupTheme';

/**
 * How each cup theme is drawn. Looks only: every theme holds the same
 * layers the same way. Colours here are art, not interface text.
 */
export interface CupLook {
  readonly id: CupThemeId;
  readonly shape: 'kulhad' | 'cutting' | 'copper' | 'porcelain' | 'neon';
  /** Interior narrows to this fraction of the rim width at the bottom. */
  readonly taper: number;
  /** Interior half-width as a fraction of the outer half-width (the rest is wall). */
  readonly inner: number;
  /** Outer body: light and dark. */
  readonly body: readonly [string, string];
  /** The inside back wall, seen when a cup is empty. */
  readonly inside: string;
  /** Rim highlight and trim. */
  readonly rim: string;
  readonly trim: string;
  /** Neon rims cycle through these, one per cup. */
  readonly neon?: readonly string[];
}

export const LOOKS: Readonly<Record<CupThemeId, CupLook>> = {
  kulhad: {
    id: 'kulhad',
    shape: 'kulhad',
    taper: 0.76,
    inner: 0.8,
    body: ['#d27a47', '#97461f'],
    inside: '#4a2414',
    rim: '#eaa070',
    trim: '#7a3518',
  },
  cutting: {
    id: 'cutting',
    shape: 'cutting',
    taper: 0.8,
    inner: 0.92,
    body: ['rgba(255,255,255,0.32)', 'rgba(255,255,255,0.12)'],
    inside: 'rgba(255,255,255,0.08)',
    rim: 'rgba(255,255,255,0.85)',
    trim: 'rgba(255,255,255,0.45)',
  },
  copper: {
    id: 'copper',
    shape: 'copper',
    taper: 0.9,
    inner: 0.84,
    body: ['#f0a36a', '#8e4420'],
    inside: '#3b1b0c',
    rim: '#ffd0a0',
    trim: '#6b2e12',
  },
  porcelain: {
    id: 'porcelain',
    shape: 'porcelain',
    taper: 0.66,
    inner: 0.88,
    body: ['#ffffff', '#ddd6cc'],
    inside: '#f1e9de',
    rim: '#ffffff',
    trim: '#2f5fa8',
  },
  nightmarket: {
    id: 'nightmarket',
    shape: 'neon',
    taper: 0.88,
    inner: 0.9,
    body: ['rgba(40,20,70,0.55)', 'rgba(20,10,40,0.55)'],
    inside: 'rgba(30,14,60,0.45)',
    rim: '#ffffff',
    trim: '#ff4fd8',
    neon: ['#ff4fd8', '#3ff2ff', '#b6ff4a', '#ffc23f', '#8f7bff'],
  },
};
