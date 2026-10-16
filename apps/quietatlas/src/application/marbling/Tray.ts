/**
 * Ebru, the Turkish art of marbling, as geometry.
 *
 * Each drop of ink is a closed polygon floating on the tray. The maths is
 * Jaffer's model of real marbling (Lu, Jaffer et al., "Mathematical
 * Marbling", 2012), which keeps ink from ever mixing:
 *
 * - A new drop of radius r at c pushes every existing point outward so the
 *   areas add up: |p' − c|² = |p − c|² + r². That composes, so a drop that
 *   grows while the finger stays down is applied in small steps of r².
 * - A needle drawn from A to B drags nearby ink along A→B, falling off
 *   exponentially with the distance d from the needle: p' = p + (B − A)·e^(−d/λ).
 *
 * Points are kept in flat [x0, y0, x1, y1, …] arrays and mutated in place:
 * a full tray is tens of thousands of points, transformed on every move.
 */
export interface InkDrop {
  readonly id: number;
  readonly color: string;
  /** Flat x,y pairs of the closed outline. */
  points: number[];
}

/** Longest gap between neighbouring outline points before one is inserted. */
const MAX_GAP = 5;
/** Neighbours closer than this are merged. */
const MIN_GAP = 0.9;
/** Above this many points on the tray, outlines stop being refined. */
const POINT_BUDGET = 45_000;
/** How sharply a needle's pull fades with distance, in tray units. */
export const NEEDLE_REACH = 16;

export class Tray {
  drops: InkDrop[] = [];
  private nextId = 1;
  /** Bumped on every change, so a renderer can tell when to rebuild paths. */
  version = 0;

  constructor(
    readonly width: number,
    readonly height: number,
  ) {}

  get pointCount(): number {
    let n = 0;
    for (const d of this.drops) n += d.points.length / 2;
    return n;
  }

  /** Drops a new circle of ink; returns its id so the caller can grow it. */
  drop(cx: number, cy: number, radius: number, color: string): number {
    this.pushOutward(cx, cy, radius * radius, -1);
    const id = this.nextId++;
    this.drops.push({ id, color, points: circle(cx, cy, radius) });
    this.refine();
    this.version++;
    return id;
  }

  /**
   * Grows drop `id` (still a circle, since nothing else has touched it) from
   * `from` to `to` radius, pushing the other ink aside by exactly the new area.
   */
  grow(id: number, cx: number, cy: number, from: number, to: number): void {
    if (to <= from) return;
    const target = this.drops.find((d) => d.id === id);
    if (!target) return;
    this.pushOutward(cx, cy, to * to - from * from, id);
    target.points = circle(cx, cy, to);
    this.refine();
    this.version++;
  }

  /** Draws a needle through the ink from (ax, ay) to (bx, by). */
  needle(ax: number, ay: number, bx: number, by: number, reach = NEEDLE_REACH): void {
    this.comb(ax, ay, bx, by, 1, 0, reach);
  }

  /**
   * Draws a comb of `tines` needles, `spacing` apart across the direction of
   * travel, through the ink in one pass.
   */
  comb(
    ax: number,
    ay: number,
    bx: number,
    by: number,
    tines: number,
    spacing: number,
    reach = NEEDLE_REACH,
  ): void {
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    if (len2 < 0.01) return;
    const len = Math.sqrt(len2);
    const nx = -dy / len;
    const ny = dx / len;
    for (let k = 0; k < tines; k++) {
      const off = (k - (tines - 1) / 2) * spacing;
      this.displace(ax + nx * off, ay + ny * off, dx, dy, len2, reach);
    }
    this.refine();
    this.version++;
  }

  private displace(ax: number, ay: number, dx: number, dy: number, len2: number, reach: number) {
    for (const drop of this.drops) {
      const p = drop.points;
      for (let i = 0; i < p.length; i += 2) {
        const d = distanceToSegment(p[i]!, p[i + 1]!, ax, ay, dx, dy, len2);
        const pull = Math.exp(-d / reach);
        if (pull < 0.002) continue;
        p[i] = p[i]! + dx * pull;
        p[i + 1] = p[i + 1]! + dy * pull;
      }
    }
  }

  /** A deep copy of the ink, for undo. */
  snapshot(): InkDrop[] {
    return this.drops.map((d) => ({ id: d.id, color: d.color, points: [...d.points] }));
  }

  restore(drops: readonly InkDrop[]): void {
    this.drops = drops.map((d) => ({ id: d.id, color: d.color, points: [...d.points] }));
    this.version++;
  }

  clear(): void {
    this.drops = [];
    this.version++;
  }

  /** Removes the newest drop (an undo for a drop that was just placed). */
  removeLast(): void {
    this.drops.pop();
    this.version++;
  }

