/**
 * A Chai Sort level: a counter of cups, each holding layers of ingredients.
 *
 * A layer is stored as a small number: the ingredient's index, plus HIDDEN
 * when it sits under the froth (unseen until it becomes the top layer).
 * Layers are listed bottom first.
 */

/** Layers of each ingredient on the counter: a finished cup holds exactly this many. */
export const UNITS = 4;
/** The usual cup; a tall glass holds more. */
export const CUP_SIZE = 4;
export const TALL_SIZE = 6;
/** Added to a layer's ingredient index while it is hidden under froth. */
export const HIDDEN = 32;

export function ingOf(layer: number): number {
  return layer & (HIDDEN - 1);
}

export function isHidden(layer: number): boolean {
  return (layer & HIDDEN) !== 0;
}

export interface CupSpec {
  /** Layers it can hold: CUP_SIZE, or TALL_SIZE for a tall glass. */
  readonly cap: number;
  /** Pours left (anywhere on the counter) before its lid lifts; 0 = open. */
  readonly lid: number;
  /** Bottom first. */
  readonly layers: readonly number[];
}

/** The one-line lessons, each shown the first time its idea appears. */
export type Lesson = 'pour' | 'match' | 'serve' | 'froth' | 'oneSpare' | 'lid' | 'tall' | 'spice';

export interface Level {
  readonly id: string;
  readonly cups: readonly CupSpec[];
  /** Pours a good player needs: the solver's best route plus a little room. */
  readonly par: number;
  /** The fewest pours the solver found. */
  readonly best: number;
  readonly lesson?: Lesson;
}

/** The ingredients on a level, in index order. */
export function ingredientsOf(level: Pick<Level, 'cups'>): number[] {
  const seen = new Set<number>();
  for (const cup of level.cups) for (const l of cup.layers) seen.add(ingOf(l));
  return [...seen].sort((a, b) => a - b);
}
