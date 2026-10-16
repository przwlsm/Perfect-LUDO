import type { Contains } from '../glyph/centreline';
import type { Pt, Rect } from '../glyph/path';

/**
 * Scoring a written letter against the glyph, with no stroke-order data:
 *
 * - coverage: the share of points inside the glyph that the learner's ink
 *   passed close to (did you write all of it?);
 * - accuracy: the share of the learner's ink that stayed on the glyph,
 *   allowing a little slack around its edge (did you stay on it?).
 *
 * Both are pure; the glyph is reached only through `contains(x, y)`.
 */
export type Mode = 'trace' | 'memory';

export type Stroke = readonly Pt[];

/** Points along every stroke, at most `step` apart (gestures can skip on fast moves). */
export function densify(strokes: readonly Stroke[], step: number): Pt[] {
  const out: Pt[] = [];
  for (const s of strokes) {
    if (s.length === 0) continue;
    out.push(s[0]!);
    for (let i = 1; i < s.length; i++) {
      const a = s[i - 1]!;
      const b = s[i]!;
      const n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / step);
      for (let k = 1; k <= n; k++) {
        out.push({ x: a.x + ((b.x - a.x) * k) / n, y: a.y + ((b.y - a.y) * k) / n });
      }
    }
  }
  return out;
}

/** Ink points bucketed on a grid, so "is any ink near here?" is quick. */
function nearIndex(ink: readonly Pt[], radius: number): (p: Pt) => boolean {
  const size = Math.max(radius, 1);
  const buckets = new Map<string, Pt[]>();
  for (const p of ink) {
    const key = `${Math.floor(p.x / size)},${Math.floor(p.y / size)}`;
    const list = buckets.get(key);
    if (list) list.push(p);
    else buckets.set(key, [p]);
  }
  const r2 = radius * radius;
  return (p) => {
    const cx = Math.floor(p.x / size);
    const cy = Math.floor(p.y / size);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const list = buckets.get(`${cx + dx},${cy + dy}`);
        if (!list) continue;
        for (const q of list) if ((q.x - p.x) ** 2 + (q.y - p.y) ** 2 <= r2) return true;
      }
    }
    return false;
  };
}

/** The glyph points no ink came within `radius` of. */
export function missedPoints(targets: readonly Pt[], ink: readonly Pt[], radius: number): Pt[] {
  const near = nearIndex(ink, radius);
  return targets.filter((p) => !near(p));
}

/** Share (0–1) of glyph points with ink within `radius`. */
export function coverage(targets: readonly Pt[], ink: readonly Pt[], radius: number): number {
  if (targets.length === 0) return 0;
  return 1 - missedPoints(targets, ink, radius).length / targets.length;
}

/** The glyph grown by `slack` px: inside, or within slack of something inside. */
export function dilate(contains: Contains, slack: number): Contains {
  const ring: Pt[] = [];
  for (const f of [0.5, 1]) {
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      ring.push({ x: Math.cos(a) * slack * f, y: Math.sin(a) * slack * f });
    }
  }
  return (x, y) => contains(x, y) || ring.some((o) => contains(x + o.x, y + o.y));
}

/** Share (0–1) of ink points that fell on the (dilated) glyph. */
export function accuracy(ink: readonly Pt[], onGlyph: Contains): number {
  if (ink.length === 0) return 0;
  let good = 0;
  for (const p of ink) if (onGlyph(p.x, p.y)) good++;
  return good / ink.length;
}

export function boundsOfPoints(points: readonly Pt[]): Rect {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const p of points) {
    x0 = Math.min(x0, p.x);
    y0 = Math.min(y0, p.y);
    x1 = Math.max(x1, p.x);
    y1 = Math.max(y1, p.y);
  }
  if (!Number.isFinite(x0)) return { x: 0, y: 0, width: 0, height: 0 };
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
}

/**
 * Writing from memory is judged on shape, not on where in the box it
 * landed: the ink is moved and scaled (keeping its proportions) so its
 * bounds sit over the glyph's.
 */
export function alignTo(ink: readonly Pt[], target: Rect): Pt[] {
  const b = boundsOfPoints(ink);
  if (b.width === 0 && b.height === 0) return [...ink];
  const s = Math.min(
    target.width / Math.max(b.width, 1e-6),
    target.height / Math.max(b.height, 1e-6),
  );
  const cx = b.x + b.width / 2;
  const cy = b.y + b.height / 2;
  const tx = target.x + target.width / 2;
  const ty = target.y + target.height / 2;
  return ink.map((p) => ({ x: tx + (p.x - cx) * s, y: ty + (p.y - cy) * s }));
}

export type Stars = 0 | 1 | 2 | 3;

/**
 * Stars for one attempt. Tracing (guide visible) earns up to two; the
 * third is only for writing it from memory.
 */
export function starsFor(mode: Mode, cov: number, acc: number): Stars {
  if (mode === 'trace') {
    if (cov >= 0.85 && acc >= 0.82) return 2;
    if (cov >= 0.6 && acc >= 0.6) return 1;
    return 0;
  }
  if (cov >= 0.72 && acc >= 0.72) return 3;
  if (cov >= 0.55 && acc >= 0.55) return 2;
  return 0;
}

export interface Attempt {
  readonly coverage: number;
  readonly accuracy: number;
  readonly stars: Stars;
  /** Glyph points the ink missed, to show where to fill in. */
  readonly missed: readonly Pt[];
}

export interface ScoreInput {
  readonly mode: Mode;
  readonly contains: Contains;
  /** The glyph's bounds in the writing box. */
  readonly glyphBounds: Rect;
  /** Grid points inside the glyph (from analyseGlyph). */
  readonly targets: readonly Pt[];
  /** The glyph strokes' typical half-width. */
  readonly halfWidth: number;
  readonly penRadius: number;
  readonly strokes: readonly Stroke[];
}

export function scoreAttempt(input: ScoreInput): Attempt {
  const { mode, contains, glyphBounds, targets, halfWidth, penRadius } = input;
  let ink = densify(input.strokes, Math.max(1.5, penRadius / 2));
  if (ink.length < 2) return { coverage: 0, accuracy: 0, stars: 0, missed: targets };
  if (mode === 'memory') ink = alignTo(ink, glyphBounds);
  // Passing down the middle of a stroke should cover all of its width.
  const reach = Math.max(penRadius, halfWidth) * 1.25;
  const missed = missedPoints(targets, ink, reach);
  const cov = targets.length ? 1 - missed.length / targets.length : 0;
  const slack = halfWidth * 0.6 + penRadius * 0.6 + (mode === 'memory' ? halfWidth * 0.6 : 0);
  const acc = accuracy(ink, dilate(contains, slack));
  return { coverage: cov, accuracy: acc, stars: starsFor(mode, cov, acc), missed };
}
