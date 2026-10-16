import { Skia } from '@shopify/react-native-skia';
import { cloudBank } from './festive';
import {
  background,
  between,
  blurred,
  col,
  cutOut,
  fill,
  flameShape,
  glow,
  goldFrame,
  heart,
  inZone,
  leaf,
  linear,
  mix,
  path,
  petal,
  pick,
  radial,
  sagPoints,
  scatter,
  starDust,
  star5,
  stroke,
  TAU,
  type Ctx,
  type Point,
} from './kit';

/* ------------------------------------------------------------------ */
/* Colour and play                                                      */
/* ------------------------------------------------------------------ */

export function gulalDesign(ctx: Ctx): void {
  const { c, W, H, pal, story } = ctx;
  background(ctx, { x: 0.5, y: 0.5, r: 0.6 });
  const colors = [
    pal.accent,
    pal.accent2,
    pal.accent3,
    pal.gold,
    mix(pal.accent, pal.accent2, 0.5),
  ];
  const clusters: Point[] = [
    { x: 0, y: 0 },
    { x: W, y: 0 },
    { x: 0, y: H },
    { x: W, y: H },
    { x: W * 0.5, y: -70 },
    { x: W * 0.5, y: H + 70 },
  ];
  if (story) clusters.push({ x: -40, y: H / 2 }, { x: W + 40, y: H / 2 });
  clusters.forEach((cl, k) => {
    for (let i = 0; i < 16; i++) {
      const color = colors[(k + i) % colors.length]!;
      const a = ctx.rnd() * TAU;
      const d = ctx.rnd() * 240;
      const x = cl.x + Math.cos(a) * d;
      const y = cl.y + Math.sin(a) * d;
      const r = between(ctx, 70, 190);
      c.drawCircle(
        x,
        y,
        r,
        radial(x, y, r, [col(color, 0.7), col(color, 0.32), col(color, 0)], [0, 0.5, 1]),
      );
    }
    for (let i = 0; i < 46; i++) {
      const a = ctx.rnd() * TAU;
      const d = 120 + ctx.rnd() * 260;
      const x = cl.x + Math.cos(a) * d;
      const y = cl.y + Math.sin(a) * d;
      if (inZone(ctx, x, y, -40)) continue;
      c.drawCircle(x, y, between(ctx, 1.5, 6.5), fill(pick(ctx, colors), 0.75));
    }
  });
  for (const p of scatter(ctx, 10, 20)) ctx.fx.push(p);
}

/**
 * A splash of colour powder and water: a soft-edged round body, streaks
 * flung outward that end in drops, and a spray of droplets.
 */
function splat(ctx: Ctx, cx: number, cy: number, r: number, color: string): void {
  const { c } = ctx;
  const n = 28;
  const pts: Point[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * TAU;
    const rr = r * (0.86 + 0.14 * Math.sin(t * 3 + r) + ctx.rnd() * 0.08);
    pts.push({ x: cx + Math.cos(t) * rr, y: cy + Math.sin(t) * rr });
  }
  const body = path((b) => {
    const mid = (a: Point, q: Point) => ({ x: (a.x + q.x) / 2, y: (a.y + q.y) / 2 });
    const start = mid(pts[n - 1]!, pts[0]!);
    b.moveTo(start.x, start.y);
    for (let i = 0; i < n; i++) {
      const p = pts[i]!;
      const m = mid(p, pts[(i + 1) % n]!);
      b.quadTo(p.x, p.y, m.x, m.y);
    }
    b.close();
  });
  const light = mix(color, '#ffffff', 0.35);
  // A cloud of powder around the splash.
  c.drawCircle(
    cx,
    cy,
    r * 1.7,
    radial(cx, cy, r * 1.7, [col(color, 0.4), col(color, 0.12), col(color, 0)], [0, 0.6, 1]),
  );
  c.drawPath(
    body,
    radial(
      cx - r * 0.25,
      cy - r * 0.25,
      r * 1.3,
      [col(light), col(color), col(mix(color, '#000000', 0.08))],
      [0, 0.55, 1],
    ),
  );
  // Streaks flung outward, each ending in a drop.
  for (let i = 0; i < 5; i++) {
    const t = ctx.rnd() * TAU;
    const len = r * between(ctx, 0.25, 0.6);
    const w = r * between(ctx, 0.035, 0.065);
    const x0 = cx + Math.cos(t) * r * 0.8;
    const y0 = cy + Math.sin(t) * r * 0.8;
    const x1 = cx + Math.cos(t) * (r * 0.8 + len);
    const y1 = cy + Math.sin(t) * (r * 0.8 + len);
    const nx = -Math.sin(t) * w;
    const ny = Math.cos(t) * w;
    c.drawPath(
      path((b) => {
        b.moveTo(x0 + nx, y0 + ny);
        b.quadTo((x0 + x1) / 2 + nx * 0.3, (y0 + y1) / 2 + ny * 0.3, x1, y1);
        b.quadTo((x0 + x1) / 2 - nx * 0.3, (y0 + y1) / 2 - ny * 0.3, x0 - nx, y0 - ny);
        b.close();
      }),
      fill(color),
    );
    c.drawCircle(x1 + Math.cos(t) * w * 0.6, y1 + Math.sin(t) * w * 0.6, w * 1.15, fill(color));
  }
  for (let i = 0; i < 26; i++) {
    const t = ctx.rnd() * TAU;
    const d = r * between(ctx, 1.1, 2.2);
    const x = cx + Math.cos(t) * d;
    const y = cy + Math.sin(t) * d;
    if (inZone(ctx, x, y, -30)) continue;
    c.drawCircle(x, y, r * between(ctx, 0.015, 0.06), fill(color, between(ctx, 0.6, 0.95)));
  }
}

export function splashDesign(ctx: Ctx): void {
  const { c, W, H, pal, story } = ctx;
  background(ctx, { x: 0.5, y: 0.5, r: 0.6 });
  const colors = [pal.accent, pal.accent2, pal.accent3, pal.gold];
  const spots: [number, number, number][] = [
    [0.06, 0.1, 190],
    [0.94, 0.16, 150],
    [0.1, 0.88, 160],
    [0.92, 0.9, 200],
    [0.5, -0.03, 110],
    [0.52, 1.03, 120],
  ];
  if (story) spots.push([0.0, 0.5, 150], [1.0, 0.56, 140]);
  spots.forEach(([fx, fy, r], i) => splat(ctx, fx * W, fy * H, r, colors[i % colors.length]!));
  for (let i = 0; i < 9; i++) {
    const p = scatter(ctx, 1, 40)[0];
    if (!p) continue;
    const r = between(ctx, 10, 26);
    c.drawCircle(p.x, p.y, r, stroke(pick(ctx, colors), 3, 0.6));
    ctx.fx.push(p);
  }
}

