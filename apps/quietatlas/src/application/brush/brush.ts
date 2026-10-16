/**
 * A water-calligraphy brush. A slow stroke presses the brush down and
 * spreads it; a quick one lifts it to a fine line. Strokes taper in and out
 * like a real brush, then evaporate from the stone.
 */
export interface BrushSample {
  readonly x: number;
  readonly y: number;
  /** Ms since the stroke began. */
  readonly t: number;
}

export interface BrushOptions {
  readonly minWidth: number;
  readonly maxWidth: number;
  /** Speed (units per ms) at which the brush is at its thinnest. */
  readonly fastSpeed: number;
}

export const DEFAULT_BRUSH: BrushOptions = { minWidth: 4, maxWidth: 30, fastSpeed: 2.2 };

/** Samples closer than this are skipped: they add noise, not shape. */
const MIN_STEP = 1.5;
/** Points over which the stroke swells in and fades out. */
const TAPER_IN = 6;
const TAPER_OUT = 8;
/** How much each new speed reading moves the width (0..1); lower is smoother. */
const EASE = 0.25;

export function thin(samples: readonly BrushSample[]): BrushSample[] {
  const out: BrushSample[] = [];
  for (const s of samples) {
    const last = out[out.length - 1];
    if (!last || Math.hypot(s.x - last.x, s.y - last.y) >= MIN_STEP) out.push(s);
  }
  return out;
}

/** The brush's width at every sample. */
export function widths(samples: readonly BrushSample[], o: BrushOptions = DEFAULT_BRUSH): number[] {
  const n = samples.length;
  const out: number[] = [];
  let w = o.maxWidth * 0.75;
  for (let i = 0; i < n; i++) {
    const s = samples[i]!;
    const prev = samples[Math.max(0, i - 1)]!;
    const dt = Math.max(1, s.t - prev.t);
    const speed = i === 0 ? 0 : Math.hypot(s.x - prev.x, s.y - prev.y) / dt;
    const target = o.maxWidth - (o.maxWidth - o.minWidth) * Math.min(1, speed / o.fastSpeed);
    w += (target - w) * EASE;
    const taperIn = Math.min(1, (i + 1) / TAPER_IN);
    const taperOut = Math.min(1, (n - i) / TAPER_OUT);
    out.push(Math.max(1, w * easeOut(taperIn) * (0.35 + 0.65 * easeOut(taperOut))));
  }
  return out;
}

/**
 * The stroke's filled outline as a closed polygon: down the left edge and
 * back up the right, as flat x,y pairs. A dab (one sample) is a small disc.
 */
export function outline(
  samples: readonly BrushSample[],
  o: BrushOptions = DEFAULT_BRUSH,
): number[] {
  const pts = thin(samples);
  if (pts.length === 0) return [];
  if (pts.length === 1) {
    const { x, y } = pts[0]!;
    const r = o.maxWidth * 0.35;
    const out: number[] = [];
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2;
      out.push(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    return out;
  }
  const w = widths(pts, o);
  const left: number[] = [];
  const right: number[] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)]!;
    const b = pts[Math.min(pts.length - 1, i + 1)]!;
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const nx = -(b.y - a.y) / len;
    const ny = (b.x - a.x) / len;
    const half = w[i]! / 2;
    const p = pts[i]!;
    left.push(p.x + nx * half, p.y + ny * half);
    right.push(p.x - nx * half, p.y - ny * half);
  }
  const out = [...left];
  for (let i = right.length - 2; i >= 0; i -= 2) out.push(right[i]!, right[i + 1]!);
  return out;
}

/** Wet strokes stay dark this long before they start to dry. */
export const WET_MS = 5_000;
/** …and are gone this long after they were painted. */
export const DRY_MS = 15_000;

/** How wet a stroke painted `age` ms ago still looks: 1 fresh, 0 gone. */
export function wetness(age: number): number {
  'worklet';
  if (age <= WET_MS) return 1;
  if (age >= DRY_MS) return 0;
  const t = (age - WET_MS) / (DRY_MS - WET_MS);
  // Slow at first, then the last of the water vanishes quickly.
  return 1 - t * t * (3 - 2 * t);
}

function easeOut(t: number): number {
  return 1 - (1 - t) * (1 - t);
}
