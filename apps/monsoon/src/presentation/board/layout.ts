import type { Level } from '@/domain/entities/Board';

/** Where the board sits inside its area, in dp. */
export interface BoardLayout {
  readonly width: number;
  readonly height: number;
  readonly cell: number;
  /** Top-left of the grid. */
  readonly bx: number;
  readonly by: number;
  readonly bw: number;
  readonly bh: number;
  /** The stone frame around the grid. */
  readonly pad: number;
}

/** Fits the board into `width` x `height`, cells as large as they can be (up to `maxCell`). */
export function layoutBoard(
  level: Pick<Level, 'w' | 'h'>,
  width: number,
  height: number,
  maxCell = 78,
): BoardLayout {
  // Room around the frame for its shadow.
  const margin = 8;
  const guess = Math.min((width - margin * 2) / level.w, (height - margin * 2) / level.h);
  const pad = Math.max(6, Math.round(guess * 0.16));
  const cell = Math.max(
    20,
    Math.floor(
      Math.min(
        (width - margin * 2 - pad * 2) / level.w,
        (height - margin * 2 - pad * 2) / level.h,
        maxCell,
      ),
    ),
  );
  const bw = cell * level.w;
  const bh = cell * level.h;
  const bx = Math.round((width - bw) / 2);
  const by = Math.round((height - bh) / 2);
  return { width, height, cell, bx, by, bw, bh, pad };
}

/** The board cell under a point, or -1. */
export function cellAt(
  l: BoardLayout,
  level: Pick<Level, 'w' | 'h'>,
  x: number,
  y: number,
): number {
  const cx = Math.floor((x - l.bx) / l.cell);
  const cy = Math.floor((y - l.by) / l.cell);
  if (cx < 0 || cy < 0 || cx >= level.w || cy >= level.h) return -1;
  return cy * level.w + cx;
}

export function cellCentre(
  l: BoardLayout,
  level: Pick<Level, 'w'>,
  at: number,
): { x: number; y: number } {
  const x = at % level.w;
  const y = (at - x) / level.w;
  return { x: l.bx + (x + 0.5) * l.cell, y: l.by + (y + 0.5) * l.cell };
}
