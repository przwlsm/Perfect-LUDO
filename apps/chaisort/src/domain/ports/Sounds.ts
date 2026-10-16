/** Chai Sort's original sound effects (see scripts/generate-sounds.mjs). */
export type SoundCue =
  | 'tap'
  | 'lift'
  | 'clink'
  | 'pour1'
  | 'pour2'
  | 'pour3'
  | 'pour4'
  | 'pour5'
  | 'ting'
  | 'order'
  | 'nope'
  | 'undo'
  | 'star'
  | 'hint'
  | 'lid';

/**
 * The pour gurgle, each a step higher: the target cup's pitch rises as it
 * fills, like the real thing.
 */
export const POUR_CUES: readonly SoundCue[] = ['pour1', 'pour2', 'pour3', 'pour4', 'pour5'];

/** The gurgle for a pour that leaves a cup `fill` full (0–1). */
export function pourCue(fill: number): SoundCue {
  const i = Math.round(Math.max(0, Math.min(1, fill)) * (POUR_CUES.length - 1));
  return POUR_CUES[i]!;
}
