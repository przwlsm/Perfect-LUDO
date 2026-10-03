/**
 * The three touches the board gives back: picking a piece up, setting it
 * down, and a capture. Fire-and-forget; a device without a motor is silent.
 */
export interface IHaptics {
  select(): void;
  drop(): void;
  capture(): void;
}

/** What the board uses when the player has turned haptics off. */
export const SILENT_HAPTICS: IHaptics = {
  select() {},
  drop() {},
  capture() {},
};