  private pushOutward(cx: number, cy: number, r2: number, skipId: number): void {
    for (const drop of this.drops) {
      if (drop.id === skipId) continue;
      const p = drop.points;
      for (let i = 0; i < p.length; i += 2) {
        const dx = p[i]! - cx;
        const dy = p[i + 1]! - cy;
        const d2 = dx * dx + dy * dy;
        // A point exactly at the centre has no direction to move in; nudge it.
        const scale = d2 < 1e-6 ? Math.sqrt(r2) / 1e-3 : Math.sqrt(1 + r2 / d2);
        p[i] = cx + (d2 < 1e-6 ? 1e-3 : dx) * scale;
        p[i + 1] = cy + dy * scale;
      }
    }
  }

  /**
   * Keeps outlines smooth as they stretch (inserting points) and light as
   * they bunch up (merging them), and forgets ink pushed entirely off the tray.
   */
  private refine(): void {
    const insert = this.pointCount < POINT_BUDGET;
    const margin = Math.max(this.width, this.height) * 0.25;
    this.drops = this.drops.filter((drop) => {
      drop.points = resample(drop.points, insert);
      return !outside(drop.points, -margin, -margin, this.width + margin, this.height + margin);
    });
    // Ink pushed so far out that it covers the whole tray hides everything
    // dropped before it; those older drops can be forgotten.
    for (let k = this.drops.length - 1; k > 0; k--) {
      if (coversRect(this.drops[k]!.points, this.width, this.height)) {
        this.drops = this.drops.slice(k);
        break;
      }
    }
  }
}

/** A circle as a polygon with roughly one point every 3 units. */
export function circle(cx: number, cy: number, r: number): number[] {
  const n = Math.max(24, Math.min(360, Math.round((2 * Math.PI * r) / 3)));
  const out = new Array<number>(n * 2);
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2;
    out[2 * k] = cx + Math.cos(a) * r;
    out[2 * k + 1] = cy + Math.sin(a) * r;
  }
  return out;
}

export function resample(p: readonly number[], insert: boolean): number[] {
  const n = p.length / 2;
  if (n < 3) return [...p];
  const out: number[] = [];
  for (let k = 0; k < n; k++) {
    const x = p[2 * k]!;
    const y = p[2 * k + 1]!;
    if (out.length >= 2) {
      const px = out[out.length - 2]!;
      const py = out[out.length - 1]!;
      if (Math.hypot(x - px, y - py) < MIN_GAP && n - k > 1) continue;
    }
    out.push(x, y);
    if (!insert) continue;
    const nx = p[(2 * (k + 1)) % p.length]!;
    const ny = p[(2 * (k + 1) + 1) % p.length]!;
    const gap = Math.hypot(nx - x, ny - y);
    if (gap > MAX_GAP) {
      const steps = Math.min(16, Math.ceil(gap / MAX_GAP));
      for (let s = 1; s < steps; s++) {
        out.push(x + ((nx - x) * s) / steps, y + ((ny - y) * s) / steps);
      }
    }
  }
  // A ring never collapses below a triangle.
  return out.length >= 6 ? out : [...p];
}

function distanceToSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  dx: number,
  dy: number,
  len2: number,
): number {
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function outside(p: readonly number[], x0: number, y0: number, x1: number, y1: number): boolean {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < p.length; i += 2) {
    minX = Math.min(minX, p[i]!);
    maxX = Math.max(maxX, p[i]!);
    minY = Math.min(minY, p[i + 1]!);
    maxY = Math.max(maxY, p[i + 1]!);
  }
  return maxX < x0 || minX > x1 || maxY < y0 || minY > y1;
}

/** True when the outline has no point over the tray and encloses its centre. */
export function coversRect(p: readonly number[], width: number, height: number): boolean {
  for (let i = 0; i < p.length; i += 2) {
    const x = p[i]!;
    const y = p[i + 1]!;
    if (x >= 0 && x <= width && y >= 0 && y <= height) return false;
  }
  return contains(p, width / 2, height / 2);
}

/** Even-odd point-in-polygon test. */
export function contains(p: readonly number[], x: number, y: number): boolean {
  let inside = false;
  const n = p.length / 2;
  for (let k = 0, j = n - 1; k < n; j = k++) {
    const xk = p[2 * k]!;
    const yk = p[2 * k + 1]!;
    const xj = p[2 * j]!;
    const yj = p[2 * j + 1]!;
    if (yk > y !== yj > y && x < ((xj - xk) * (y - yk)) / (yj - yk) + xk) inside = !inside;
  }
  return inside;
}

/** Signed area (shoelace); positive for the counter-clockwise outlines `circle` makes. */
export function polygonArea(p: readonly number[]): number {
  let a = 0;
  const n = p.length / 2;
  for (let k = 0; k < n; k++) {
    const j = (k + 1) % n;
    a += p[2 * k]! * p[2 * j + 1]! - p[2 * j]! * p[2 * k + 1]!;
  }
  return a / 2;
}