/** A watercolour bloom: soft layered petals and a dotted heart. */
export function bloom(ctx: Ctx, x: number, y: number, r: number, color: string, petals = 6): void {
  const { c, pal } = ctx;
  const rot = ctx.rnd() * TAU;
  const outer = path((b) => {
    for (let i = 0; i < petals; i++) petal(b, x, y, r, r * 0.66, rot + (i / petals) * TAU, 0.72);
  });
  c.drawPath(outer, blurred(fill(color, 0.72), r * 0.05));
  c.drawPath(outer, blurred(stroke(mix(color, '#000000', 0.15), 2.5, 0.35), 1.5));
  const inner = path((b) => {
    for (let i = 0; i < petals; i++)
      petal(b, x, y, r * 0.62, r * 0.42, rot + ((i + 0.5) / petals) * TAU, 0.72);
  });
  c.drawPath(inner, blurred(fill(mix(color, '#000000', 0.12), 0.7), r * 0.04));
  c.drawCircle(x, y, r * 0.18, fill(mix(pal.gold, color, 0.3), 0.9));
  for (let i = 0; i < 10; i++) {
    const t = (i / 10) * TAU;
    c.drawCircle(
      x + Math.cos(t) * r * 0.26,
      y + Math.sin(t) * r * 0.26,
      r * 0.03 + 1,
      fill(mix(pal.gold, '#000000', 0.25), 0.9),
    );
  }
}

function leafy(ctx: Ctx, x: number, y: number, len: number, angle: number): void {
  const { c, pal } = ctx;
  const green = mix(pal.dark ? '#5c9e6e' : '#7fb069', pal.bg[1], 0.2);
  const shape = path((b) =>
    leaf(
      b,
      x + (Math.cos(angle) * len) / 2,
      y + (Math.sin(angle) * len) / 2,
      len,
      len * 0.2,
      angle,
    ),
  );
  c.drawPath(shape, blurred(fill(green, 0.75), 2));
  c.drawLine(
    x,
    y,
    x + Math.cos(angle) * len * 0.92,
    y + Math.sin(angle) * len * 0.92,
    stroke(mix(green, '#000000', 0.3), 2, 0.45),
  );
}

/** True for colours that read as leaves rather than petals. */
function greenish(hex: string): boolean {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const bl = n & 255;
  return g > r + 10 && g >= bl - 10;
}

/** Petal colours from the palette: its warm accents, never its greens. */
function bloomColors(ctx: Ctx): string[] {
  const { pal } = ctx;
  const warm = [pal.accent, pal.accent2, pal.accent3].filter(
    (c) => !greenish(c) && c !== '#ffffff',
  );
  const base = warm.length > 0 ? warm : ['#f28482', '#f6bd60'];
  return [...base, mix(base[0]!, '#ffffff', 0.4)];
}

function floralCluster(ctx: Ctx, cx: number, cy: number, s: number, dir: number): void {
  const colors = bloomColors(ctx);
  for (let i = 0; i < 9; i++)
    leafy(ctx, cx, cy, between(ctx, 120, 190) * s, dir + (i / 8 - 0.5) * 2.4);
  const spots: [number, number, number][] = [
    [0, 0, 105],
    [0.95, 0.35, 78],
    [0.3, 1.0, 70],
    [1.5, 1.1, 40],
    [0.6, 1.7, 36],
    [1.7, 0.2, 34],
  ];
  spots.forEach(([u, v, r], i) => {
    const d = 120 * s;
    const x = cx + Math.cos(dir) * u * d - Math.sin(dir) * (v - 0.5) * d;
    const y = cy + Math.sin(dir) * u * d + Math.cos(dir) * (v - 0.5) * d;
    bloom(ctx, x, y, r * s, colors[i % colors.length]!, i % 2 ? 5 : 6);
    if (i < 3) ctx.fx.push({ x, y });
  });
  for (let i = 0; i < 8; i++) {
    const a = dir + (ctx.rnd() - 0.5) * 2;
    const d = between(ctx, 200, 300) * s;
    ctx.c.drawCircle(
      cx + Math.cos(a) * d,
      cy + Math.sin(a) * d,
      between(ctx, 5, 10) * s,
      fill(pick(ctx, colors), 0.7),
    );
  }
}

export function floralsDesign(ctx: Ctx): void {
  const { W, H, pal, story } = ctx;
  background(ctx, { x: 0.5, y: 0.5, r: 0.7 });
  floralCluster(ctx, 92, 92, story ? 1.3 : 1.12, Math.PI / 4);
  floralCluster(ctx, W - 92, H - 92, story ? 1.3 : 1.12, Math.PI + Math.PI / 4);
  if (story) {
    floralCluster(ctx, W - 40, 330, 0.7, Math.PI * 0.75);
    floralCluster(ctx, 40, H - 330, 0.7, -Math.PI * 0.25);
  }
  starDust(ctx, story ? 14 : 8, pal.gold, undefined, 10);
}

export function confettiDesign(ctx: Ctx): void {
  const { c, W, H, pal, story } = ctx;
  background(ctx, { x: 0.5, y: 0.45, r: 0.7 });
  const colors = [pal.accent, pal.accent2, pal.accent3, pal.gold];
  const n = story ? 230 : 150;
  for (let i = 0; i < n; i++) {
    const x = ctx.rnd() * W;
    const y = ctx.rnd() * H;
    if (inZone(ctx, x, y, 10) && ctx.rnd() < 0.88) continue;
    const color = pick(ctx, colors);
    const kind = ctx.rnd();
    const depth = ctx.rnd() < 0.18;
    const paint = depth ? blurred(fill(color, 0.45), 4) : fill(color, 0.92);
    c.save();
    c.rotate(ctx.rnd() * 360, x, y);
    const s = depth ? 1.6 : 1;
    if (kind < 0.45) c.drawRect(Skia.XYWHRect(x - 11 * s, y - 5 * s, 22 * s, 10 * s), paint);
    else if (kind < 0.7) c.drawCircle(x, y, 7 * s, paint);
    else if (kind < 0.85) {
      c.drawPath(
        path((b) =>
          b.addPoly(
            [
              { x, y: y - 10 * s },
              { x: x + 9 * s, y: y + 7 * s },
              { x: x - 9 * s, y: y + 7 * s },
            ],
            true,
          ),
        ),
        paint,
      );
    } else {
      const sq = path((b) => {
        b.moveTo(x - 24, y);
        for (let k = 1; k <= 6; k++) b.lineTo(x - 24 + k * 8, y + (k % 2 ? -7 : 7));
      });
      c.drawPath(sq, stroke(color, 4, depth ? 0.45 : 0.9));
    }
    c.restore();
  }
  // Curly streamers from the top corners.
  for (const side of [-1, 1]) {
    const x0 = side < 0 ? 0 : W;
    const curl = path((b) => {
      b.moveTo(x0, 20);
      b.cubicTo(x0 - side * 160, 40, x0 - side * 60, 160, x0 - side * 180, 190);
      b.cubicTo(x0 - side * 260, 210, x0 - side * 200, 100, x0 - side * 300, 110);
    });
    c.drawPath(curl, stroke(side < 0 ? pal.accent : pal.accent2, 9, 0.9));
    c.drawPath(curl, stroke('#ffffff', 2, 0.35));
  }
  for (const p of scatter(ctx, 10, 20)) ctx.fx.push(p);
}

