export type SoundCue = 'select' | 'place' | 'move' | 'capture' | 'win' | 'lose';

/** Short effects for what just happened on the board. Fire-and-forget. */
export interface ISoundPlayer {
  play(cue: SoundCue): void;
}

/** What the board uses when the player has turned sound off. */
export const SILENT_SOUNDS: ISoundPlayer = {
  play() {},
};
