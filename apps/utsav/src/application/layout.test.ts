import type { CardFormat } from '@/domain/entities/Card';
import type { LayoutKind } from '@/domain/entities/Template';
import {
  cardSize,
  contains,
  dragPhoto,
  fitPreview,
  fitStack,
  overlaps,
  photoCover,
  photoHeight,
  STORY_SAFE,
  textZone,
  clampZoom,
  type StackItem,
} from './layout';

const LAYOUTS: LayoutKind[] = ['center', 'lower', 'upper', 'arch', 'ring'];
const FORMATS: CardFormat[] = ['square', 'story'];

describe('text zones', () => {
  it.each(FORMATS)('%s zones sit inside the card with a margin', (format) => {
    const { w, h } = cardSize(format);
    const inner = { x: 60, y: 60, w: w - 120, h: h - 120 };
    for (const layout of LAYOUTS) expect(contains(inner, textZone(layout, format))).toBe(true);
  });

  it('keeps status words clear of the viewer bars', () => {
    const { h } = cardSize('story');
    for (const layout of LAYOUTS) {
      const z = textZone(layout, 'story');
      expect(z.y).toBeGreaterThanOrEqual(STORY_SAFE.top);
      expect(z.y + z.h).toBeLessThanOrEqual(h - STORY_SAFE.bottom);
    }
  });

  it('lower and upper zones leave room for art on the other half', () => {
    for (const format of FORMATS) {
      const { w, h } = cardSize(format);
      const lower = textZone('lower', format);
      const upper = textZone('upper', format);
      expect(overlaps(lower, { x: 0, y: 0, w, h: h * 0.4 })).toBe(false);
      expect(overlaps(upper, { x: 0, y: h * 0.6, w, h: h * 0.4 })).toBe(false);
    }
  });
});

/** A fake text block: `chars` characters wrap at 0.55 em per character. */
function block(key: string, chars: number, min: number, max: number, width: number): StackItem {
  return {
    key,
    min,
    max,
    gap: 20,
    measure: (size) => {
      const perLine = Math.max(1, Math.floor(width / (size * 0.55)));
      const lines = Math.ceil(chars / perLine);
      return { height: lines * size * 1.3, fits: size * 0.55 * 6 <= width };
    },
  };
}

describe('fitStack', () => {
  const zone = { x: 100, y: 200, w: 800, h: 600 };

  it('uses the largest sizes when there is room, centred in the zone', () => {
    const placed = fitStack([block('a', 10, 40, 80, 800), block('b', 30, 20, 30, 800)], zone);
    expect(placed.map((p) => p.size)).toEqual([80, 30]);
    const top = placed[0]!.y;
    const last = placed[placed.length - 1]!;
    const bottom = last.y + last.height;
    expect(top - zone.y).toBeCloseTo(zone.y + zone.h - bottom, 5);
  });

  it('shrinks everything together until it fits', () => {
    const items = [block('a', 40, 40, 120, 800), block('b', 400, 24, 48, 800)];
    const placed = fitStack(items, zone);
    const last = placed[placed.length - 1]!;
    expect(last.y + last.height).toBeLessThanOrEqual(zone.y + zone.h + 0.5);
    expect(placed[0]!.size).toBeLessThan(120);
    expect(placed[1]!.size).toBeLessThan(48);
    // Same fraction of each range.
    const fa = (placed[0]!.size - 40) / 80;
    const fb = (placed[1]!.size - 24) / 24;
    expect(fa).toBeCloseTo(fb, 3);
  });

  it('falls back to the minimum sizes when even they overflow', () => {
    const placed = fitStack([block('a', 5000, 20, 40, 800)], zone);
    expect(placed[0]!.size).toBe(20);
    expect(placed[0]!.y).toBe(zone.y);
  });

  it('places blocks in order with their gaps', () => {
    const placed = fitStack([block('a', 5, 30, 30, 800), block('b', 5, 30, 30, 800)], zone);
    expect(placed[1]!.y).toBeCloseTo(placed[0]!.y + placed[0]!.height + 20, 5);
  });
});

describe('photo framing', () => {
  const frame = { x: 400, y: 100, w: 200, h: 200 };

  it('covers the frame, centred, at zoom 1', () => {
    const r = photoCover(1600, 900, frame, 1, 0, 0);
    expect(r.h).toBeCloseTo(200);
    expect(r.w).toBeCloseTo(355.55, 1);
    expect(r.x + r.w / 2).toBeCloseTo(frame.x + frame.w / 2);
    expect(r.y).toBeCloseTo(frame.y);
  });

  it('slides to either edge and never uncovers the frame', () => {
    for (const x of [-1, -0.5, 0, 0.5, 1, 3, -3]) {
      for (const zoom of [1, 2, 4]) {
        const r = photoCover(900, 1600, frame, zoom, x, x);
        expect(r.x).toBeLessThanOrEqual(frame.x + 1e-6);
        expect(r.y).toBeLessThanOrEqual(frame.y + 1e-6);
        expect(r.x + r.w).toBeGreaterThanOrEqual(frame.x + frame.w - 1e-6);
        expect(r.y + r.h).toBeGreaterThanOrEqual(frame.y + frame.h - 1e-6);
      }
    }
    expect(photoCover(1600, 900, frame, 1, 1, 0).x).toBeCloseTo(frame.x);
  });

  it('drags by card pixels and clamps', () => {
    // 1600×900 into 200×200: 155.5 px spare across, 77.8 each side.
    const moved = dragPhoto(1600, 900, frame, 1, 0, 0, 38.9, 50);
    expect(moved.x).toBeCloseTo(0.5, 2);
    expect(moved.y).toBe(0); // no vertical spare at zoom 1
    expect(dragPhoto(1600, 900, frame, 1, 0.9, 0, 500, 0).x).toBe(1);
    expect(dragPhoto(1600, 900, frame, 2, 0, 0, 0, -10000).y).toBe(-1);
  });

  it('clamps zoom and sizes arches taller than circles', () => {
    expect(clampZoom(0.2)).toBe(1);
    expect(clampZoom(9)).toBe(4);
    expect(photoHeight('circle', 100)).toBe(100);
    expect(photoHeight('arch', 100)).toBeGreaterThan(100);
  });
});

describe('previews', () => {
  it('fit the space and keep the card shape', () => {
    expect(fitPreview('square', 380, 500)).toEqual({ w: 380, h: 380 });
    const story = fitPreview('story', 380, 480);
    expect(story.h).toBe(480);
    expect(story.w).toBe(270);
  });
});