/* ------------------------------------------------------------------ */
/* Christmas and New Year                                               */
/* ------------------------------------------------------------------ */

function snow(ctx: Ctx, count: number): void {
  const { c } = ctx;
  for (const p of scatter(ctx, count, 20)) {
    const r = between(ctx, 2, 5.5);
    c.drawCircle(p.x, p.y, r, fill('#ffffff', 0.45 + ctx.rnd() * 0.4));
  }
  for (const p of scatter(ctx, Math.round(count / 6), 30)) {
    const r = between(ctx, 9, 16);
    const flake = stroke('#ffffff', 2, 0.75);
    for (let i = 0; i < 6; i++) {
      const t = (i / 6) * TAU;
      const ex = p.x + Math.cos(t) * r;
      const ey = p.y + Math.sin(t) * r;
      c.drawLine(p.x, p.y, ex, ey, flake);
      const mx = p.x + Math.cos(t) * r * 0.55;
      const my = p.y + Math.sin(t) * r * 0.55;
      c.drawLine(mx, my, mx + Math.cos(t + 0.7) * r * 0.3, my + Math.sin(t + 0.7) * r * 0.3, flake);
      c.drawLine(mx, my, mx + Math.cos(t - 0.7) * r * 0.3, my + Math.sin(t - 0.7) * r * 0.3, flake);
    }
  }
}

function ornament(ctx: Ctx, x: number, y: number, r: number, color: string): void {
  const { c } = ctx;
  c.drawCircle(
    x,
    y,
    r,
    radial(
      x - r * 0.35,
      y - r * 0.4,
      r * 1.5,
      [col(mix(color, '#ffffff', 0.7)), col(color), col(mix(color, '#000000', 0.45))],
      [0, 0.4, 1],
    ),
  );
  c.drawCircle(x - r * 0.35, y - r * 0.38, r * 0.18, fill('#ffffff', 0.7));
}

export function treeDesign(ctx: Ctx): void {
  const { c, W, pal, story } = ctx;
  background(ctx, { x: 0.5, y: 0.2, r: 0.6, a: 0.2 });
  snow(ctx, story ? 110 : 70);
  const cx = W / 2;
  const top = story ? 290 : 74;
  const base = story ? 840 : 452;
  const h = base - top;
  glow(c, cx, top + h * 0.55, h * 0.75, pal.glow, pal.dark ? 0.18 : 0.25);
  c.drawRect(
    Skia.XYWHRect(cx - h * 0.05, base - 10, h * 0.1, h * 0.09),
    linear(cx - 20, 0, cx + 20, 0, [col('#4e2c14'), col('#7a4a26'), col('#4e2c14')]),
  );
  const greens = pal.id === 'pine' ? ['#4fbf7a', '#237a4b'] : ['#3fae6a', '#165c38'];
  const tiers = 4;
  for (let i = 0; i < tiers; i++) {
    const y0 = top + h * i * 0.2;
    const y1 = top + h * (0.34 + i * 0.22);
    const hw = h * (0.16 + i * 0.1);
    const tier = path((b) => {
      b.moveTo(cx, y0);
      b.quadTo(cx - hw * 0.35, (y0 + y1) / 2, cx - hw, y1);
      const sc = 5;
      for (let k = 0; k < sc; k++) {
        const xa = cx - hw + ((k + 0.5) / sc) * hw * 2;
        const xb = cx - hw + ((k + 1) / sc) * hw * 2;
        b.quadTo(xa, y1 + h * 0.035, xb, y1);
      }
      b.quadTo(cx + hw * 0.35, (y0 + y1) / 2, cx, y0);
      b.close();
    });
    c.drawPath(tier, blurred(fill('#000000', 0.2), 6));
    c.drawPath(tier, linear(cx - hw, y0, cx + hw, y1, [col(greens[0]!), col(greens[1]!)]));
    const garland = sagPoints(
      { x: cx - hw * 0.7, y: y1 - h * 0.06 },
      { x: cx + hw * 0.75, y: y1 - h * 0.1 },
      h * 0.04,
      14,
    );
    garland.forEach((p) => c.drawCircle(p.x, p.y, 3.2, fill(pal.gold)));
    for (let k = 0; k < 3; k++) {
      const t = (k + 0.5) / 3;
      const x = cx - hw * 0.62 + t * hw * 1.24;
      const y = y1 - h * (0.03 + 0.04 * ((k + i) % 2));
      ornament(ctx, x, y, h * 0.026 + 3, [pal.accent, pal.gold, pal.accent2][(k + i) % 3]!);
      ctx.fx.push({ x, y });
    }
  }
  const sy = top - 6;
  glow(c, cx, sy, 120, pal.glow, 0.7);
  c.drawPath(
    path((b) => star5(b, cx, sy, h * 0.075 + 6)),
    linear(cx, sy - 40, cx, sy + 40, [col('#fff6c8'), col(pal.gold)]),
  );
  ctx.fx.push({ x: cx, y: sy });
  const gift = (x: number, w: number, color: string) => {
    const y = base + h * 0.02 - w * 0.75;
    c.drawRect(Skia.XYWHRect(x - w / 2, y, w, w * 0.75), fill(color));
    c.drawRect(Skia.XYWHRect(x - w * 0.08, y, w * 0.16, w * 0.75), fill(pal.gold));
    c.drawRect(Skia.XYWHRect(x - w / 2, y + w * 0.3, w, w * 0.12), fill(pal.gold));
    c.drawOval(Skia.XYWHRect(x - w * 0.3, y - w * 0.18, w * 0.3, w * 0.2), stroke(pal.gold, 5));
    c.drawOval(Skia.XYWHRect(x, y - w * 0.18, w * 0.3, w * 0.2), stroke(pal.gold, 5));
  };
  gift(cx - h * 0.42, h * 0.2, pal.accent);
  gift(cx + h * 0.4, h * 0.16, pal.accent2 === '#ffffff' ? pal.accent3 : pal.accent2);
}

