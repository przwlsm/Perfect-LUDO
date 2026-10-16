/**
 * The touches a toy gives back. Fire-and-forget; a device without a motor,
 * or a player who turned haptics off, feels nothing.
 */
export interface IHaptics {
  /** The lightest grain: powder falling, a brush moving, a dial step. */
  tick(): void;
  /** A gentle press: a drop of ink, a stamp, a button. */
  tap(): void;
  /** A crisp pop: a bubble. */
  pop(): void;
  /** A deep, soft thump: a bowl struck, a breath turning. */
  thump(): void;
  /** Something lovely happened: a golden bubble, a finished picture. */
  delight(): void;
}

export const SILENT_HAPTICS: IHaptics = {
  tick() {},
  tap() {},
  pop() {},
  thump() {},
  delight() {},
};
