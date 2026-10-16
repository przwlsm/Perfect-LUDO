import { random } from '../random';

/**
 * A sheet of bubble wrap: bubbles packed in offset rows, the way the real
 * thing is made. A few rare golden bubbles hide in some sheets.
 */
export interface Bubble {
  readonly x: number;
  readonly y: number;
  readonly r: number;
  readonly golden: boolean;
  /** Pitch variation for its pop, -1..1, so a run of pops never sounds mechanical. */
  readonly pitch: number;
}

export interface Sheet {
  readonly bubbles: readonly Bubble[];
  readonly width: number;
  readonly height: number;
}

/** About one bubble in this many is golden. */
export const GOLDEN_ODDS = 70;

/** Packs bubbles of about `target` radius into a width × height sheet. */
export function makeSheet(width: number, height: number, seed: number, target = 30): Sheet {
  const rand = random(seed);
  const cols = Math.max(3, Math.floor(width / (target * 2.15)));
  const pitch = width / (cols + 0.5);
  const r = pitch * 0.44;
  const rowStep = pitch * 0.88;
  const rows = Math.max(3, Math.floor((height - pitch * 0.2) / rowStep));
  const top = (height - (rows - 1) * rowStep) / 2;
  const bubbles: Bubble[] = [];
  for (let row = 0; row < rows; row++) {
    const offset = row % 2 === 0 ? pitch * 0.5 : pitch;
    for (let col = 0; col < cols; col++) {
      bubbles.push({
        x: offset + col * pitch,
        y: top + row * rowStep,
        r,
        golden: rand() < 1 / GOLDEN_ODDS,
        pitch: rand() * 2 - 1,
      });
    }
  }
  return { bubbles, width, height };
}

/** The bubble under a finger at (x, y), or -1. A little forgiving at the edge. */
export function bubbleAt(sheet: Sheet, x: number, y: number): number {
  for (let i = 0; i < sheet.bubbles.length; i++) {
    const b = sheet.bubbles[i]!;
    if (Math.hypot(x - b.x, y - b.y) <= b.r * 1.08) return i;
  }
  return -1;
}