function bulbString(ctx: Ctx, a: Point, b: Point, sag: number, spacing: number): void {
  const { c, pal } = ctx;
  const n = Math.max(2, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / spacing));
  const pts = sagPoints(a, b, sag, n * 4);
  c.drawPath(
    path((pb) => pts.forEach((p, i) => (i ? pb.lineTo(p.x, p.y) : pb.moveTo(p.x, p.y)))),
    stroke(pal.dark ? '#000000' : '#3b2f2f', 2.5, 0.5),
  );
  const colors = ['#ffd36b', pal.accent, pal.accent2, pal.accent3];
  for (let i = 2; i < pts.length - 1; i += 4) {
    const p = pts[i]!;
    const color = colors[((i / 4) % colors.length) | 0]!;
    const by = p.y + 16;
    glow(c, p.x, by, 46, color, pal.dark ? 0.5 : 0.35);
    c.drawRect(Skia.XYWHRect(p.x - 5, p.y, 10, 9), fill('#2b2b2b', 0.8));
    c.drawPath(
      path((pb) => petal(pb, p.x, p.y + 6, 26, 15, Math.PI / 2, 0.75)),
      radial(p.x - 3, by - 3, 20, [col('#ffffff'), col(color)], [0, 0.6]),
    );
    ctx.fx.push({ x: p.x, y: by });
  }
}

export function fairyLightsDesign(ctx: Ctx): void {
  const { c, W, H, pal, story } = ctx;
  background(ctx, { x: 0.5, y: 0.5, r: 0.8 });
  for (let i = 0; i < 18; i++) {
    const p = { x: ctx.rnd() * W, y: ctx.rnd() * H };
    glow(c, p.x, p.y, between(ctx, 40, 110), pick(ctx, [pal.gold, pal.accent, pal.glow]), 0.12);
  }
  const t = story ? 300 : 26;
  bulbString(ctx, { x: -20, y: t }, { x: W / 2, y: t + 30 }, story ? 120 : 92, 62);
  bulbString(ctx, { x: W / 2, y: t + 30 }, { x: W + 20, y: t }, story ? 120 : 92, 62);
  const bottom = story ? H - 380 : H - 150;
  bulbString(ctx, { x: -20, y: bottom }, { x: W + 20, y: bottom - 20 }, story ? 110 : 82, 62);
  starDust(ctx, story ? 18 : 10, pal.gold, undefined, 10);
}

function bauble(ctx: Ctx, x: number, top: number, r: number, color: string): void {
  const { c, pal } = ctx;
  const cy = top + r * 0.3 + r;
  c.drawCircle(x + r * 0.1, cy + r * 0.15, r, blurred(fill('#000000', 0.22), r * 0.12));
  c.drawCircle(
    x,
    cy,
    r,
    radial(
      x - r * 0.35,
      cy - r * 0.4,
      r * 1.6,
      [col(mix(color, '#ffffff', 0.75)), col(color), col(mix(color, '#000000', 0.5))],
      [0, 0.38, 1],
    ),
  );
  const band = stroke(pal.gold, r * 0.07, 0.95);
  c.drawArc(Skia.XYWHRect(x - r, cy - r * 0.25, r * 2, r * 0.5), 0, 180, false, band);
  for (let i = 0; i < 7; i++) {
    const t = (i / 6) * Math.PI;
    c.drawCircle(
      x + Math.cos(t) * r * 0.9,
      cy + Math.sin(t) * r * 0.18 + r * 0.32,
      r * 0.04,
      fill(pal.gold),
    );
  }
  c.drawRect(
    Skia.XYWHRect(x - r * 0.22, top + r * 0.05, r * 0.44, r * 0.3),
    linear(x - r * 0.22, 0, x + r * 0.22, 0, [
      col(mix(pal.gold, '#000000', 0.3)),
      col('#fff1b0'),
      col(mix(pal.gold, '#000000', 0.35)),
    ]),
  );
  c.drawOval(Skia.XYWHRect(x - r * 0.5, cy - r * 0.75, r * 0.38, r * 0.22), fill('#ffffff', 0.45));
  ctx.fx.push({ x: x - r * 0.35, y: cy - r * 0.45 });
}

export function baublesDesign(ctx: Ctx): void {
  const { c, W, pal, story } = ctx;
  background(ctx, { x: 0.5, y: 0.2, r: 0.7 });
  snow(ctx, story ? 70 : 40);
  const stretch = story ? 1.9 : 1;
  const lift = story ? 200 : 0;
  const colors = [
    pal.accent,
    pal.gold,
    pal.accent2 === '#ffffff' ? pal.accent3 : pal.accent2,
    pal.accent3,
  ];
  const specs: [number, number, number][] = [
    [0.12, 140, 62],
    [0.3, 250, 80],
    [0.5, 120, 70],
    [0.69, 290, 84],
    [0.87, 170, 64],
  ];
  specs.forEach(([fx, len, r], i) => {
    const x = fx * W;
    const end = len * stretch + lift;
    c.drawLine(x, 40, x, end + r * 0.1, stroke(pal.gold, 2, 0.8));
    bauble(ctx, x, end, r * (story ? 1.2 : 1), colors[i % colors.length]!);
  });
  // A fir branch along the top.
  const twig = sagPoints({ x: -20, y: 36 }, { x: W + 20, y: 52 }, 16, 60);
  c.drawPath(
    path((b) => twig.forEach((p, i) => (i ? b.lineTo(p.x, p.y) : b.moveTo(p.x, p.y)))),
    stroke('#5b3a1e', 7),
  );
  twig.forEach((p, i) => {
    for (const side of [-1, 1]) {
      for (const k of [0, 1]) {
        const a = Math.PI / 2 + side * (0.6 + k * 0.5) + Math.sin(i) * 0.1;
        const len = 30 + ((i * 7 + k * 13) % 16);
        c.drawLine(
          p.x,
          p.y,
          p.x + Math.cos(a) * len,
          p.y + Math.sin(a) * len * (side < 0 ? -0.6 : 1),
          stroke(k ? '#2e7d4f' : '#1d5e3a', 4),
        );
      }
    }
  });
  for (let i = 0; i < 8; i++) {
    const p = twig[(i * 7 + 3) % twig.length]!;
    c.drawCircle(p.x, p.y + 6, 7, radial(p.x - 2, p.y + 4, 9, [col('#ff6b6b'), col('#b3151b')]));
  }
}

