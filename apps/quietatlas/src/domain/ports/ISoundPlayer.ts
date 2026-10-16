export type SoundCue =
  | 'pop'
  | 'popHigh'
  | 'popLow'
  | 'golden'
  | 'sprinkle'
  | 'ink'
  | 'swish'
  | 'paper'
  | 'strike'
  | 'chime'
  | 'chimeLow'
  | 'tap';

/**
 * Short original effects, plus one sustained tone (the singing bowl's hum)
 * whose loudness a toy steers while the finger moves. Fire-and-forget.
 */
export interface ISoundPlayer {
  play(cue: SoundCue): void;
  /** Sets the hum's loudness, 0 (silent, paused) to 1. */
  hum(volume: number): void;
}

export const SILENT_SOUNDS: ISoundPlayer = {
  play() {},
  hum() {},
};
