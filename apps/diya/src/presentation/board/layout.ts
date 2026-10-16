import type { Level, PieceKind } from '@/domain/entities/Board';

export const TRAY_ORDER: readonly PieceKind[] = ['mirror', 'prism', 'red', 'yellow', 'blue'];

export interface TraySlot {
  readonly kind: PieceKind;
  /** Centre of the slot. */
  readonly x: number;
  readonly y: number;
}

/** Where everything sits inside the play area, in dp. */
export interface BoardLayout {
  readonly width: number;
  readonly height: number;
  readonly cell: number;
  /** Top-left of the board's grid. */
  readonly bx: number;
  readonly by: number;
  readonly bw: number;
  readonly bh: number;
  /** Padding of the frame around the grid. */
  readonly pad: number;
  readonly trayY: number;
  readonly traySlot: number;
  readonly slots: readonly TraySlot[];
}

const TRAY_GAP = 14;

/** Fits the board and its tray into `width` x `height`, cells as large as they can be. */
export function layoutBoard(level: Level, width: number, height: number): BoardLayout {
  const kinds = TRAY_ORDER.filter((k) => level.tray.includes(k));
  const hasTray = kinds.length > 0;
  const trayH = hasTray ? 76 : 0;
  const pad = 10;
  const availW = width - pad * 2 - 28;
  const availH = height - trayH - (hasTray ? TRAY_GAP : 0) - pad * 2 - 4;
  const cell = Math.max(24, Math.floor(Math.min(availW / level.w, availH / level.h, 80)));
  const bw = cell * level.w;
  const bh = cell * level.h;
  const bx = Math.round((width - bw) / 2);
  const used = bh + pad * 2 + (hasTray ? TRAY_GAP + trayH : 0);
  const by = Math.round(Math.max(pad, (height - used) / 2 + pad));
  const trayY = by + bh + pad + TRAY_GAP + trayH / 2;
  const traySlot = Math.min(64, Math.floor((width - 32) / Math.max(1, kinds.length)) - 8);
  const step = traySlot + 12;
  const first = width / 2 - (step * (kinds.length - 1)) / 2;
  const slots = kinds.map((kind, i) => ({ kind, x: first + i * step, y: trayY }));
  return { width, height, cell, bx, by, bw, bh, pad, trayY, traySlot, slots };
}

/** The board cell under a point, or -1. */
export function cellAt(l: BoardLayout, level: Level, x: number, y: number): number {
  const cx = Math.floor((x - l.bx) / l.cell);
  const cy = Math.floor((y - l.by) / l.cell);
  if (cx < 0 || cy < 0 || cx >= level.w || cy >= level.h) return -1;
  return cy * level.w + cx;
}

/** The tray slot under a point (with a generous margin), or null. */
export function slotAt(l: BoardLayout, x: number, y: number): TraySlot | null {
  const half = l.traySlot / 2 + 6;
  return l.slots.find((s) => Math.abs(s.x - x) <= half && Math.abs(s.y - y) <= half + 4) ?? null;
}

export function cellCentre(l: BoardLayout, level: Level, at: number): { x: number; y: number } {
  const x = at % level.w;
  const y = (at - x) / level.w;
  return { x: l.bx + (x + 0.5) * l.cell, y: l.by + (y + 0.5) * l.cell };
}