export function wreathDesign(ctx: Ctx): void {
  const { c, W, pal, story, zone } = ctx;
  background(ctx, { x: 0.5, y: 0.45, r: 0.7 });
  snow(ctx, story ? 60 : 30);
  const cx = W / 2;
  const cy = zone.y + zone.h / 2;
  const R = story ? 360 : 318;
  glow(c, cx, cy, R * 1.35, pal.glow, pal.dark ? 0.15 : 0.25);
  const greens = ['#1f6f45', '#2e8b57', '#3fa36b', '#145a3a', '#4caf72'];
  for (let i = 0; i < 260; i++) {
    const a = ctx.rnd() * TAU;
    const r = R + (ctx.rnd() + ctx.rnd() - 1) * 46;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    const angle = a + Math.PI / 2 + (ctx.rnd() - 0.5) * 1.4;
    const len = between(ctx, 48, 82);
    c.drawPath(
      path((b) => leaf(b, x, y, len, len * 0.16, angle)),
      fill(pick(ctx, greens), 0.95),
    );
  }
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * TAU + 0.1;
    const x = cx + Math.cos(a) * (R + (i % 2 ? 22 : -18));
    const y = cy + Math.sin(a) * (R + (i % 2 ? 22 : -18));
    for (const [dx, dy] of [
      [0, 0],
      [10, 6],
      [-4, 11],
    ] as const) {
      c.drawCircle(
        x + dx,
        y + dy,
        8,
        radial(x + dx - 2, y + dy - 2, 10, [col('#ff7a7a'), col('#c1121f')]),
      );
    }
    if (i % 3 === 0) {
      ornament(ctx, cx + Math.cos(a + 0.12) * R, cy + Math.sin(a + 0.12) * R, 12, pal.gold);
      ctx.fx.push({ x: cx + Math.cos(a + 0.12) * R, y: cy + Math.sin(a + 0.12) * R });
    }
  }
  const bowColor = pal.dark ? pal.gold : '#c1121f';
  const by = cy + R;
  for (const side of [-1, 1]) {
    c.drawPath(
      path((b) => {
        b.moveTo(cx, by);
        b.cubicTo(cx + side * 90, by - 70, cx + side * 120, by + 40, cx, by);
      }),
      fill(bowColor),
    );
    c.drawPath(
      path((b) => {
        b.moveTo(cx - side * 6, by + 6);
        b.lineTo(cx + side * 60, by + 110);
        b.lineTo(cx + side * 40, by + 100);
        b.lineTo(cx + side * 30, by + 120);
        b.lineTo(cx - side * 14, by + 10);
        b.close();
      }),
      fill(mix(bowColor, '#000000', 0.12)),
    );
  }
  c.drawCircle(cx, by, 15, fill(mix(bowColor, '#000000', 0.2)));
}

export function bokehDesign(ctx: Ctx): void {
  const { c, W, H, pal, story } = ctx;
  background(ctx, { x: 0.5, y: 0.5, r: 0.8, a: 0.12 });
  c.save();
  c.rotate(-24, W / 2, H / 2);
  c.drawRect(
    Skia.XYWHRect(-W, H * 0.38, W * 3, H * 0.16),
    linear(0, H * 0.38, 0, H * 0.54, [col(pal.glow, 0), col(pal.glow, 0.09), col(pal.glow, 0)]),
  );
  c.restore();
  const colors = [pal.gold, pal.glow, pal.accent, pal.accent2];
  const n = story ? 90 : 64;
  for (let i = 0; i < n; i++) {
    const x = ctx.rnd() * W;
    const y = ctx.rnd() * H;
    const big = ctx.rnd() < 0.25;
    const r = big ? between(ctx, 60, 120) : between(ctx, 12, 46);
    const a = (inZone(ctx, x, y, 20) ? 0.45 : 1) * between(ctx, 0.4, 0.9);
    const color = pick(ctx, colors);
    c.drawCircle(x, y, r, blurred(fill(color, 0.16 * a), r * 0.05 + 1));
    c.drawCircle(x, y, r, blurred(stroke(color, r * 0.06 + 1, 0.3 * a), r * 0.04 + 1));
    if (!big && i % 5 === 0) ctx.fx.push({ x, y });
  }
  goldFrame(ctx, story ? 60 : 40, 0.8);
}

export function heartsDesign(ctx: Ctx): void {
  const { c, pal, story, zone } = ctx;
  background(ctx, { x: 0.5, y: 0.45, r: 0.7 });
  const zx = zone.x + zone.w / 2;
  const zy = zone.y + zone.h / 2;
  const big = Math.min(zone.w * 1.05, zone.h * 1.15);
  c.drawPath(
    path((b) => heart(b, zx, zy + big * 0.04, big)),
    stroke(pal.gold, 4, 0.28),
  );
  c.drawPath(
    path((b) => heart(b, zx, zy + big * 0.04, big * 0.94)),
    stroke(pal.gold, 1.5, 0.18),
  );
  const n = story ? 40 : 26;
  for (const p of scatter(ctx, n, 30)) {
    const s = between(ctx, 22, 92);
    const kind = ctx.rnd();
    const shape = path((b) => heart(b, p.x, p.y, s));
    c.save();
    c.rotate(between(ctx, -24, 24), p.x, p.y);
    if (kind < 0.55) {
      c.drawPath(
        shape,
        linear(p.x, p.y - s / 2, p.x, p.y + s / 2, [
          col(mix(pal.accent, '#ffffff', 0.25)),
          col(pal.accent2 === '#ffffff' ? pal.accent : mix(pal.accent, pal.accent2, 0.5)),
        ]),
      );
      c.drawCircle(p.x - s * 0.2, p.y - s * 0.12, s * 0.08, fill('#ffffff', 0.5));
    } else if (kind < 0.8) {
      c.drawPath(shape, stroke(pal.gold, 3, 0.85));
    } else {
      c.drawPath(shape, blurred(fill(pal.accent, 0.35), s * 0.12));
    }
    c.restore();
    if (s > 50) ctx.fx.push(p);
  }
  starDust(ctx, story ? 14 : 8, pal.gold, undefined, 10);
}

