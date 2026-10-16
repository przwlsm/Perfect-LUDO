import type { CardFormat, PhotoShape } from '@/domain/entities/Card';
import type { LayoutKind } from '@/domain/entities/Template';

/**
 * Card geometry. Every card is designed on a 1080-wide canvas (1080×1080
 * square, 1080×1920 status) and scaled for previews and exports, so a card
 * looks the same at every size.
 */
export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export const CARD_WIDTH = 1080;

export function cardSize(format: CardFormat): { w: number; h: number } {
  return { w: CARD_WIDTH, h: format === 'story' ? 1920 : 1080 };
}

/**
 * Status/story viewers cover the top (name, progress bar) and bottom
 * (reply box) of the image; words stay out of these bands.
 */
export const STORY_SAFE = { top: 250, bottom: 280 } as const;

const ZONES: Record<CardFormat, Record<LayoutKind, Rect>> = {
  square: {
    center: { x: 130, y: 170, w: 820, h: 740 },
    lower: { x: 110, y: 500, w: 860, h: 500 },
    upper: { x: 110, y: 80, w: 860, h: 540 },
    arch: { x: 255, y: 330, w: 570, h: 560 },
    ring: { x: 290, y: 300, w: 500, h: 480 },
  },
  story: {
    center: { x: 120, y: 430, w: 840, h: 1060 },
    lower: { x: 100, y: 880, w: 880, h: 760 },
    upper: { x: 100, y: 300, w: 880, h: 820 },
    arch: { x: 225, y: 660, w: 630, h: 880 },
    ring: { x: 270, y: 700, w: 540, h: 560 },
  },
};

/** Where the words (and the photo, if any) sit. The art is drawn around this. */
export function textZone(layout: LayoutKind, format: CardFormat): Rect {
  return ZONES[format][layout];
}

export function contains(outer: Rect, inner: Rect): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.w <= outer.x + outer.w &&
    inner.y + inner.h <= outer.y + outer.h
  );
}

export function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

/** One block in the vertical stack of a card's words. */
export interface StackItem {
  readonly key: string;
  /** Font size (or photo size) range; the stack shrinks everything together. */
  readonly min: number;
  readonly max: number;
  /** Height at a size, and whether it fits the line rules (no word wider than the zone). */
  readonly measure: (size: number) => { height: number; fits: boolean };
  /** Space below this block. */
  readonly gap: number;
}

export interface Placed {
  readonly key: string;
  readonly size: number;
  readonly y: number;
  readonly height: number;
}

/**
 * Sizes and places the blocks so they fill as much of `zone` as they can
 * and are centred vertically in it. All blocks shrink by the same fraction
 * between their max and min; the largest fraction that fits wins (binary
 * search). If nothing fits even at the minimum, the minimum is used.
 */
export function fitStack(items: readonly StackItem[], zone: Rect): Placed[] {
  const at = (s: number) =>
    items.map((item) => {
      const size = item.min + (item.max - item.min) * s;
      return { item, size, ...item.measure(size) };
    });
  const total = (rows: ReturnType<typeof at>) =>
    rows.reduce((sum, r, i) => sum + r.height + (i < rows.length - 1 ? r.item.gap : 0), 0);
  const ok = (s: number) => {
    const rows = at(s);
    return rows.every((r) => r.fits) && total(rows) <= zone.h;
  };
  let best = 0;
  if (ok(1)) best = 1;
  else {
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 14; i++) {
      const mid = (lo + hi) / 2;
      if (ok(mid)) lo = mid;
      else hi = mid;
    }
    best = lo;
  }
  const rows = at(best);
  let y = zone.y + Math.max(0, (zone.h - total(rows)) / 2);
  return rows.map((r) => {
    const placed = { key: r.item.key, size: r.size, y, height: r.height };
    y += r.height + r.item.gap;
    return placed;
  });
}

/** The photo frame's height for its width: circles are round, arches a little tall. */
export function photoHeight(shape: PhotoShape, width: number): number {
  return shape === 'arch' ? width * 1.22 : width;
}

/**
 * Where to draw a photo so it covers `frame` at `zoom` (≥ 1) and slides
 * by `x`/`y` (-1…1) across the part that overflows. x = 1 shows the
 * photo's left edge, -1 its right edge.
 */
export function photoCover(
  imgW: number,
  imgH: number,
  frame: Rect,
  zoom: number,
  x: number,
  y: number,
): Rect {
  'worklet';
  const scale = Math.max(frame.w / imgW, frame.h / imgH) * Math.max(1, zoom);
  const w = imgW * scale;
  const h = imgH * scale;
  const cx = Math.max(-1, Math.min(1, x));
  const cy = Math.max(-1, Math.min(1, y));
  return {
    x: frame.x - ((w - frame.w) / 2) * (1 - cx),
    y: frame.y - ((h - frame.h) / 2) * (1 - cy),
    w,
    h,
  };
}

/**
 * The photo offset after a drag of (dx, dy) card pixels, clamped so the
 * photo always covers its frame.
 */
export function dragPhoto(
  imgW: number,
  imgH: number,
  frame: Rect,
  zoom: number,
  x: number,
  y: number,
  dx: number,
  dy: number,
): { x: number; y: number } {
  'worklet';
  const scale = Math.max(frame.w / imgW, frame.h / imgH) * Math.max(1, zoom);
  const spareX = (imgW * scale - frame.w) / 2;
  const spareY = (imgH * scale - frame.h) / 2;
  const nx = spareX > 0.5 ? x + dx / spareX : 0;
  const ny = spareY > 0.5 ? y + dy / spareY : 0;
  return { x: Math.max(-1, Math.min(1, nx)), y: Math.max(-1, Math.min(1, ny)) };
}

export const MAX_PHOTO_ZOOM = 4;

export function clampZoom(zoom: number): number {
  'worklet';
  return Math.max(1, Math.min(MAX_PHOTO_ZOOM, zoom));
}

/** Pixel size of a preview that fits `maxW`×`maxH` and keeps the card's shape. */
export function fitPreview(
  format: CardFormat,
  maxW: number,
  maxH: number,
): { w: number; h: number } {
  const { w, h } = cardSize(format);
  const scale = Math.min(maxW / w, maxH / h);
  return { w: Math.floor(w * scale), h: Math.floor(h * scale) };
}
