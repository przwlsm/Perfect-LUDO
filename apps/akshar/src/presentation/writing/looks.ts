import type { PenId, SurfaceId } from '@/domain/entities/Cosmetics';

/** How a writing surface looks in one light. */
export interface SurfaceLook {
  /** Top-left and bottom-right of the paper's soft gradient. */
  readonly paper: readonly [string, string];
  readonly dark: boolean;
  /** Ruled lines and guide marks. */
  readonly rule: string;
  /** The letter's faint body in trace mode. */
  readonly guide: string;
  /** The dotted centre line. */
  readonly dots: string;
  /** Grain strength (0–1) of the paper or slate texture. */
  readonly grain: number;
}

export interface SurfaceStyle {
  readonly light: SurfaceLook;
  readonly dark: SurfaceLook;
}

const desk: SurfaceStyle = {
  light: {
    paper: ['#fffdf6', '#fbf2df'],
    dark: false,
    rule: 'rgba(66, 98, 170, 0.22)',
    guide: 'rgba(45, 52, 135, 0.10)',
    dots: 'rgba(45, 52, 135, 0.42)',
    grain: 0.06,
  },
  dark: {
    paper: ['#2a3436', '#1f2729'],
    dark: true,
    rule: 'rgba(240, 238, 228, 0.16)',
    guide: 'rgba(240, 238, 228, 0.10)',
    dots: 'rgba(240, 238, 228, 0.42)',
    grain: 0.1,
  },
};

const palmLeaf: SurfaceLook = {
  paper: ['#efd9a2', '#d8b46a'],
  dark: false,
  rule: 'rgba(110, 72, 20, 0.28)',
  guide: 'rgba(90, 55, 10, 0.12)',
  dots: 'rgba(90, 55, 10, 0.45)',
  grain: 0.12,
};
const kraft: SurfaceLook = {
  paper: ['#dfc29e', '#c9a175'],
  dark: false,
  rule: 'rgba(80, 50, 20, 0.25)',
  guide: 'rgba(60, 35, 10, 0.12)',
  dots: 'rgba(60, 35, 10, 0.45)',
  grain: 0.14,
};
const blackboard: SurfaceLook = {
  paper: ['#2b4a3a', '#1c3328'],
  dark: true,
  rule: 'rgba(235, 245, 235, 0.16)',
  guide: 'rgba(235, 245, 235, 0.10)',
  dots: 'rgba(235, 245, 235, 0.45)',
  grain: 0.14,
};
const midnight: SurfaceLook = {
  paper: ['#1c2350', '#111634'],
  dark: true,
  rule: 'rgba(190, 200, 255, 0.16)',
  guide: 'rgba(200, 210, 255, 0.10)',
  dots: 'rgba(210, 220, 255, 0.45)',
  grain: 0.08,
};

export const SURFACE_LOOKS: Readonly<Record<SurfaceId, SurfaceStyle>> = {
  desk,
  palmLeaf: { light: palmLeaf, dark: palmLeaf },
  kraft: { light: kraft, dark: kraft },
  blackboard: { light: blackboard, dark: blackboard },
  midnight: { light: midnight, dark: midnight },
};

/** How a pen's ink looks on light and on dark surfaces. */
export interface PenLook {
  readonly onLight: string;
  readonly onDark: string;
  /** A metallic gradient across the page (gold), on light and on dark surfaces. */
  readonly shimmer?: { readonly light: readonly string[]; readonly dark: readonly string[] };
  /** Rough, dusty edges (chalk, pencil). */
  readonly rough: number;
  readonly opacity: number;
}

export const PEN_LOOKS: Readonly<Record<PenId, PenLook>> = {
  ink: { onLight: '#24297a', onDark: '#f4f1e8', rough: 0, opacity: 1 },
  pencil: { onLight: '#4b4b55', onDark: '#d2d6d8', rough: 0.6, opacity: 0.9 },
  gold: {
    onLight: '#7d5200',
    onDark: '#f2c94c',
    shimmer: {
      light: ['#7a5000', '#a8740a', '#6e4800', '#9c6c08', '#7a5000'],
      dark: ['#f7dd8a', '#d9a53a', '#fbe7a6', '#c99419', '#f2c94c'],
    },
    rough: 0,
    opacity: 1,
  },
  fountain: { onLight: '#1b2a6b', onDark: '#a9c7ff', rough: 0, opacity: 1 },
  vermilion: { onLight: '#b8321a', onDark: '#ff8467', rough: 0, opacity: 1 },
  chalkRose: { onLight: '#9a2f55', onDark: '#f6a9bf', rough: 1.4, opacity: 0.94 },
  chalkMint: { onLight: '#1d6650', onDark: '#9fe6cc', rough: 1.4, opacity: 0.94 },
};

export function surfaceLook(id: SurfaceId, darkTheme: boolean): SurfaceLook {
  const style = SURFACE_LOOKS[id] ?? desk;
  return darkTheme ? style.dark : style.light;
}

export function inkColour(pen: PenId, surface: SurfaceLook): string {
  const look = PEN_LOOKS[pen] ?? PEN_LOOKS.ink;
  return surface.dark ? look.onDark : look.onLight;
}