/* ------------------------------------------------------------------ */
/* Birthdays and everyday                                               */
/* ------------------------------------------------------------------ */

function balloon(ctx: Ctx, x: number, y: number, r: number, color: string, tie: Point): void {
  const { c, pal } = ctx;
  const string = path((b) => {
    b.moveTo(x, y + r * 1.22);
    b.cubicTo(x - 20, y + r * 1.22 + 80, tie.x + 30, tie.y - 120, tie.x, tie.y);
  });
  c.drawPath(string, stroke(pal.dark ? '#ffffff' : '#6b5b5b', 2, 0.45));
  c.drawOval(
    Skia.XYWHRect(x - r, y - r * 1.18, r * 2, r * 2.36),
    radial(
      x - r * 0.35,
      y - r * 0.5,
      r * 1.8,
      [col(mix(color, '#ffffff', 0.6)), col(color), col(mix(color, '#000000', 0.35))],
      [0, 0.42, 1],
    ),
  );
  c.drawPath(
    path((b) =>
      b.addPoly(
        [
          { x, y: y + r * 1.15 },
          { x: x - 9, y: y + r * 1.3 },
          { x: x + 9, y: y + r * 1.3 },
        ],
        true,
      ),
    ),
    fill(mix(color, '#000000', 0.2)),
  );
  c.save();
  c.rotate(-28, x - r * 0.4, y - r * 0.5);
  c.drawOval(Skia.XYWHRect(x - r * 0.55, y - r * 0.72, r * 0.3, r * 0.5), fill('#ffffff', 0.45));
  c.restore();
}

export function balloonsDesign(ctx: Ctx): void {
  const { c, W, pal, story } = ctx;
  background(ctx, { x: 0.5, y: 0.3, r: 0.7 });
  const colors = [pal.accent, pal.accent2, pal.accent3, pal.gold];
  // Bunting across the top.
  const flags = sagPoints(
    { x: -10, y: story ? 270 : 34 },
    { x: W + 10, y: story ? 270 : 34 },
    64,
    17,
  );
  c.drawPath(
    path((b) => flags.forEach((p, i) => (i ? b.lineTo(p.x, p.y) : b.moveTo(p.x, p.y)))),
    stroke(pal.dark ? '#ffffff' : '#6b5b5b', 2, 0.5),
  );
  flags.forEach((p, i) => {
    if (i === 0 || i === flags.length - 1) return;
    c.drawPath(
      path((b) =>
        b.addPoly(
          [
            { x: p.x - 24, y: p.y },
            { x: p.x + 24, y: p.y },
            { x: p.x, y: p.y + 48 },
          ],
          true,
        ),
      ),
      fill(colors[i % colors.length]!),
    );
    c.drawCircle(p.x, p.y + 16, 4, fill('#ffffff', 0.6));
  });
  const sy = story ? 1.6 : 1;
  const lift = story ? 260 : 0;
  const tie = { x: W / 2, y: story ? 860 : 488 };
  const specs: [number, number, number][] = [
    [0.13, 250, 78],
    [0.29, 180, 94],
    [0.46, 290, 74],
    [0.62, 190, 88],
    [0.78, 280, 80],
    [0.92, 200, 70],
  ];
  specs.forEach(([fx, y, r], i) => {
    const x = fx * W;
    balloon(ctx, x, y * sy + lift, r * (story ? 1.2 : 1), colors[i % colors.length]!, tie);
    ctx.fx.push({ x, y: y * sy + lift });
  });
  c.drawPath(
    path((b) => {
      b.moveTo(tie.x - 16, tie.y);
      b.quadTo(tie.x, tie.y + 14, tie.x + 16, tie.y);
    }),
    stroke(pal.accent2, 5),
  );
  starDust(ctx, story ? 18 : 10, pal.gold, undefined, 10);
}

export function cakeDesign(ctx: Ctx): void {
  const { c, W, H, pal, story } = ctx;
  background(ctx, { x: 0.5, y: 0.82, r: 0.7 });
  const colors = [pal.accent, pal.accent2, pal.accent3, pal.gold];
  for (const p of scatter(ctx, story ? 70 : 40, 20, { x: 0, y: H * 0.45, w: W, h: H * 0.55 })) {
    c.save();
    c.rotate(ctx.rnd() * 360, p.x, p.y);
    c.drawRect(Skia.XYWHRect(p.x - 9, p.y - 4, 18, 8), fill(pick(ctx, colors), 0.85));
    c.restore();
  }
  const cx = W / 2;
  const s = story ? 1.3 : 1;
  const baseY = story ? H - 360 : H - 70;
  c.drawOval(
    Skia.XYWHRect(cx - 310 * s, baseY - 34 * s, 620 * s, 70 * s),
    blurred(fill('#000000', 0.22), 10),
  );
  c.drawOval(
    Skia.XYWHRect(cx - 300 * s, baseY - 38 * s, 600 * s, 64 * s),
    linear(
      cx - 300 * s,
      0,
      cx + 300 * s,
      0,
      [col('#b8b8c8'), col('#ffffff'), col('#d5d5e0'), col('#9a9aac')],
      [0, 0.35, 0.6, 1],
    ),
  );
  const tier = (w: number, h: number, bottom: number, color: string, icing: string) => {
    const top = bottom - h;
    c.drawRect(
      Skia.XYWHRect(cx - w, top, w * 2, h),
      linear(
        cx - w,
        0,
        cx + w,
        0,
        [
          col(mix(color, '#000000', 0.15)),
          col(mix(color, '#ffffff', 0.25)),
          col(color),
          col(mix(color, '#000000', 0.18)),
        ],
        [0, 0.35, 0.7, 1],
      ),
    );
    c.drawOval(
      Skia.XYWHRect(cx - w, bottom - h * 0.12, w * 2, h * 0.24),
      fill(mix(color, '#000000', 0.12)),
    );
    const drip = path((b) => {
      b.moveTo(cx - w, top);
      const n = 12;
      for (let i = 0; i < n; i++) {
        const x0 = cx - w + (i / n) * w * 2;
        const x1 = cx - w + ((i + 1) / n) * w * 2;
        const len = h * (0.18 + 0.25 * Math.abs(Math.sin(i * 2.3)));
        b.lineTo(x0 + (x1 - x0) * 0.2, top + h * 0.1);
        b.quadTo(x0 + (x1 - x0) * 0.2, top + len, x0 + (x1 - x0) * 0.5, top + len);
        b.quadTo(x0 + (x1 - x0) * 0.8, top + len, x0 + (x1 - x0) * 0.8, top + h * 0.1);
      }
      b.lineTo(cx + w, top);
      b.close();
    });
    c.drawPath(drip, fill(icing));
    c.drawOval(Skia.XYWHRect(cx - w, top - h * 0.12, w * 2, h * 0.24), fill(icing));
    for (let i = 0; i <= 12; i++) {
      const x = cx - w + (i / 12) * w * 2;
      c.drawCircle(x, bottom - 4, 6 * s, fill('#ffffff', 0.9));
    }
    for (let i = 0; i < 18; i++) {
      const x = cx - w * 0.85 + ctx.rnd() * w * 1.7;
      const y = top + h * 0.45 + ctx.rnd() * h * 0.4;
      c.drawRect(Skia.XYWHRect(x, y, 8, 3), fill(pick(ctx, colors), 0.9));
    }
    return top;
  };
  const icing = pal.dark ? '#fff4f8' : '#fffaf2';
  const top1 = tier(245 * s, 150 * s, baseY - 8 * s, mix(pal.accent, '#ffffff', 0.45), icing);
  const top2 = tier(165 * s, 118 * s, top1 + 8 * s, mix(pal.accent2, '#ffffff', 0.5), icing);
  for (let i = 0; i < 5; i++) {
    const x = cx + (i - 2) * 58 * s;
    const ch = 70 * s;
    const y0 = top2 - 4 * s - (i % 2) * 6 * s;
    c.drawRect(Skia.XYWHRect(x - 9 * s, y0 - ch, 18 * s, ch), fill('#ffffff'));
    for (let k = 0; k < 4; k++)
      c.drawRect(
        Skia.XYWHRect(x - 9 * s, y0 - ch + k * 18 * s + 4, 18 * s, 7 * s),
        fill(colors[i % colors.length]!, 0.85),
      );
    glow(c, x, y0 - ch - 28 * s, 70 * s, pal.glow, 0.6);
    flameShape(c, x, y0 - ch - 4 * s, 44 * s, 20 * s);
    ctx.lights.push({ x, y: y0 - ch - 26 * s });
  }
}

