import type { OccasionId } from './Occasion';

/**
 * A card template is code, not a picture: a design (how the art is drawn),
 * a few colour palettes, where the words sit, the lettering, and the gentle
 * animation the editor plays. Everything is drawn on the phone, so there is
 * no stock imagery and nothing to download.
 */
export type DesignId =
  | 'diyas'
  | 'rangoli'
  | 'fireworks'
  | 'toran'
  | 'lanterns'
  | 'gulal'
  | 'splash'
  | 'florals'
  | 'confetti'
  | 'crescent'
  | 'jaali'
  | 'paperArch'
  | 'tree'
  | 'fairyLights'
  | 'baubles'
  | 'wreath'
  | 'bokeh'
  | 'pongalPot'
  | 'kolam'
  | 'kites'
  | 'rays'
  | 'rakhi'
  | 'hearts'
  | 'modak'
  | 'lotus'
  | 'dandiya'
  | 'alpona'
  | 'pookalam'
  | 'kasavu'
  | 'balloons'
  | 'cake'
  | 'sunrise'
  | 'chai'
  | 'moonlit';

/** Where the words sit on the card; the art is drawn around them. */
export type LayoutKind = 'center' | 'lower' | 'upper' | 'arch' | 'ring';

/** The lettering family; each language maps it to fonts that can draw it. */
export type TypeStyle = 'festive' | 'elegant' | 'script' | 'hand' | 'round';
export const TYPE_STYLES: readonly TypeStyle[] = ['festive', 'elegant', 'script', 'hand', 'round'];

/** The live animation in the editor preview. Exports are always still. */
export type FxKind = 'twinkle' | 'flicker' | 'snow' | 'confetti' | 'fireworks' | 'petals' | 'bokeh';

/** Colours of one palette variant. All values are #rrggbb. */
export interface CardPalette {
  readonly id: string;
  /** Background gradient, top to bottom. */
  readonly bg: readonly [string, string];
  /** The big greeting. */
  readonly ink: string;
  /** The message and sign-off. */
  readonly text: string;
  /** Ornaments, borders, metal. */
  readonly gold: string;
  readonly accent: string;
  readonly accent2: string;
  readonly accent3: string;
  /** Light from flames, lamps and the sun. */
  readonly glow: string;
  readonly dark: boolean;
}

export interface Template {
  readonly id: string;
  readonly occasion: OccasionId;
  readonly design: DesignId;
  readonly layout: LayoutKind;
  readonly type: TypeStyle;
  readonly fx: FxKind;
  readonly premium: boolean;
  /** At least one; the first is the default. */
  readonly palettes: readonly CardPalette[];
}
