import { CUP_SIZE } from '@/domain/entities/Level';

/** Where one cup stands: its centre, the counter line under it, its width and layer height. */
export interface CupSlot {
  readonly x: number;
  /** The counter top the cup stands on. */
  readonly base: number;
  readonly cap: number;
  readonly row: number;
}

export interface CounterLayout {
  readonly width: number;
  readonly height: number;
  /** Outer width of a cup at its rim. */
  readonly w: number;
  /** Height of one layer. */
  readonly lh: number;
  /** Width each cup is given on its row (its tap target). */
  readonly slotW: number;
  /** How far a picked-up cup rises. */
  readonly liftH: number;
  readonly slots: readonly CupSlot[];
  /** One counter per row: its top y and how far it spans. */
  readonly shelves: readonly { readonly y: number; readonly x0: number; readonly x1: number }[];
}

/** Layers per cup width: a cup of four is a little taller than it is wide, like a kulhad. */
const LAYER_RATIO = 0.4;
/** Space a cup needs above its layers (rim and headroom) and below (foot), in layers. */
const HEAD = 0.5;
const FOOT = 0.32;
/** Room above a row for a lifted cup and its steam, in layers. */
const ABOVE = 2.6;
/** The counter slab under each row, in layers. */
const SLAB = 0.7;

/** The height of a cup holding `cap` layers, in layers. */
export function cupHeightInLayers(cap: number): number {
  return cap + HEAD + FOOT;
}

/**
 * Lays cups out in one row (up to five), two or three, whichever lets the
 * cups be largest (three rows only for a busy counter, and only when it
 * clearly helps): the counter fills the space between the order ticket
 * and the toolbar.
 */
export function layoutCounter(
  caps: readonly number[],
  width: number,
  height: number,
): CounterLayout {
  const n = caps.length;
  const options = n <= 5 || (width >= 600 && n <= 7) ? [1] : n >= 9 ? [2, 3] : [2];
  let best: CounterLayout | null = null;
  for (const rows of options) {
    const candidate = arrange(caps, width, height, rows);
    if (!best || candidate.lh > best.lh * 1.12) best = candidate;
  }
  return best!;
}

function arrange(
  caps: readonly number[],
  width: number,
  height: number,
  rows: number,
): CounterLayout {
  const n = caps.length;
  const perRow = Math.ceil(n / rows);
  const rowCaps: number[][] = Array.from({ length: rows }, () => []);
  caps.forEach((c, i) => rowCaps[Math.min(rows - 1, Math.floor(i / perRow))]!.push(c));

  const margin = 12;
  let slotW = Math.min((width - margin * 2) / perRow, 124);
  let w = slotW * 0.74;
  let lh = w * LAYER_RATIO;
  // Fit the height: each row needs its tallest cup, the space above and the slab.
  const rowHeight = (row: number[]) =>
    (cupHeightInLayers(Math.max(CUP_SIZE, ...row)) + ABOVE + SLAB) * lh;
  const needed = rowCaps.reduce((s, r) => s + rowHeight(r), 0);
  if (needed > height) {
    const k = height / needed;
    lh *= k;
    w *= k;
    slotW = Math.max(slotW * k, w / 0.74);
  }
  const total = rowCaps.reduce((s, r) => s + rowHeight(r), 0);
  let y = Math.max(0, (height - total) / 2);
  const slots: CupSlot[] = [];
  const shelves: { y: number; x0: number; x1: number }[] = [];
  rowCaps.forEach((row, r) => {
    const base = y + rowHeight(row) - SLAB * lh;
    const span = row.length * slotW;
    const x0 = (width - span) / 2;
    row.forEach((cap, k) => slots.push({ x: x0 + slotW * (k + 0.5), base, cap, row: r }));
    shelves.push({
      y: base,
      x0: Math.max(4, x0 - slotW * 0.25),
      x1: Math.min(width - 4, x0 + span + slotW * 0.25),
    });
    y += rowHeight(row);
  });
  return { width, height, w, lh, slotW, liftH: lh * 0.9, slots, shelves };
}