export function sunriseDesign(ctx: Ctx): void {
  const { c, W, H, pal, story } = ctx;
  background(ctx, { x: 0.5, y: story ? 0.78 : 0.75, r: 0.9, a: 0.5 });
  const horizon = story ? H - 440 : H - 236;
  const sx = W / 2;
  const sy = horizon - 10;
  const rays = path((b) => {
    for (let i = 0; i < 22; i++) {
      const t0 = Math.PI + (i / 22) * Math.PI;
      const t1 = t0 + Math.PI / 60;
      b.moveTo(sx, sy);
      b.lineTo(sx + Math.cos(t0) * 1400, sy + Math.sin(t0) * 1400);
      b.lineTo(sx + Math.cos(t1) * 1400, sy + Math.sin(t1) * 1400);
      b.close();
    }
  });
  c.drawPath(rays, radial(sx, sy, 900, [col(pal.glow, 0.45), col(pal.glow, 0)]));
  glow(c, sx, sy, 520, pal.glow, 0.85);
  c.drawCircle(
    sx,
    sy,
    128,
    radial(sx, sy - 60, 170, [
      col('#fffbe6'),
      col(mix(pal.gold, '#ffffff', 0.45)),
      col(pal.accent),
    ]),
  );
  const cloud = (x: number, y: number, s: number) => {
    const p = blurred(fill('#ffffff', pal.dark ? 0.25 : 0.88), 3);
    for (const [dx, dy, r] of [
      [0, 0, 44],
      [44, -16, 56],
      [94, 0, 42],
      [48, 16, 40],
    ] as const) {
      c.drawCircle(x + dx * s, y + dy * s, r * s, p);
    }
  };
  cloud(W * 0.1, horizon - 160, 1);
  cloud(W * 0.68, horizon - 210, 0.82);
  cloud(W * 0.36, horizon - 70, 0.55);
  const bird = stroke(pal.ink, 3.2, 0.5);
  for (const [x, y, s] of [
    [0.7, horizon - 330, 1],
    [0.76, horizon - 300, 0.8],
    [0.66, horizon - 290, 0.7],
  ] as const) {
    c.drawPath(
      path((b) => {
        b.moveTo(x * W - 16 * s, y);
        b.quadTo(x * W - 7 * s, y - 10 * s, x * W, y);
        b.quadTo(x * W + 7 * s, y - 10 * s, x * W + 16 * s, y);
      }),
      bird,
    );
  }
  const hill = (y: number, amp: number, phase: number, color: string) => {
    c.drawPath(
      path((b) => {
        b.moveTo(0, H);
        b.lineTo(0, y);
        for (let x = 0; x <= W; x += 30)
          b.lineTo(x, y - Math.sin((x / W) * Math.PI * 1.6 + phase) * amp);
        b.lineTo(W, H);
        b.close();
      }),
      linear(0, y - amp, 0, H, [col(color), col(mix(color, '#000000', 0.12))]),
    );
  };
  hill(horizon + 10, 46, 0.4, mix(pal.accent2, pal.bg[1], 0.5));
  hill(horizon + 70, 40, 2.2, mix(pal.accent, pal.bg[1], 0.42));
  hill(horizon + 140, 30, 4.1, mix('#7aa95c', pal.bg[1], 0.2));
  for (let i = 0; i < 16; i++) {
    const x = ctx.rnd() * W;
    const y = horizon + 170 + ctx.rnd() * (H - horizon - 190);
    const f = path((b) => {
      for (let k = 0; k < 5; k++) petal(b, x, y, 11, 6, (k / 5) * TAU);
    });
    c.drawPath(f, fill(ctx.rnd() < 0.5 ? '#ffffff' : pal.accent3, 0.95));
    c.drawCircle(x, y, 3, fill(pal.gold));
  }
  ctx.fx.push({ x: sx - 160, y: sy - 140 }, { x: sx + 170, y: sy - 120 }, { x: sx, y: sy - 230 });
}

