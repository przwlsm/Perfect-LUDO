/**
 * Short effects, plus an optional sustained loop whose loudness an app can
 * steer live (a hum, rain, a crowd). Fire-and-forget; never throws.
 */
export interface ISoundPlayer<Cue extends string = string> {
  play(cue: Cue): void;
  /** Sets the loop's loudness, 0 (silent, paused) to 1. A no-op without a loop. */
  loop(volume: number): void;
}

export function silentSounds<Cue extends string>(): ISoundPlayer<Cue> {
  return { play() {}, loop() {} };
}
