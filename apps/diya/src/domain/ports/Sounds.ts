/** Diya's original sound effects (see scripts/generate-sounds.mjs). */
export type SoundCue =
  | 'tap'
  | 'place'
  | 'rotate'
  | 'lift'
  | 'nope'
  | 'light1'
  | 'light2'
  | 'light3'
  | 'light4'
  | 'light5'
  | 'light6'
  | 'win'
  | 'star'
  | 'hint';

/** Lamp chimes, each a step higher on a pentatonic scale, so lighting lamps in turn climbs. */
export const LIGHT_CUES: readonly SoundCue[] = [
  'light1',
  'light2',
  'light3',
  'light4',
  'light5',
  'light6',
];
