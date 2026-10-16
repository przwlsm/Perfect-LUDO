/** Monsoon Fields' original sound effects (see scripts/generate-sounds.mjs). */
export type SoundCue =
  | 'tap'
  | 'clack'
  | 'nope'
  | 'sprout'
  | 'chime1'
  | 'chime2'
  | 'chime3'
  | 'chime4'
  | 'chime5'
  | 'chime6'
  | 'splash'
  | 'frog'
  | 'win'
  | 'star'
  | 'hint';

/** Field chimes, each a step higher on a pentatonic scale, so fields watered in turn climb. */
export const CHIME_CUES: readonly SoundCue[] = [
  'chime1',
  'chime2',
  'chime3',
  'chime4',
  'chime5',
  'chime6',
];