export function chaiDesign(ctx: Ctx): void {
  const { c, W, H, pal, story } = ctx;
  background(ctx, { x: 0.82, y: 0.15, r: 0.8, a: 0.4 });
  const cx = W / 2;
  const s = story ? 1.35 : 1;
  const baseY = story ? H - 380 : H - 86;
  // Cloth coaster.
  c.drawOval(
    Skia.XYWHRect(cx - 270 * s, baseY - 50 * s, 540 * s, 100 * s),
    fill(mix(pal.accent2, pal.bg[1], 0.55)),
  );
  const stitches = stroke(mix(pal.accent2, '#ffffff', 0.5), 3, 0.9);
  stitches.setPathEffect(Skia.PathEffect.MakeDash([12, 10], 0));
  c.drawOval(Skia.XYWHRect(cx - 245 * s, baseY - 40 * s, 490 * s, 80 * s), stitches);
  // The kulhad.
  const topY = baseY - 240 * s;
  const cup = path((b) => {
    b.moveTo(cx - 132 * s, topY);
    b.quadTo(cx - 128 * s, baseY - 80 * s, cx - 96 * s, baseY - 8 * s);
    b.quadTo(cx, baseY + 10 * s, cx + 96 * s, baseY - 8 * s);
    b.quadTo(cx + 128 * s, baseY - 80 * s, cx + 132 * s, topY);
    b.close();
  });
  c.drawOval(
    Skia.XYWHRect(cx - 120 * s, baseY - 20 * s, 240 * s, 40 * s),
    blurred(fill('#000000', 0.3), 8),
  );
  c.drawPath(
    cup,
    linear(
      cx - 132 * s,
      0,
      cx + 132 * s,
      0,
      [col('#6e2d14'), col('#b5532a'), col('#e08a55'), col('#c9683a'), col('#6e2d14')],
      [0, 0.25, 0.42, 0.62, 1],
    ),
  );
  for (const f of [0.35, 0.62])
    c.drawArc(
      Skia.XYWHRect(cx - 124 * s, topY + f * 200 * s - 20 * s, 248 * s, 40 * s),
      10,
      160,
      false,
      stroke('#5e2410', 2, 0.4),
    );
  c.drawOval(
    Skia.XYWHRect(cx - 134 * s, topY - 26 * s, 268 * s, 52 * s),
    linear(cx, topY - 26 * s, cx, topY + 26 * s, [col('#e9a273'), col('#9c4520')]),
  );
  c.drawOval(
    Skia.XYWHRect(cx - 118 * s, topY - 18 * s, 236 * s, 36 * s),
    linear(cx, topY - 18 * s, cx, topY + 18 * s, [col('#7b4a26'), col('#c18a54')]),
  );
  for (let i = 0; i < 9; i++) {
    c.drawCircle(
      cx - 70 * s + ctx.rnd() * 140 * s,
      topY - 6 * s + ctx.rnd() * 12 * s,
      (2 + ctx.rnd() * 3) * s,
      fill('#f3dcc0', 0.7),
    );
  }
  // Steam.
  const steamColor = pal.dark ? '#ffffff' : mix(pal.text, pal.bg[0], 0.35);
  for (const [dx, h] of [
    [-50, 230],
    [10, 280],
    [65, 210],
  ] as const) {
    const x = cx + dx * s;
    const p = path((b) => {
      b.moveTo(x, topY - 30 * s);
      b.cubicTo(
        x - 40 * s,
        topY - h * 0.35 * s,
        x + 40 * s,
        topY - h * 0.6 * s,
        x - 6 * s,
        topY - h * s,
      );
    });
    c.drawPath(p, blurred(stroke(steamColor, 12 * s, 0.32), 5));
    ctx.fx.push({ x: x - 6 * s, y: topY - h * s });
  }
  // Cardamom and a marigold on the cloth.
  for (const [dx, dy, a] of [
    [-200, 5, 0.4],
    [-170, 24, -0.6],
    [210, 18, 1.1],
  ] as const) {
    c.drawPath(
      path((b) => leaf(b, cx + dx * s, baseY + dy * s, 34 * s, 10 * s, a)),
      fill('#8fae5a'),
    );
  }
  const mx = cx + 200 * s;
  const my = baseY - 6 * s;
  const fl = path((b) => {
    for (let i = 0; i < 12; i++) petal(b, mx, my, 26 * s, 12 * s, (i / 12) * TAU);
  });
  c.drawPath(fl, fill('#f57c00'));
  c.drawCircle(mx, my, 9 * s, fill('#c75400'));
  starDust(ctx, story ? 10 : 6, pal.gold, { x: W * 0.6, y: 0, w: W * 0.4, h: H * 0.3 }, 12);
}

export function moonlitDesign(ctx: Ctx): void {
  const { c, W, pal, story, occasion } = ctx;
  background(ctx, { x: 0.5, y: 0.16, r: 0.7, a: 0.2 });
  starDust(ctx, story ? 50 : 30, pal.gold);
  const mx = W / 2;
  const my = story ? 520 : 238;
  const R = story ? 180 : 140;
  glow(c, mx, my, R * 2.8, pal.glow, 0.32);
  for (const r of [1.35, 1.7]) c.drawCircle(mx, my, R * r, stroke(pal.glow, 2, 0.12));
  c.saveLayer();
  c.drawCircle(
    mx,
    my,
    R,
    radial(mx - R * 0.3, my - R * 0.3, R * 1.5, [
      col('#fffdf0'),
      col(mix(pal.gold, '#ffffff', 0.55)),
      col(mix(pal.gold, '#ffffff', 0.15)),
    ]),
  );
  if (occasion === 'eid') {
    cutOut(c, (eraser) => c.drawCircle(mx + R * 0.45, my - R * 0.2, R * 0.86, eraser));
  } else {
    for (const [dx, dy, r] of [
      [-0.3, -0.2, 0.18],
      [0.25, 0.1, 0.12],
      [-0.05, 0.4, 0.1],
      [0.35, -0.35, 0.08],
    ] as const) {
      c.drawCircle(mx + dx * R, my + dy * R, r * R, fill(mix(pal.gold, '#000000', 0.15), 0.18));
    }
  }
  c.restore();
  cloudBank(ctx, my + R * 0.9, story ? 1.3 : 1);
  // Stars hanging on threads.
  for (const [fx, len, r] of [
    [0.12, 150, 30],
    [0.25, 80, 22],
    [0.76, 110, 26],
    [0.88, 190, 34],
  ] as const) {
    const x = fx * W;
    const y = len * (story ? 2 : 1) + (story ? 120 : 0);
    c.drawLine(x, 0, x, y - r, stroke(pal.gold, 1.6, 0.6));
    glow(c, x, y, r * 2.2, pal.glow, 0.4);
    c.drawPath(
      path((b) => star5(b, x, y, r)),
      linear(x, y - r, x, y + r, [col('#fff6c8'), col(pal.gold)]),
    );
    ctx.fx.push({ x, y });
  }
}
