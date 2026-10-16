/**
 * The learner's pen. A slow line lets the ink pool a little wider; a quick
 * one runs finer. The centre line is smoothed (Chaikin corner cutting)
 * so a shaky finger still writes a calm curve, and the outline gets round
 * ends like a real nib lifting off paper. A broad "fountain" nib instead
 * takes its width from the stroke's direction.
 */
export interface PenSample {
  readonly x: number;
  readonly y: number;
  /** Ms since the stroke began. */
  readonly t: number;
}

export type NibKind = 'round' | 'broad' | 'chalk';

export interface PenStyle {
  /** The pen's width at a comfortable writing speed, px. */
  readonly width: number;
  readonly nib: NibKind;
}

/** Speed (px per ms) at which the line is at its finest. */
const FAST = 1.6;
/** How much each new speed reading moves the width (0..1); lower is calmer. */
const EASE = 0.22;
/** The broad nib's angle: 35° from horizontal, the usual pen hold. */
const NIB_ANGLE = (-35 * Math.PI) / 180;

export function thin(samples: readonly PenSample[], minStep = 1): PenSample[] {
  const out: PenSample[] = [];
  for (const s of samples) {
    const last = out[out.length - 1];
    if (!last || Math.hypot(s.x - last.x, s.y - last.y) >= minStep) out.push(s);
  }
  return out;
}

/** Width at each sample, from speed (or direction, for a broad nib). */
export function penWidths(samples: readonly PenSample[], style: PenStyle): number[] {
  const n = samples.length;
  const out: number[] = [];
  let w = style.width;
  for (let i = 0; i < n; i++) {
    const s = samples[i]!;
    const prev = samples[Math.max(0, i - 1)]!;
    const next = samples[Math.min(n - 1, i + 1)]!;
    let target: number;
    if (style.nib === 'broad') {
      const dir = Math.atan2(next.y - prev.y, next.x - prev.x);
      target = style.width * (0.28 + 1.0 * Math.abs(Math.sin(dir - NIB_ANGLE)));
    } else if (style.nib === 'chalk') {
      target = style.width;
    } else {
      const dt = Math.max(1, s.t - prev.t);
      const speed = i === 0 ? 0 : Math.hypot(s.x - prev.x, s.y - prev.y) / dt;
      target = style.width * (1.18 - 0.5 * Math.min(1, speed / FAST));
    }
    w += (target - w) * (i === 0 ? 1 : EASE);
    // Settles in over the first few points, eases off as the pen lifts.
    const into = Math.min(1, (i + 1) / 4);
    const off = Math.min(1, (n - i) / 5);
    out.push(Math.max(1, w * (0.7 + 0.3 * into) * (0.78 + 0.22 * off)));
  }
  return out;
}

interface Node {
  x: number;
  y: number;
  w: number;
}

/** Chaikin corner cutting, keeping both ends. Each pass halves the corners. */
export function chaikin(nodes: readonly Node[], passes = 2): Node[] {
  let cur = [...nodes];
  for (let p = 0; p < passes && cur.length > 2; p++) {
    const next: Node[] = [cur[0]!];
    for (let i = 0; i < cur.length - 1; i++) {
      const a = cur[i]!;
      const b = cur[i + 1]!;
      next.push(
        { x: a.x * 0.75 + b.x * 0.25, y: a.y * 0.75 + b.y * 0.25, w: a.w * 0.75 + b.w * 0.25 },
        { x: a.x * 0.25 + b.x * 0.75, y: a.y * 0.25 + b.y * 0.75, w: a.w * 0.25 + b.w * 0.75 },
      );
    }
    next.push(cur[cur.length - 1]!);
    cur = next;
  }
  return cur;
}

/** The smoothed centre line with a width at every point. */
export function penSpine(samples: readonly PenSample[], style: PenStyle): Node[] {
  const pts = thin(samples);
  if (pts.length === 0) return [];
  const w = penWidths(pts, style);
  return chaikin(pts.map((p, i) => ({ x: p.x, y: p.y, w: w[i]! })));
}

/**
 * The stroke's filled outline as one closed polygon (flat x,y pairs): down
 * one side, round the end, back up the other side and round the start. A
 * single touch is a round dot.
 */
export function penOutline(samples: readonly PenSample[], style: PenStyle): number[] {
  const spine = penSpine(samples, style);
  if (spine.length === 0) return [];
  if (spine.length === 1) {
    const { x, y } = spine[0]!;
    const r = style.width * 0.55;
    const out: number[] = [];
    for (let k = 0; k < 20; k++) {
      const a = (k / 20) * Math.PI * 2;
      out.push(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    return out;
  }
  const left: number[] = [];
  const right: number[] = [];
  const n = spine.length;
  for (let i = 0; i < n; i++) {
    const a = spine[Math.max(0, i - 1)]!;
    const b = spine[Math.min(n - 1, i + 1)]!;
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const nx = -(b.y - a.y) / len;
    const ny = (b.x - a.x) / len;
    const p = spine[i]!;
    const half = p.w / 2;
    left.push(p.x + nx * half, p.y + ny * half);
    right.push(p.x - nx * half, p.y - ny * half);
  }
  const out = [...left];
  // Round end cap: from the left edge to the right edge around the tip.
  cap(out, spine[n - 1]!, spine[n - 2]!);
  for (let i = right.length - 2; i >= 0; i -= 2) out.push(right[i]!, right[i + 1]!);
  cap(out, spine[0]!, spine[1]!);
  return out;
}

/** Half a circle around `tip`, facing away from `from`. */
function cap(out: number[], tip: Node, from: Node): void {
  const dir = Math.atan2(tip.y - from.y, tip.x - from.x);
  const r = tip.w / 2;
  const steps = 6;
  // Left of travel is +90°; sweep through the forward direction to -90°.
  const startAngle = dir + Math.PI / 2;
  for (let k = 1; k < steps; k++) {
    const a = startAngle - (k / steps) * Math.PI;
    out.push(tip.x + Math.cos(a) * r, tip.y + Math.sin(a) * r);
  }
}
