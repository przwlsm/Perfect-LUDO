import { FillType, PaintStyle, Skia, StrokeCap } from '@shopify/react-native-skia';
import {
  archPath,
  background,
  between,
  blurred,
  col,
  cutOut,
  diya,
  fill,
  flameShape,
  glow,
  leaf,
  linear,
  marigold,
  mix,
  ogeePath,
  path,
  petal,
  radial,
  RAD,
  sagPoints,
  sparkle,
  starDust,
  star5,
  stroke,
  TAU,
  type Ctx,
  type Point,
} from './kit';

/* ------------------------------------------------------------------ */
/* Shared festive pieces                                                */
/* ------------------------------------------------------------------ */

/** A layered rangoli mandala in the palette's colours. */
export function mandala(ctx: Ctx, cx: number, cy: number, R: number, a = 1): void {
  const { c, pal } = ctx;
  const [P1, P2, P3, G] = [pal.accent, pal.accent2, pal.accent3, pal.gold];
  c.drawCircle(
    cx,
    cy,
    R * 1.04,
    radial(cx, cy, R * 1.04, [col(P1, 0.12 * a), col(P2, 0.08 * a), col(P1, 0)], [0, 0.7, 1]),
  );
  // Outer scallops and a ring of dots.
  const scallop = stroke(G, R * 0.012 + 1, 0.85 * a);
  for (let i = 0; i < 32; i++) {
    const t = (i / 32) * TAU;
    const x = cx + Math.cos(t) * R * 0.9;
    const y = cy + Math.sin(t) * R * 0.9;
    c.drawArc(
      Skia.XYWHRect(x - R * 0.09, y - R * 0.09, R * 0.18, R * 0.18),
      t / RAD - 90,
      180,
      false,
      scallop,
    );
    const dx = cx + Math.cos(t + TAU / 64) * R * 1.0;
    const dy = cy + Math.sin(t + TAU / 64) * R * 1.0;
    c.drawCircle(dx, dy, R * 0.016 + 1.5, fill(G, a));
    if (i % 4 === 0) ctx.fx.push({ x: dx, y: dy });
  }
  const ring = (
    n: number,
    r0: number,
    len: number,
    w: number,
    color: string,
    offset: number,
    outline?: string,
  ) => {
    const shape = path((b) => {
      for (let i = 0; i < n; i++) {
        const t = ((i + offset) / n) * TAU;
        petal(b, cx + Math.cos(t) * r0, cy + Math.sin(t) * r0, len, w, t);
      }
    });
    c.drawPath(shape, fill(color, a));
    if (outline) c.drawPath(shape, stroke(outline, R * 0.008 + 1, 0.9 * a));
  };
  ring(16, R * 0.5, R * 0.38, R * 0.16, P1, 0, G);
  ring(16, R * 0.4, R * 0.28, R * 0.11, P2, 0.5, G);
  c.drawCircle(cx, cy, R * 0.42, fill(mix(pal.bg[0], P3, 0.15), a));
  c.drawCircle(cx, cy, R * 0.42, stroke(G, R * 0.01 + 1, a));
  ring(8, R * 0.13, R * 0.27, R * 0.13, P3, 0.5, G);
  ring(8, R * 0.12, R * 0.2, R * 0.08, P1, 0);
  for (let i = 0; i < 24; i++) {
    const t = (i / 24) * TAU;
    c.drawCircle(
      cx + Math.cos(t) * R * 0.47,
      cy + Math.sin(t) * R * 0.47,
      R * 0.012 + 1,
      fill(G, a),
    );
  }
  c.drawCircle(
    cx,
    cy,
    R * 0.13,
    radial(cx - R * 0.04, cy - R * 0.04, R * 0.16, [
      col('#fff3c4', a),
      col(G, a),
      col(mix(G, '#000000', 0.3), a),
    ]),
  );
  c.drawCircle(cx, cy, R * 0.05, fill(P2, a));
}

/** A hanging string of marigolds ending in a little bell. */
function strand(ctx: Ctx, x: number, y0: number, y1: number, r: number, bellAtEnd = true): void {
  const { c } = ctx;
  c.drawLine(x, y0, x, y1, stroke('#6d4c1f', 2, 0.6));
  let k = 0;
  for (let y = y0 + r; y < y1 - r; y += r * 1.7, k++) {
    marigold(c, x, y, r, k % 3 === 2 ? 'yellow' : 'orange', ctx.rnd);
  }
  if (bellAtEnd) bell(ctx, x, y1, r * 1.3);
}

export function bell(ctx: Ctx, x: number, y: number, s: number): void {
  const { c, pal } = ctx;
  const shape = path((b) => {
    b.moveTo(x - s * 0.2, y - s * 0.6);
    b.cubicTo(x - s * 0.55, y - s * 0.45, x - s * 0.45, y + s * 0.2, x - s * 0.7, y + s * 0.45);
    b.lineTo(x + s * 0.7, y + s * 0.45);
    b.cubicTo(x + s * 0.45, y + s * 0.2, x + s * 0.55, y - s * 0.45, x + s * 0.2, y - s * 0.6);
    b.close();
  });
  c.drawPath(
    shape,
    linear(
      x - s * 0.7,
      y,
      x + s * 0.7,
      y,
      [
        col(mix(pal.gold, '#000000', 0.35)),
        col('#ffe9a8'),
        col(pal.gold),
        col(mix(pal.gold, '#000000', 0.4)),
      ],
      [0, 0.35, 0.6, 1],
    ),
  );
  c.drawCircle(x, y + s * 0.55, s * 0.16, fill(mix(pal.gold, '#000000', 0.3)));
  c.drawCircle(x, y - s * 0.68, s * 0.12, stroke(pal.gold, s * 0.06));
}

/** Mango leaves along the top edge, as on a door toran. */
function mangoLeaves(ctx: Ctx, y: number, count: number): void {
  const { c, W } = ctx;
  for (let i = 0; i <= count; i++) {
    const x = (i / count) * W;
    const tilt = Math.PI / 2 + (ctx.rnd() - 0.5) * 0.35;
    const shape = path((b) =>
      leaf(b, x + Math.cos(tilt) * 42, y + Math.sin(tilt) * 42, 92, 20, tilt),
    );
    const dark = i % 2 === 0;
    c.drawPath(
      shape,
      linear(x, y, x, y + 90, [
        col(dark ? '#3c8d40' : '#5aa845'),
        col(dark ? '#1f5f25' : '#2f7a31'),
      ]),
    );
    c.drawLine(x, y, x + Math.cos(tilt) * 82, y + Math.sin(tilt) * 82, stroke('#174d1c', 1.6, 0.5));
  }
  c.drawLine(-10, y, W + 10, y, stroke('#7a5a2a', 4, 0.8));
}

/** The marigold swags of a toran across the top. */
function marigoldSwags(ctx: Ctx, y: number, swags: number, sag: number, r: number): Point[] {
  const { W } = ctx;
  const joins: Point[] = [];
  for (let s = 0; s < swags; s++) {
    const a = { x: (s / swags) * W, y };
    const b = { x: ((s + 1) / swags) * W, y };
    joins.push(a);
    const pts = sagPoints(a, b, sag, Math.round(W / swags / (r * 1.5)));
    pts.forEach((p, i) => {
      if (i === 0) return;
      marigold(ctx.c, p.x, p.y, r, Math.floor(i / 3) % 2 === 0 ? 'orange' : 'yellow', ctx.rnd);
    });
  }
  joins.push({ x: W, y });
  return joins;
}

/** Fanoos: the domed Eid lantern. */
function fanoos(ctx: Ctx, cx: number, top: number, s: number): Point {
  const { c, pal } = ctx;
  const mid = { x: cx, y: top + s * 0.78 };
  glow(c, mid.x, mid.y, s * 1.5, pal.glow, pal.dark ? 0.55 : 0.4);
  const metal = (x0: number, x1: number) =>
    linear(
      x0,
      0,
      x1,
      0,
      [
        col(mix(pal.gold, '#000000', 0.35)),
        col('#ffe9a8'),
        col(pal.gold),
        col(mix(pal.gold, '#000000', 0.45)),
      ],
      [0, 0.35, 0.6, 1],
    );
  c.drawCircle(cx, top + s * 0.04, s * 0.06, stroke(pal.gold, s * 0.03));
  const dome = path((b) => {
    b.moveTo(cx, top + s * 0.08);
    b.cubicTo(
      cx + s * 0.1,
      top + s * 0.22,
      cx + s * 0.42,
      top + s * 0.26,
      cx + s * 0.4,
      top + s * 0.42,
    );
    b.lineTo(cx - s * 0.4, top + s * 0.42);
    b.cubicTo(cx - s * 0.42, top + s * 0.26, cx - s * 0.1, top + s * 0.22, cx, top + s * 0.08);
    b.close();
  });
  c.drawPath(dome, metal(cx - s * 0.4, cx + s * 0.4));
  const body = path((b) => {
    b.moveTo(cx - s * 0.38, top + s * 0.42);
    b.lineTo(cx + s * 0.38, top + s * 0.42);
    b.lineTo(cx + s * 0.3, top + s * 1.12);
    b.lineTo(cx - s * 0.3, top + s * 1.12);
    b.close();
  });
  c.drawPath(
    body,
    radial(
      mid.x,
      mid.y,
      s * 0.6,
      [col('#fff6d0'), col(pal.glow), col(mix(pal.glow, pal.accent, 0.5))],
      [0, 0.45, 1],
    ),
  );
  for (const dx of [-0.2, 0, 0.2]) {
    const wx = cx + dx * s - s * 0.08;
    c.drawPath(
      archPath({ x: wx, y: top + s * 0.52, w: s * 0.16, h: s * 0.48 }),
      stroke(mix(pal.gold, '#000000', 0.3), s * 0.025),
    );
  }
  c.drawPath(body, stroke(pal.gold, s * 0.035));
  const base = path((b) => {
    b.moveTo(cx - s * 0.32, top + s * 1.12);
    b.lineTo(cx + s * 0.32, top + s * 1.12);
    b.quadTo(cx + s * 0.2, top + s * 1.32, cx, top + s * 1.4);
    b.quadTo(cx - s * 0.2, top + s * 1.32, cx - s * 0.32, top + s * 1.12);
    b.close();
  });
  c.drawPath(base, metal(cx - s * 0.32, cx + s * 0.32));
  c.drawCircle(cx, top + s * 1.48, s * 0.06, fill(pal.gold));
  return mid;
}

/** Akash kandil: the Diwali sky lantern with a fringe. */
function kandil(ctx: Ctx, cx: number, top: number, s: number, color: string): Point {
  const { c, pal } = ctx;
  const mid = { x: cx, y: top + s * 0.7 };
  glow(c, mid.x, mid.y, s * 1.6, pal.glow, pal.dark ? 0.5 : 0.35);
  const dark = mix(color, '#000000', 0.35);
  const capTop = path((b) => {
    b.moveTo(cx - s * 0.18, top);
    b.lineTo(cx + s * 0.18, top);
    b.lineTo(cx + s * 0.5, top + s * 0.28);
    b.lineTo(cx - s * 0.5, top + s * 0.28);
    b.close();
  });
  c.drawPath(
    capTop,
    linear(cx, top, cx, top + s * 0.28, [col(mix(color, '#ffffff', 0.15)), col(dark)]),
  );
  const body = path((b) => {
    b.moveTo(cx - s * 0.5, top + s * 0.28);
    b.lineTo(cx + s * 0.5, top + s * 0.28);
    b.lineTo(cx + s * 0.64, top + s * 0.7);
    b.lineTo(cx + s * 0.5, top + s * 1.1);
    b.lineTo(cx - s * 0.5, top + s * 1.1);
    b.lineTo(cx - s * 0.64, top + s * 0.7);
    b.close();
  });
  c.drawPath(
    body,
    radial(
      mid.x,
      mid.y,
      s * 0.75,
      [col('#fff3c8'), col(mix(color, pal.glow, 0.45)), col(color), col(dark)],
      [0, 0.3, 0.75, 1],
    ),
  );
  for (const dx of [-0.32, 0, 0.32])
    c.drawLine(
      cx + dx * s,
      top + s * 0.3,
      cx + dx * s * 1.05,
      top + s * 1.08,
      stroke(pal.gold, s * 0.02, 0.75),
    );
  c.drawLine(
    cx - s * 0.62,
    top + s * 0.7,
    cx + s * 0.62,
    top + s * 0.7,
    stroke(pal.gold, s * 0.04),
  );
  for (let i = -3; i <= 3; i++)
    c.drawCircle(cx + i * s * 0.16, top + s * 0.7, s * 0.03, fill('#fff3c8'));
  c.drawPath(body, stroke(pal.gold, s * 0.025, 0.9));
  const capBottom = path((b) => {
    b.moveTo(cx - s * 0.5, top + s * 1.1);
    b.lineTo(cx + s * 0.5, top + s * 1.1);
    b.lineTo(cx + s * 0.2, top + s * 1.3);
    b.lineTo(cx - s * 0.2, top + s * 1.3);
    b.close();
  });
  c.drawPath(capBottom, fill(dark));
  for (let i = 0; i < 9; i++) {
    const x = cx - s * 0.36 + (i / 8) * s * 0.72;
    const len = s * (0.45 + 0.15 * Math.sin(i * 1.7));
    c.drawLine(
      x,
      top + s * 1.12,
      x,
      top + s * 1.12 + len,
      stroke(i % 2 ? pal.accent2 : pal.gold, s * 0.03),
    );
    c.drawCircle(x, top + s * 1.12 + len, s * 0.035, fill(pal.gold));
  }
  return mid;
}

/** A brass nilavilakku: a tall lamp with flames on its rim. */
function nilavilakku(ctx: Ctx, cx: number, baseY: number, h: number): void {
  const { c, pal } = ctx;
  const brass = (x0: number, x1: number) =>
    linear(
      x0,
      0,
      x1,
      0,
      [col('#7a4a08'), col('#ffe08a'), col('#d79b2b'), col('#6b3f05')],
      [0, 0.35, 0.6, 1],
    );
  const w = h * 0.36;
  c.drawOval(
    Skia.XYWHRect(cx - w * 0.6, baseY - h * 0.06, w * 1.2, h * 0.1),
    blurred(fill('#000000', 0.2), 4),
  );
  const base = path((b) => {
    b.moveTo(cx - w * 0.5, baseY);
    b.quadTo(cx - w * 0.45, baseY - h * 0.1, cx - w * 0.08, baseY - h * 0.16);
    b.lineTo(cx + w * 0.08, baseY - h * 0.16);
    b.quadTo(cx + w * 0.45, baseY - h * 0.1, cx + w * 0.5, baseY);
    b.close();
  });
  c.drawPath(base, brass(cx - w * 0.5, cx + w * 0.5));
  c.drawRect(
    Skia.XYWHRect(cx - w * 0.06, baseY - h * 0.78, w * 0.12, h * 0.64),
    brass(cx - w * 0.06, cx + w * 0.06),
  );
  for (const f of [0.3, 0.5, 0.68])
    c.drawOval(
      Skia.XYWHRect(cx - w * 0.14, baseY - h * f - h * 0.025, w * 0.28, h * 0.05),
      brass(cx - w * 0.14, cx + w * 0.14),
    );
  const dishY = baseY - h * 0.8;
  c.drawOval(
    Skia.XYWHRect(cx - w * 0.5, dishY - h * 0.04, w, h * 0.09),
    brass(cx - w * 0.5, cx + w * 0.5),
  );
  for (const dx of [-0.38, 0, 0.38]) {
    const fx = cx + dx * w;
    glow(c, fx, dishY - h * 0.08, h * 0.16, pal.glow, 0.55);
    flameShape(c, fx, dishY - h * 0.02, h * 0.12, h * 0.045);
    ctx.lights.push({ x: fx, y: dishY - h * 0.08 });
  }
  c.drawPath(
    path((b) => {
      b.moveTo(cx, dishY - h * 0.2);
      b.quadTo(cx + w * 0.1, dishY - h * 0.1, cx, dishY - h * 0.04);
      b.quadTo(cx - w * 0.1, dishY - h * 0.1, cx, dishY - h * 0.2);
    }),
    brass(cx - w * 0.1, cx + w * 0.1),
  );
}

/** A line-drawn kolam flower with curls, in chalk. */
export function lineFlower(
  ctx: Ctx,
  cx: number,
  cy: number,
  s: number,
  color: string,
  a = 0.9,
): void {
  const { c } = ctx;
  const line = stroke(color, Math.max(2, s * 0.018), a);
  const big = path((b) => {
    for (let i = 0; i < 8; i++)
      petal(
        b,
        cx + Math.cos((i / 8) * TAU) * s * 0.16,
        cy + Math.sin((i / 8) * TAU) * s * 0.16,
        s * 0.7,
        s * 0.3,
        (i / 8) * TAU,
      );
  });
  c.drawPath(big, line);
  const small = path((b) => {
    for (let i = 0; i < 8; i++) {
      const t = ((i + 0.5) / 8) * TAU;
      petal(b, cx + Math.cos(t) * s * 0.16, cy + Math.sin(t) * s * 0.16, s * 0.42, s * 0.16, t);
    }
  });
  c.drawPath(small, line);
  c.drawCircle(cx, cy, s * 0.16, line);
  c.drawCircle(cx, cy, s * 0.05, fill(color, a));
  for (let i = 0; i < 8; i++) {
    const t = (i / 8) * TAU;
    const tipX = cx + Math.cos(t) * s * 0.9;
    const tipY = cy + Math.sin(t) * s * 0.9;
    c.drawCircle(
      cx + Math.cos(t) * s * 0.5,
      cy + Math.sin(t) * s * 0.5,
      s * 0.025 + 1,
      fill(color, a),
    );
    c.drawArc(
      Skia.XYWHRect(tipX - s * 0.07, tipY - s * 0.07, s * 0.14, s * 0.14),
      t / RAD + 90,
      270,
      false,
      line,
    );
  }
  for (let i = 0; i < 16; i++) {
    const t = ((i + 0.5) / 16) * TAU;
    c.drawCircle(
      cx + Math.cos(t) * s * 1.02,
      cy + Math.sin(t) * s * 1.02,
      s * 0.02 + 1,
      fill(color, a),
    );
  }
}

/* ------------------------------------------------------------------ */
/* Designs                                                              */
/* ------------------------------------------------------------------ */

export function diyasDesign(ctx: Ctx): void {
  const { c, W, H, pal, story } = ctx;
  background(ctx, { x: 0.5, y: 0.95, r: 0.8, a: pal.dark ? 0.3 : 0.4 });
  const ground = story ? H - 470 : H - 110;
  starDust(ctx, story ? 40 : 24, pal.gold, { x: 0, y: 0, w: W, h: ground - 200 });
  // A rangoli on the floor, seen at an angle.
  c.save();
  c.translate(W / 2, ground + 30);
  c.scale(1, 0.34);
  c.translate(-W / 2, -(ground + 30));
  mandala(
    { ...ctx, fx: [], lights: [] },
    W / 2,
    ground + 30,
    story ? 470 : 420,
    pal.dark ? 0.55 : 0.7,
  );
  c.restore();
  glow(c, W / 2, ground, W * 0.6, pal.glow, pal.dark ? 0.22 : 0.25);
  // Marigold petals on the floor.
  for (let i = 0; i < 40; i++) {
    const x = ctx.rnd() * W;
    const y = ground + between(ctx, -10, 90);
    const p = path((b) => petal(b, x, y, between(ctx, 10, 18), 7, ctx.rnd() * TAU));
    c.drawPath(p, fill(ctx.rnd() < 0.6 ? '#f57c00' : '#ffb300', 0.9));
  }
  const sizes = story ? [160, 200, 250, 200, 160] : [118, 148, 180, 148, 118];
  const xs = [0.12, 0.31, 0.5, 0.69, 0.88];
  const drop = [-12, 10, 24, 10, -12];
  sizes.forEach((w, i) => {
    ctx.lights.push(diya(c, xs[i]! * W, ground + drop[i]!, w, pal, i % 2 ? 'brass' : 'clay'));
  });
}

export function rangoliDesign(ctx: Ctx): void {
  const { W, H, pal, story } = ctx;
  background(ctx, { x: 0.5, y: 0.2, r: 0.7 });
  starDust(ctx, story ? 30 : 16, pal.gold);
  mandala(ctx, W / 2, story ? 470 : 200, story ? 380 : 288);
  const r = story ? 210 : 165;
  mandala({ ...ctx, fx: [], lights: [] }, -24, H + 24, r, 0.85);
  mandala({ ...ctx, fx: [], lights: [] }, W + 24, H + 24, r, 0.85);
}

function burst(ctx: Ctx, x: number, y: number, R: number, color: string): void {
  const { c } = ctx;
  glow(c, x, y, R * 0.95, color, 0.32);
  const rays = 44;
  for (let i = 0; i < rays; i++) {
    const t = (i / rays) * TAU + ctx.rnd() * 0.05;
    const r1 = R * (0.8 + ctx.rnd() * 0.22);
    const r0 = R * 0.16;
    const x0 = x + Math.cos(t) * r0;
    const y0 = y + Math.sin(t) * r0;
    const x1 = x + Math.cos(t) * r1;
    const y1 = y + Math.sin(t) * r1;
    const p = linear(x0, y0, x1, y1, [col(color, 0), col(color, 0.95)]);
    p.setStyle(PaintStyle.Stroke);
    p.setStrokeWidth(R * 0.018 + 1.5);
    p.setStrokeCap(StrokeCap.Round);
    c.drawLine(x0, y0, x1, y1, p);
    glow(c, x1, y1, R * 0.07 + 4, color, 0.7);
    c.drawCircle(x1, y1, R * 0.018 + 1.5, fill('#ffffff', 0.95));
    if (i % 3 === 0) {
      for (let k = 1; k <= 3; k++)
        c.drawCircle(x1, y1 + k * R * 0.07, R * 0.012 + 1, fill(color, 0.8 - k * 0.22));
    }
  }
  for (let i = 0; i < 20; i++) {
    const t = (i / 20) * TAU;
    c.drawCircle(
      x + Math.cos(t) * R * 0.5,
      y + Math.sin(t) * R * 0.5,
      R * 0.016 + 1,
      fill(color, 0.85),
    );
  }
  c.drawCircle(x, y, R * 0.04 + 2, fill('#ffffff', 0.9));
  ctx.fx.push({ x, y });
}

export function fireworksDesign(ctx: Ctx): void {
  const { c, W, H, pal, story } = ctx;
  background(ctx, { x: 0.5, y: 0.2, r: 0.9, a: 0.1 });
  for (let i = 0; i < 90; i++) {
    const x = ctx.rnd() * W;
    const y = ctx.rnd() * H * 0.55;
    c.drawCircle(x, y, 0.8 + ctx.rnd() * 1.6, fill('#ffffff', 0.2 + ctx.rnd() * 0.5));
  }
  const k = story ? 1.0 : 0;
  const s = story ? 1.25 : 1;
  const bursts: [number, number, number, string][] = [
    [0.28, 215 + k * 230, 175, pal.accent],
    [0.73, 160 + k * 160, 150, pal.gold],
    [0.56, 365 + k * 330, 112, pal.accent2],
    [0.11, 400 + k * 380, 86, pal.accent3],
    [0.9, 390 + k * 430, 96, pal.accent],
  ];
  for (const [fx, y, R, color] of bursts) burst(ctx, fx * W, y, R * s, color);
  // A soft haze along the bottom, like the smoke of a festive night.
  c.drawRect(
    Skia.XYWHRect(0, H * 0.7, W, H * 0.3),
    linear(0, H * 0.7, 0, H, [col(pal.glow, 0), col(pal.glow, pal.dark ? 0.1 : 0.2)]),
  );
}

export function toranDesign(ctx: Ctx): void {
  const { c, W, H, pal, story } = ctx;
  background(ctx, { x: 0.5, y: 0.45, r: 0.8 });
  starDust(ctx, story ? 26 : 14, pal.gold);
  mangoLeaves(ctx, 14, 15);
  const joins = marigoldSwags(ctx, 40, 3, story ? 120 : 92, 19);
  joins.forEach((j, i) => {
    const edge = i === 0 || i === joins.length - 1;
    const x = edge ? (i === 0 ? 30 : W - 30) : j.x;
    const end = edge ? (story ? 820 : 470) : story ? 300 : 150;
    strand(ctx, x, 40, end, edge ? 18 : 16);
    ctx.fx.push({ x, y: end });
  });
  // A garland of marigold and jasmine along the bottom.
  const y = H - (story ? 120 : 52);
  c.drawLine(-10, y, W + 10, y, stroke('#6d4c1f', 2, 0.5));
  for (let x = 10, k = 0; x < W; x += 26, k++) {
    if (k % 3 === 2) {
      c.drawOval(Skia.XYWHRect(x - 7, y - 11, 14, 22), fill('#fffdf5'));
      c.drawOval(Skia.XYWHRect(x - 7, y - 11, 14, 22), stroke('#d9cdb0', 1.2));
    } else marigold(c, x, y, 13, k % 2 ? 'yellow' : 'orange', ctx.rnd);
  }
}

export function lanternsDesign(ctx: Ctx): void {
  const { c, W, pal, story, occasion } = ctx;
  background(ctx, { x: 0.5, y: 0.25, r: 0.8 });
  starDust(ctx, story ? 40 : 22, pal.gold);
  const stretch = story ? 1.9 : 1;
  const lift = story ? 140 : 0;
  const specs: [number, number, number][] = [
    [0.33, 80, 64],
    [0.67, 104, 70],
    [0.16, 230, 112],
    [0.84, 270, 108],
    [0.5, 140, 132],
  ];
  const colors = [pal.accent, pal.accent2, pal.accent, pal.accent2, pal.accent];
  specs.forEach(([fx, len, size], i) => {
    const x = fx * W;
    const end = len * stretch + lift;
    c.drawLine(x, 0, x, end, stroke(pal.gold, 2, 0.7));
    const s = size * (story ? 1.2 : 1);
    ctx.lights.push(
      occasion === 'eid' ? fanoos(ctx, x, end, s) : kandil(ctx, x, end, s * 0.85, colors[i]!),
    );
  });
}

export function crescentDesign(ctx: Ctx): void {
  const { c, W, pal, story, occasion } = ctx;
  background(ctx, { x: 0.68, y: 0.15, r: 0.7, a: 0.2 });
  starDust(ctx, story ? 46 : 28, pal.gold);
  const mx = W * 0.64;
  const my = story ? 480 : 232;
  const R = story ? 190 : 150;
  glow(c, mx, my, R * 2.6, pal.glow, pal.dark ? 0.32 : 0.45);
  c.saveLayer();
  c.drawCircle(
    mx,
    my,
    R,
    radial(mx - R * 0.35, my - R * 0.35, R * 1.5, [
      col('#fffbea'),
      col(mix(pal.gold, '#ffffff', 0.35)),
      col(pal.gold),
    ]),
  );
  cutOut(c, (eraser) => c.drawCircle(mx + R * 0.46, my - R * 0.24, R * 0.86, eraser));
  c.restore();
  if (occasion === 'eid') {
    const sx = mx + R * 0.32;
    const sy = my + R * 0.05;
    glow(c, sx, sy, R * 0.5, pal.glow, 0.5);
    c.drawPath(
      path((b) => star5(b, sx, sy, R * 0.24)),
      fill(mix(pal.gold, '#ffffff', 0.3)),
    );
    ctx.fx.push({ x: sx, y: sy });
    for (const [fx, len, s] of [
      [0.14, story ? 260 : 120, story ? 92 : 78],
      [0.3, story ? 120 : 40, story ? 70 : 58],
    ] as const) {
      c.drawLine(fx * W, 0, fx * W, len, stroke(pal.gold, 2, 0.7));
      ctx.lights.push(fanoos(ctx, fx * W, len, s));
    }
  } else {
    cloudBank(ctx, my + R * 0.75, story ? 1.3 : 1);
  }
}

/** One soft cumulus cloud: overlapping puffs on a flat base, lit from above. */
export function cloud(
  ctx: Ctx,
  cx: number,
  cy: number,
  w: number,
  top: string,
  bottom: string,
  a = 0.92,
): void {
  const { c } = ctx;
  const h = w * 0.34;
  const layer = Skia.Paint();
  layer.setAlphaf(a);
  c.saveLayer(layer);
  const shade = linear(cx, cy - h * 1.1, cx, cy + h * 0.45, [col(top), col(bottom)]);
  for (const [dx, dy, r] of [
    [-0.3, 0.02, 0.5],
    [-0.1, -0.38, 0.72],
    [0.14, -0.22, 0.62],
    [0.33, 0.04, 0.46],
  ] as const) {
    c.drawCircle(cx + dx * w, cy + dy * h, r * h, shade);
  }
  c.drawRRect(
    Skia.RRectXY(
      Skia.XYWHRect(cx - w * 0.44, cy - h * 0.1, w * 0.88, h * 0.52),
      h * 0.26,
      h * 0.26,
    ),
    shade,
  );
  c.restore();
}

/** Soft night clouds drifting across the bottom of the sky. */
export function cloudBank(ctx: Ctx, y: number, s: number): void {
  const { W, pal } = ctx;
  const back = [mix(pal.bg[0], '#ffffff', 0.12), mix(pal.bg[0], '#ffffff', 0.04)] as const;
  const front = [mix(pal.bg[0], '#ffffff', 0.3), mix(pal.bg[0], '#ffffff', 0.1)] as const;
  cloud(ctx, W * 0.3, y - 30 * s, 300 * s, back[0], back[1], 0.85);
  cloud(ctx, W * 0.78, y - 44 * s, 260 * s, back[0], back[1], 0.85);
  cloud(ctx, W * 0.1, y + 20 * s, 320 * s, front[0], front[1]);
  cloud(ctx, W * 0.55, y + 34 * s, 380 * s, front[0], front[1]);
  cloud(ctx, W * 0.97, y + 10 * s, 300 * s, front[0], front[1]);
}

export function jaaliDesign(ctx: Ctx): void {
  const { c, W, H, pal, story } = ctx;
  background(ctx, { x: 0.5, y: 0.4, r: 0.8 });
  const T = 108;
  const line = stroke(pal.gold, 2, pal.dark ? 0.3 : 0.4);
  for (let y = T / 2; y < H + T; y += T) {
    for (let x = T / 2; x < W + T; x += T) {
      const s = T * 0.3;
      c.drawRect(Skia.XYWHRect(x - s, y - s, s * 2, s * 2), line);
      c.save();
      c.rotate(45, x, y);
      c.drawRect(Skia.XYWHRect(x - s, y - s, s * 2, s * 2), line);
      c.restore();
      c.drawLine(x + s * 1.41, y, x + T - s * 1.41, y, line);
      c.drawLine(x, y + s * 1.41, x, y + T - s * 1.41, line);
      c.drawCircle(x, y, 4, fill(pal.gold, 0.45));
    }
  }
  const top = story ? 450 : 165;
  const r = { x: 192, y: top, w: W - 384, h: H - top - (story ? 300 : 80) };
  const arch = ogeePath(r);
  c.drawPath(arch, blurred(fill('#000000', 0.3), 14));
  c.drawPath(
    arch,
    radial(W / 2, r.y + r.h * 0.45, r.h * 0.8, [
      col(mix(pal.bg[0], pal.glow, pal.dark ? 0.08 : 0.2)),
      col(pal.bg[0]),
      col(mix(pal.bg[0], pal.bg[1], 0.6)),
    ]),
  );
  c.drawPath(arch, stroke(pal.gold, 6));
  const inner = ogeePath({ x: r.x + 16, y: r.y + 18, w: r.w - 32, h: r.h - 16 });
  c.drawPath(inner, stroke(pal.gold, 2, 0.7));
  const lampTop = r.y + r.w * 0.09;
  c.drawLine(W / 2, r.y + 6, W / 2, lampTop, stroke(pal.gold, 2, 0.8));
  ctx.lights.push(fanoos(ctx, W / 2, lampTop, story ? 80 : 58));
  for (const x of [r.x - 4, r.x + r.w + 4]) sparkle(c, x, r.y + r.h * 0.32, 16, pal.gold, 0.9);
}

export function paperArchDesign(ctx: Ctx): void {
  const { c, W, H, pal, story } = ctx;
  const panelTop = story ? 330 : 105;
  const bottom = story ? H - 210 : H - 62;
  background(ctx, { x: 0.5, y: 0.55, r: 0.7 });
  // Deepest, middle, front.
  const layers = pal.dark
    ? [
        mix(pal.bg[1], pal.accent2, 0.55),
        mix(pal.bg[1], pal.gold, 0.5),
        mix(pal.bg[0], pal.accent, 0.45),
      ]
    : [
        mix(pal.accent2, '#ffffff', 0.25),
        mix(pal.gold, '#ffffff', 0.3),
        mix(pal.accent, '#ffffff', 0.08),
      ];
  // Deepest first; each layer in front has a bigger opening.
  [2, 1, 0].forEach((depth) => {
    const inset = 118 + depth * 42;
    const hole = ogeePath({
      x: inset,
      y: panelTop + depth * 46,
      w: W - inset * 2,
      h: bottom - depth * 26 - (panelTop + depth * 46),
    });
    const sheet = path((b) => {
      b.addRect(Skia.XYWHRect(-20, -20, W + 40, H + 40));
      b.addPath(hole);
      b.setFillType(FillType.EvenOdd);
    });
    c.save();
    c.translate(0, 7);
    c.drawPath(sheet, blurred(fill('#000000', 0.32), 10));
    c.restore();
    c.drawPath(sheet, fill(layers[2 - depth]!));
    // A row of punched dots just outside each opening.
    const ring = ogeePath({
      x: inset - 16,
      y: panelTop + depth * 46 - 18,
      w: W - (inset - 16) * 2,
      h: bottom - depth * 26 - (panelTop + depth * 46) + 18,
    });
    const dots = stroke(depth === 0 ? pal.gold : mix(pal.bg[0], '#ffffff', 0.4), 6, 0.95);
    dots.setPathEffect(Skia.PathEffect.MakeDash([0.1, 22], 0));
    c.drawPath(ring, dots);
  });
  // Little gold flowers in the front layer's corners.
  for (const [x, y] of [
    [58, 58],
    [W - 58, 58],
    [58, H - 58],
    [W - 58, H - 58],
  ] as const) {
    const f = path((b) => {
      for (let i = 0; i < 8; i++) petal(b, x, y, 26, 11, (i / 8) * TAU);
    });
    c.drawPath(f, fill(pal.gold, 0.95));
    c.drawCircle(x, y, 6, fill(pal.bg[0]));
    ctx.fx.push({ x, y });
  }
}

export function pongalPotDesign(ctx: Ctx): void {
  const { c, W, H, pal, story } = ctx;
  background(ctx, { x: 0.5, y: 0.85, r: 0.7 });
  const baseY = story ? H - 330 : H - 64;
  const R = story ? 190 : 138;
  const cx = W / 2;
  const cy = baseY - R * 0.92;
  // Sun behind the pot.
  const sunY = cy - R * 0.7;
  const rays = path((b) => {
    for (let i = 0; i < 24; i++) {
      const t0 = (i / 24) * TAU;
      const t1 = t0 + TAU / 60;
      b.moveTo(cx, sunY);
      b.lineTo(cx + Math.cos(t0) * R * 3.2, sunY + Math.sin(t0) * R * 3.2);
      b.lineTo(cx + Math.cos(t1) * R * 3.2, sunY + Math.sin(t1) * R * 3.2);
      b.close();
    }
  });
  c.drawPath(rays, radial(cx, sunY, R * 3.2, [col(pal.gold, 0.3), col(pal.gold, 0)]));
  glow(c, cx, sunY, R * 1.8, pal.glow, 0.7);
  c.drawCircle(
    cx,
    sunY,
    R * 0.82,
    radial(cx, sunY - R * 0.3, R, [
      col('#fff7d6'),
      col(mix(pal.gold, '#ffd54f', 0.5)),
      col(pal.gold),
    ]),
  );
  // Sugarcane leaning in from both sides.
  for (const side of [-1, 1]) {
    for (const k of [0, 1]) {
      const x0 = cx + side * R * (1.05 + k * 0.32);
      const x1 = cx + side * R * (0.52 + k * 0.6);
      const y1 = cy - R * (1.25 - k * 0.15);
      c.drawLine(x0, baseY, x1, y1, stroke(k ? '#6b2d50' : '#7f3a5f', R * 0.11));
      c.drawLine(x0 - side * 3, baseY, x1 - side * 3, y1, stroke('#a65b86', R * 0.025, 0.7));
      for (let t = 0.12; t < 1; t += 0.17) {
        const nx = x0 + (x1 - x0) * t;
        const ny = baseY + (y1 - baseY) * t;
        c.drawLine(nx - R * 0.06, ny, nx + R * 0.06, ny, stroke('#d9b38c', R * 0.02));
      }
      for (const lean of [-0.6, 0.2, 0.9]) {
        const shape = path((b) =>
          leaf(
            b,
            x1 + side * R * 0.25 + lean * 20,
            y1 - R * 0.18,
            R * 0.75,
            R * 0.07,
            -Math.PI / 2 + side * (0.5 + lean * 0.4),
          ),
        );
        c.drawPath(shape, fill(lean > 0 ? '#3f8f3f' : '#2e7d32'));
      }
    }
  }
  // The pot.
  c.drawOval(
    Skia.XYWHRect(cx - R * 1.05, baseY - R * 0.12, R * 2.1, R * 0.3),
    blurred(fill('#000000', 0.25), 8),
  );
  const body = path((b) => b.addOval(Skia.XYWHRect(cx - R, cy - R * 0.88, R * 2, R * 1.84)));
  c.drawPath(
    body,
    linear(
      cx - R,
      cy,
      cx + R,
      cy,
      [col('#6e2c12'), col('#c8622f'), col('#e08a55'), col('#a9481f'), col('#5e2410')],
      [0, 0.3, 0.45, 0.7, 1],
    ),
  );
  // A kolam painted on the pot.
  const chalk = stroke('#fff8ec', R * 0.025, 0.9);
  c.drawArc(Skia.XYWHRect(cx - R * 0.9, cy - R * 0.75, R * 1.8, R * 1.5), 20, 140, false, chalk);
  for (let i = 0; i < 9; i++) {
    const t = (25 + i * 16) * RAD;
    const x = cx + Math.cos(t) * R * 0.78;
    const y = cy - R * 0.02 + Math.sin(t) * R * 0.62;
    c.drawCircle(x, y, R * 0.035, fill('#fff8ec'));
    c.drawCircle(x, y, R * 0.09, stroke('#fff8ec', R * 0.015, 0.7));
  }
  c.drawArc(
    Skia.XYWHRect(cx - R * 0.6, cy - R * 0.3, R * 1.2, R * 0.9),
    30,
    120,
    false,
    stroke('#fff8ec', R * 0.02, 0.7),
  );
  // Neck, rim, turmeric leaves.
  const neckY = cy - R * 0.82;
  c.drawRect(
    Skia.XYWHRect(cx - R * 0.55, neckY - R * 0.18, R * 1.1, R * 0.24),
    linear(cx - R * 0.55, 0, cx + R * 0.55, 0, [col('#6e2c12'), col('#d2733d'), col('#6e2c12')]),
  );
  for (const side of [-1, 1]) {
    for (const k of [0, 1, 2]) {
      const shape = path((b) =>
        leaf(
          b,
          cx + side * R * (0.5 + k * 0.12),
          neckY - R * 0.05 + k * R * 0.12,
          R * 0.7,
          R * 0.12,
          side * (0.25 + k * 0.35),
        ),
      );
      c.drawPath(
        shape,
        linear(cx, neckY - R * 0.3, cx, neckY + R * 0.3, [col('#4caf50'), col('#2e7d32')]),
      );
    }
  }
  c.drawLine(
    cx - R * 0.56,
    neckY - R * 0.04,
    cx + R * 0.56,
    neckY - R * 0.04,
    stroke('#f4c430', R * 0.04),
  );
  c.drawOval(Skia.XYWHRect(cx - R * 0.62, neckY - R * 0.3, R * 1.24, R * 0.24), fill('#8a3a18'));
  // Pongal boiling over.
  const foam = fill('#fffdf6');
  for (let i = 0; i < 9; i++) {
    const t = i / 8;
    c.drawCircle(
      cx - R * 0.55 + t * R * 1.1,
      neckY - R * 0.3 - Math.sin(t * Math.PI) * R * 0.18,
      R * (0.16 + 0.05 * Math.sin(i * 1.9)),
      foam,
    );
  }
  for (const [dx, len] of [
    [-0.5, 0.42],
    [-0.2, 0.3],
    [0.25, 0.5],
    [0.52, 0.34],
  ] as const) {
    const x = cx + dx * R;
    c.drawRRect(
      Skia.RRectXY(
        Skia.XYWHRect(x - R * 0.05, neckY - R * 0.2, R * 0.1, R * len),
        R * 0.05,
        R * 0.05,
      ),
      foam,
    );
  }
  for (let i = 0; i < 14; i++) {
    const x = cx + (ctx.rnd() - 0.5) * R * 1.1;
    const y = neckY - R * 0.32 - ctx.rnd() * R * 0.2;
    c.drawCircle(x, y, R * 0.02, fill('#e8dcc0'));
  }
  ctx.fx.push(
    { x: cx, y: neckY - R * 0.5 },
    { x: cx - R * 0.8, y: sunY - R * 0.4 },
    { x: cx + R * 0.8, y: sunY - R * 0.4 },
  );
}

export function kolamDesign(ctx: Ctx): void {
  const { c, W, H, pal, story } = ctx;
  background(ctx, { x: 0.5, y: 0.5, r: 0.8 });
  const chalk = pal.dark ? '#fff8ec' : mix(pal.ink, pal.bg[0], 0.15);
  const s = story ? 190 : 165;
  for (const [x, y] of [
    [56, 56],
    [W - 56, 56],
    [56, H - 56],
    [W - 56, H - 56],
  ] as const) {
    lineFlower(ctx, x, y, s, chalk);
    ctx.fx.push({
      x: x + (x < W / 2 ? s * 0.7 : -s * 0.7),
      y: y + (y < H / 2 ? s * 0.7 : -s * 0.7),
    });
  }
  if (story) {
    lineFlower(ctx, -10, H / 2, 150, chalk, 0.8);
    lineFlower(ctx, W + 10, H / 2, 150, chalk, 0.8);
  }
  // Festoons of dots and loops along the top and bottom.
  for (const y of [story ? 250 : 34, story ? H - 250 : H - 34]) {
    const down = y < H / 2 ? 1 : -1;
    for (let x = 250; x <= W - 250; x += 58) {
      c.drawCircle(x, y, 4.5, fill(pal.gold));
      if (x + 58 <= W - 250) {
        c.drawArc(
          Skia.XYWHRect(x, y - 29, 58, 58),
          down > 0 ? 0 : 180,
          180,
          false,
          stroke(chalk, 3, 0.85),
        );
        c.drawCircle(x + 29, y + down * 14, 3, fill(chalk, 0.9));
      }
    }
  }
  starDust(ctx, story ? 16 : 8, pal.gold);
}

function kite(
  ctx: Ctx,
  x: number,
  y: number,
  s: number,
  rot: number,
  c1: string,
  c2: string,
): void {
  const { c } = ctx;
  c.save();
  c.rotate(rot, x, y);
  const T = { x, y: y - s };
  const R = { x: x + s * 0.74, y: y - s * 0.12 };
  const B = { x, y: y + s * 0.86 };
  const L = { x: x - s * 0.74, y: y - s * 0.12 };
  c.drawPath(
    path((b) => b.addPoly([T, R, B, L], true)),
    blurred(fill('#000000', 0.12), 8),
  );
  c.drawPath(
    path((b) => b.addPoly([T, B, L], true)),
    fill(c1),
  );
  c.drawPath(
    path((b) => b.addPoly([T, R, B], true)),
    fill(c2),
  );
  c.drawPath(
    path((b) =>
      b.addPoly(
        [
          T,
          { x: x + s * 0.3, y: y - s * 0.6 },
          { x, y: y - s * 0.35 },
          { x: x - s * 0.3, y: y - s * 0.6 },
        ],
        true,
      ),
    ),
    fill('#ffffff', 0.85),
  );
  c.drawLine(T.x, T.y, B.x, B.y, stroke('#4a2f1a', 2.4, 0.6));
  c.drawArc(
    Skia.XYWHRect(L.x, y - s * 0.55, s * 1.48, s * 0.9),
    200,
    140,
    false,
    stroke('#4a2f1a', 2.4, 0.6),
  );
  c.drawPath(
    path((b) =>
      b.addPoly(
        [B, { x: x - s * 0.18, y: B.y + s * 0.26 }, { x: x + s * 0.18, y: B.y + s * 0.26 }],
        true,
      ),
    ),
    fill(c1),
  );
  c.restore();
}

export function kitesDesign(ctx: Ctx): void {
  const { c, W, pal, story, zone } = ctx;
  background(ctx, { x: 0.84, y: 0.1, r: 0.8, a: 0.45 });
  const sy = story ? 1.75 : 1;
  const sunX = W * 0.86;
  const sunY = 118 * (story ? 2.6 : 1);
  glow(c, sunX, sunY, 260, pal.glow, 0.8);
  c.drawCircle(
    sunX,
    sunY,
    70,
    radial(sunX - 20, sunY - 20, 90, [col('#fffbe6'), col(mix(pal.gold, '#ffd54f', 0.5))]),
  );
  for (const [x, y, s] of [
    [0.16, 120, 1],
    [0.62, 70, 0.7],
  ] as const) {
    const p = blurred(fill('#ffffff', 0.85), 3);
    for (const [dx, dy, r] of [
      [0, 0, 40],
      [38, -12, 50],
      [80, 0, 38],
      [40, 14, 36],
    ] as const) {
      c.drawCircle(x * W + dx * s, y * sy + dy * s, r * s, p);
    }
  }
  const kites: [number, number, number, number, string, string][] = [
    [0.22, 230, 138, -14, pal.accent, pal.accent2],
    [0.5, 330, 108, 9, pal.accent3, pal.accent],
    [0.74, 210, 96, 16, pal.accent2, pal.gold],
    [0.9, 400, 72, -6, pal.accent, pal.accent3],
  ];
  for (const [fx, y, s, rot, c1, c2] of kites) {
    const kx = fx * W;
    const ky = y * sy;
    const string = path((b) => {
      b.moveTo(kx, ky + s * 0.1);
      b.quadTo(kx - 60, (ky + zone.y) / 2 + 60, -20, zone.y - 30);
    });
    c.drawPath(string, stroke(pal.dark ? '#ffffff' : pal.ink, 1.5, pal.dark ? 0.35 : 0.28));
    kite(ctx, kx, ky, s * (story ? 1.25 : 1), rot, c1, c2);
    ctx.fx.push({ x: kx, y: ky });
  }
  const bird = stroke(pal.ink, 3, 0.45);
  for (const [x, y] of [
    [0.36, 120],
    [0.4, 150],
    [0.44, 112],
  ] as const) {
    c.drawPath(
      path((b) => {
        b.moveTo(x * W - 14, y * sy);
        b.quadTo(x * W - 6, y * sy - 8, x * W, y * sy);
        b.quadTo(x * W + 6, y * sy - 8, x * W + 14, y * sy);
      }),
      bird,
    );
  }
}

export function raysDesign(ctx: Ctx): void {
  const { c, W, pal, story, occasion } = ctx;
  background(ctx, { x: 0.5, y: 0.25, r: 0.8, a: 0.4 });
  const cx = W / 2;
  const cy = story ? 560 : 262;
  const R = story ? 1300 : 900;
  const rays = path((b) => {
    for (let i = 0; i < 32; i++) {
      const t0 = (i / 32) * TAU;
      const t1 = t0 + TAU / 64;
      b.moveTo(cx, cy);
      b.lineTo(cx + Math.cos(t0) * R, cy + Math.sin(t0) * R);
      b.lineTo(cx + Math.cos(t1) * R, cy + Math.sin(t1) * R);
      b.close();
    }
  });
  c.drawPath(
    rays,
    radial(cx, cy, R * 0.7, [col(pal.gold, pal.dark ? 0.22 : 0.3), col(pal.gold, 0)]),
  );
  glow(c, cx, cy, story ? 420 : 330, pal.glow, 0.8);
  for (const r of [130, 190, 250])
    c.drawCircle(cx, cy, r * (story ? 1.25 : 1), stroke(pal.gold, 2, 0.35));
  if (occasion === 'gurpurab') {
    ctx.lights.push(diya(c, cx, cy + (story ? 110 : 88), story ? 240 : 196, pal, 'brass'));
  } else {
    const r = story ? 140 : 112;
    const petals = path((b) => {
      for (let i = 0; i < 16; i++)
        petal(
          b,
          cx + Math.cos((i / 16) * TAU) * r * 0.8,
          cy + Math.sin((i / 16) * TAU) * r * 0.8,
          r * 0.55,
          r * 0.2,
          (i / 16) * TAU,
        );
    });
    c.drawPath(petals, fill(pal.accent, 0.95));
    c.drawCircle(
      cx,
      cy,
      r,
      radial(cx - r * 0.3, cy - r * 0.3, r * 1.3, [
        col('#fff8dc'),
        col(mix(pal.gold, '#ffd54f', 0.4)),
        col(pal.gold),
      ]),
    );
    lineFlower(ctx, cx, cy, r * 0.8, mix(pal.accent2, '#000000', 0.1), 0.7);
    ctx.fx.push({ x: cx, y: cy });
  }
  starDust(ctx, story ? 24 : 14, pal.gold);
}

export function rakhiDesign(ctx: Ctx): void {
  const { c, W, pal, story } = ctx;
  background(ctx, { x: 0.5, y: 0.28, r: 0.6 });
  starDust(ctx, story ? 30 : 16, pal.gold);
  const ty = story ? 560 : 288;
  const R = story ? 205 : 165;
  const strand = (phase: number, color: string, width: number) => {
    const pts: Point[] = [];
    for (let x = -10; x <= W + 10; x += 6) pts.push({ x, y: ty + Math.sin(x / 26 + phase) * 6 });
    c.drawPath(
      path((b) => pts.forEach((p, i) => (i ? b.lineTo(p.x, p.y) : b.moveTo(p.x, p.y)))),
      stroke(color, width),
    );
  };
  strand(0, pal.accent2, 7);
  strand(Math.PI, pal.gold, 5);
  for (let x = 40; x < W; x += 52) {
    if (Math.abs(x - W / 2) < R * 1.1) continue;
    const pearl = Math.round(x / 52) % 2 === 0;
    c.drawCircle(
      x,
      ty,
      pearl ? 10 : 8,
      radial(
        x - 3,
        ty - 3,
        12,
        pearl ? [col('#ffffff'), col('#e9e1d6')] : [col('#fff1b0'), col(pal.gold)],
      ),
    );
  }
  for (const side of [-1, 1]) {
    const x = W / 2 + side * R * 1.3;
    c.drawLine(x, ty, x, ty + R * 0.8, stroke(pal.accent2, 3));
    const tassel = path((b) => {
      b.moveTo(x, ty + R * 0.75);
      b.lineTo(x - 18, ty + R * 1.2);
      b.lineTo(x + 18, ty + R * 1.2);
      b.close();
    });
    c.drawPath(tassel, fill(pal.accent2));
    c.drawCircle(x, ty + R * 0.75, 9, fill(pal.gold));
  }
  const cx = W / 2;
  glow(c, cx, ty, R * 1.7, pal.glow, pal.dark ? 0.45 : 0.55);
  const outer = path((b) => {
    for (let i = 0; i < 18; i++) petal(b, cx, ty, R, R * 0.24, (i / 18) * TAU);
  });
  c.drawPath(outer, fill(mix(pal.accent2, '#000000', 0.12)));
  c.drawPath(outer, stroke(pal.gold, 2, 0.8));
  c.drawCircle(cx, ty, R * 0.7, stroke(pal.gold, R * 0.06));
  for (let i = 0; i < 28; i++) {
    const t = (i / 28) * TAU;
    c.drawCircle(
      cx + Math.cos(t) * R * 0.7,
      ty + Math.sin(t) * R * 0.7,
      R * 0.022,
      fill('#fff3c4'),
    );
  }
  const mid = path((b) => {
    for (let i = 0; i < 12; i++) petal(b, cx, ty, R * 0.62, R * 0.2, ((i + 0.5) / 12) * TAU);
  });
  c.drawPath(mid, linear(cx, ty - R * 0.6, cx, ty + R * 0.6, [col('#fff1b0'), col(pal.gold)]));
  for (let i = 0; i < 16; i++) {
    const t = (i / 16) * TAU;
    const x = cx + Math.cos(t) * R * 0.4;
    const y = ty + Math.sin(t) * R * 0.4;
    c.drawCircle(x, y, R * 0.055, radial(x - 3, y - 3, R * 0.07, [col('#ffffff'), col('#e6ddd0')]));
  }
  c.drawCircle(
    cx,
    ty,
    R * 0.27,
    radial(cx - R * 0.1, ty - R * 0.1, R * 0.35, [
      col(mix(pal.accent, '#ffffff', 0.5)),
      col(pal.accent),
      col(mix(pal.accent, '#000000', 0.4)),
    ]),
  );
  c.drawCircle(cx, ty, R * 0.27, stroke(pal.gold, R * 0.04));
  for (let i = 0; i < 6; i++) {
    const t = (i / 6) * TAU;
    c.drawLine(
      cx,
      ty,
      cx + Math.cos(t) * R * 0.25,
      ty + Math.sin(t) * R * 0.25,
      stroke('#ffffff', 1.5, 0.35),
    );
  }
  c.drawCircle(cx - R * 0.09, ty - R * 0.09, R * 0.06, fill('#ffffff', 0.8));
  ctx.fx.push(
    { x: cx, y: ty },
    { x: cx - R * 0.7, y: ty - R * 0.3 },
    { x: cx + R * 0.7, y: ty + R * 0.3 },
  );
}

function modak(ctx: Ctx, cx: number, base: number, s: number, tone: 'white' | 'saffron'): void {
  const { c } = ctx;
  const [light, dark] = tone === 'white' ? ['#fffaf0', '#e6cfa6'] : ['#ffd08a', '#e0893a'];
  c.drawOval(
    Skia.XYWHRect(cx - s * 0.5, base - s * 0.08, s, s * 0.18),
    blurred(fill('#000000', 0.22), 5),
  );
  const body = path((b) => {
    b.moveTo(cx - s * 0.5, base - s * 0.22);
    b.cubicTo(cx - s * 0.52, base - s * 0.7, cx - s * 0.1, base - s * 0.78, cx, base - s * 1.08);
    b.cubicTo(
      cx + s * 0.1,
      base - s * 0.78,
      cx + s * 0.52,
      base - s * 0.7,
      cx + s * 0.5,
      base - s * 0.22,
    );
    b.quadTo(cx + s * 0.45, base + s * 0.02, cx, base + s * 0.02);
    b.quadTo(cx - s * 0.45, base + s * 0.02, cx - s * 0.5, base - s * 0.22);
    b.close();
  });
  c.drawPath(
    body,
    radial(
      cx - s * 0.18,
      base - s * 0.55,
      s * 0.9,
      [col('#ffffff'), col(light), col(dark)],
      [0, 0.4, 1],
    ),
  );
  for (let k = 0; k < 7; k++) {
    const off = (k / 6 - 0.5) * s * 0.88;
    c.drawPath(
      path((b) => {
        b.moveTo(cx + off, base - s * 0.04);
        b.quadTo(cx + off * 0.72, base - s * 0.62, cx, base - s * 1.04);
      }),
      stroke(dark, s * 0.022, 0.55),
    );
  }
}

export function modakDesign(ctx: Ctx): void {
  const { c, W, H, pal, story } = ctx;
  background(ctx, { x: 0.5, y: 0.85, r: 0.6 });
  starDust(ctx, story ? 22 : 12, pal.gold);
  strand(ctx, 28, 0, story ? 560 : 300, 16);
  strand(ctx, W - 28, 0, story ? 560 : 300, 16);
  const cx = W / 2;
  const baseY = story ? H - 350 : H - 100;
  glow(c, cx, baseY - 170, 420, pal.glow, pal.dark ? 0.35 : 0.45);
  // The brass thali.
  c.drawOval(Skia.XYWHRect(cx - 350, baseY - 64, 700, 150), blurred(fill('#000000', 0.25), 10));
  c.drawOval(
    Skia.XYWHRect(cx - 340, baseY - 70, 680, 136),
    linear(
      cx - 340,
      0,
      cx + 340,
      0,
      [col('#7a4a08'), col('#ffe08a'), col('#d79b2b'), col('#ffe9a8'), col('#6b3f05')],
      [0, 0.3, 0.55, 0.75, 1],
    ),
  );
  c.drawOval(Skia.XYWHRect(cx - 300, baseY - 56, 600, 104), stroke('#7a4a08', 2.5, 0.6));
  for (let i = 0; i < 28; i++) {
    const t = (i / 28) * TAU;
    c.drawCircle(cx + Math.cos(t) * 320, baseY - 2 + Math.sin(t) * 60, 3, fill('#fff3c4', 0.8));
  }
  // Durva grass.
  for (let i = 0; i < 18; i++) {
    const x = cx - 300 + ctx.rnd() * 600;
    const shape = path((b) =>
      leaf(b, x, baseY - 28, 70, 5, -Math.PI / 2 + (ctx.rnd() - 0.5) * 1.2),
    );
    c.drawPath(shape, fill(ctx.rnd() < 0.5 ? '#4caf50' : '#2e7d32', 0.9));
  }
  const s = story ? 140 : 118;
  const rows: [number, number, 'white' | 'saffron'][] = [
    [-0.85, 0, 'white'],
    [0, 0, 'saffron'],
    [0.85, 0, 'white'],
    [-0.43, 0.82, 'saffron'],
    [0.43, 0.82, 'white'],
    [0, 1.6, 'white'],
  ];
  for (const [dx, dy, tone] of rows)
    modak(ctx, cx + dx * s * 1.15, baseY - 14 - dy * s * 0.82, s, tone);
  ctx.fx.push({ x: cx, y: baseY - 14 - 1.6 * s * 0.82 - s * 1.1 });
  // Two red hibiscus.
  for (const [x, y, sz] of [
    [cx - 300, baseY - 60, 62],
    [cx + 300, baseY - 52, 54],
  ] as const) {
    const f = path((b) => {
      for (let i = 0; i < 5; i++) petal(b, x, y, sz, sz * 0.7, (i / 5) * TAU - Math.PI / 2, 0.7);
    });
    c.drawPath(f, radial(x, y, sz, [col('#7a0d18'), col('#d62839'), col('#ef476f')], [0, 0.35, 1]));
    c.drawLine(x, y, x + sz * 0.5, y - sz * 0.75, stroke('#f6c453', 3));
    c.drawCircle(x + sz * 0.5, y - sz * 0.75, 5, fill('#f6c453'));
  }
}

export function dandiyaDesign(ctx: Ctx): void {
  const { c, W, H, pal, story } = ctx;
  background(ctx, { x: 0.5, y: 0.5, r: 0.7 });
  mandala({ ...ctx, fx: [], lights: [] }, W / 2, H / 2, story ? 470 : 400, 0.16);
  // Mirror work around the edge.
  const inset = 46;
  const motif = (x: number, y: number, k: number) => {
    const f = path((b) => {
      for (let i = 0; i < 8; i++) petal(b, x, y, 20, 8, (i / 8) * TAU);
    });
    c.drawPath(f, fill(k % 2 ? pal.accent2 : pal.accent));
    c.drawCircle(
      x,
      y,
      11,
      radial(x - 4, y - 4, 13, [col('#ffffff'), col('#cfd8e3'), col('#8a97a8')]),
    );
    c.drawCircle(x, y, 11, stroke(pal.gold, 2));
    if (k % 3 === 0) ctx.fx.push({ x, y });
  };
  let k = 0;
  for (let x = inset; x <= W - inset + 1; x += (W - inset * 2) / 11) {
    motif(x, inset, k++);
    motif(x, H - inset, k++);
  }
  const step = (H - inset * 2) / Math.round((H - inset * 2) / 88);
  for (let y = inset + step; y < H - inset - 1; y += step) {
    motif(inset, y, k++);
    motif(W - inset, y, k++);
  }
  // Pairs of dandiya sticks in two corners.
  const stick = (x: number, y: number, deg: number, len: number) => {
    c.save();
    c.rotate(deg, x, y);
    const w = 16;
    for (let i = 0; i < len / 28; i++) {
      const colr = [pal.accent, pal.gold, pal.accent2][i % 3]!;
      c.drawRect(Skia.XYWHRect(x - len / 2 + i * 28, y - w / 2, 28, w), fill(colr));
    }
    c.drawRRect(
      Skia.RRectXY(Skia.XYWHRect(x - len / 2, y - w / 2, len, w), 8, 8),
      stroke('#000000', 1.5, 0.25),
    );
    for (const end of [-1, 1]) {
      const ex = x + end * (len / 2 + 6);
      c.drawCircle(ex, y, 10, fill(pal.gold));
      for (let j = -2; j <= 2; j++)
        c.drawLine(ex, y, ex + end * 34, y + j * 9, stroke(j % 2 ? pal.accent2 : pal.accent, 3));
    }
    c.restore();
  };
  // Kept inside the mirror border and clear of the corner mark.
  const L = story ? 240 : 150;
  const cx = story ? 225 : 165;
  const cy = story ? 380 : 175;
  stick(cx, cy, 52, L);
  stick(cx, cy, 128, L);
  stick(W - cx, H - cy, 52, L);
  stick(W - cx, H - cy, 128, L);
}

export function alponaDesign(ctx: Ctx): void {
  const { c, W, H, pal, story } = ctx;
  background(ctx, { x: 0.5, y: 0.45, r: 0.8 });
  const line = pal.dark ? '#fff6e5' : '#b3151b';
  const band = pal.dark ? '#fff6e5' : '#b3151b';
  const deep = pal.dark ? pal.bg[0] : '#fff6e5';
  // Lal paar: the red and white border of a Puja sari, top and bottom.
  const border = (y: number, dir: 1 | -1) => {
    const h = story ? 120 : 92;
    const y0 = dir > 0 ? y : y - h;
    c.drawRect(Skia.XYWHRect(0, y0, W, h), fill(band));
    c.drawLine(0, y + dir * (h + 6), W, y + dir * (h + 6), stroke(pal.gold, 5));
    c.drawLine(0, y + dir * (h - 12), W, y + dir * (h - 12), stroke(deep, 3, 0.8));
    for (let x = 0; x < W + 40; x += 40) {
      c.drawPath(
        path((b) =>
          b.addPoly(
            [
              { x, y: y + dir * (h + 10) },
              { x: x + 40, y: y + dir * (h + 10) },
              { x: x + 20, y: y + dir * (h + 40) },
            ],
            true,
          ),
        ),
        fill(band),
      );
    }
    for (let x = 30; x < W; x += 60) {
      const cy = y + dir * h * 0.42;
      c.drawPath(
        path((b) => {
          for (let i = 0; i < 4; i++) petal(b, x, cy, 18, 9, (i / 4) * TAU + Math.PI / 4);
        }),
        fill(deep, 0.9),
      );
      c.drawCircle(x, cy, 4, fill(pal.gold));
    }
  };
  border(0, 1);
  border(H, -1);
  // Alpona lotuses at the sides and conch-like curls.
  const s = story ? 190 : 150;
  lineFlower(ctx, -14, H / 2, s, line, 0.85);
  lineFlower(ctx, W + 14, H / 2, s, line, 0.85);
  const curl = (x: number, y: number, r: number, dir: 1 | -1) => {
    const pts: Point[] = [];
    for (let t = 0; t < TAU * 1.6; t += 0.12) {
      const rr = r * (1 - t / (TAU * 1.9));
      pts.push({ x: x + Math.cos(t * dir) * rr, y: y + Math.sin(t * dir) * rr });
    }
    c.drawPath(
      path((b) => pts.forEach((p, i) => (i ? b.lineTo(p.x, p.y) : b.moveTo(p.x, p.y)))),
      stroke(line, 4, 0.85),
    );
    ctx.fx.push({ x, y });
  };
  const top = story ? 300 : 190;
  curl(88, top, 46, 1);
  curl(W - 88, top, 46, -1);
  curl(88, H - top, 46, -1);
  curl(W - 88, H - top, 46, 1);
  for (let i = 0; i < 14; i++) {
    const y = top + 70 + i * ((H - 2 * top - 140) / 13);
    if (Math.abs(y - H / 2) < s * 1.05) continue;
    c.drawCircle(40, y, 4, fill(line, 0.8));
    c.drawCircle(W - 40, y, 4, fill(line, 0.8));
  }
}

export function pookalamDesign(ctx: Ctx): void {
  const { c, W, H, pal, story } = ctx;
  background(ctx, { x: 0.5, y: 0.25, r: 0.6 });
  const cx = W / 2;
  const cy = story ? 490 : 200;
  const R = story ? 360 : 286;
  c.drawCircle(cx, cy + 10, R * 1.04, blurred(fill('#000000', 0.18), 18));
  // Leaf edge.
  const leaves = path((b) => {
    for (let i = 0; i < 44; i++)
      petal(
        b,
        cx + Math.cos((i / 44) * TAU) * R * 0.84,
        cy + Math.sin((i / 44) * TAU) * R * 0.84,
        R * 0.2,
        R * 0.075,
        (i / 44) * TAU,
        0.5,
      );
  });
  c.drawPath(leaves, fill('#2e7d32'));
  const band = (r0: number, r1: number, n: number, colors: string[]) => {
    const w = r1 - r0;
    for (let i = 0; i < n; i++) {
      const p = stroke(colors[i % colors.length]!, w);
      p.setStrokeCap(StrokeCap.Butt);
      c.drawArc(
        Skia.XYWHRect(cx - (r0 + w / 2), cy - (r0 + w / 2), (r0 + w / 2) * 2, (r0 + w / 2) * 2),
        (i / n) * 360,
        360 / n + 0.6,
        false,
        p,
      );
    }
  };
  band(R * 0.72, R * 0.9, 24, ['#f57c00', '#ffb300']);
  band(R * 0.69, R * 0.72, 1, ['#fffdf5']);
  band(R * 0.5, R * 0.69, 1, ['#fdd835']);
  const reds = path((b) => {
    for (let i = 0; i < 8; i++)
      petal(
        b,
        cx + Math.cos((i / 8) * TAU) * R * 0.48,
        cy + Math.sin((i / 8) * TAU) * R * 0.48,
        R * 0.22,
        R * 0.11,
        (i / 8) * TAU,
      );
  });
  c.drawPath(reds, fill('#c2185b'));
  band(R * 0.3, R * 0.5, 16, ['#7b1fa2', '#9c27b0']);
  for (let i = 0; i < 16; i++) {
    const t = ((i + 0.5) / 16) * TAU;
    c.drawCircle(cx + Math.cos(t) * R * 0.4, cy + Math.sin(t) * R * 0.4, R * 0.02, fill('#ffffff'));
  }
  const centre = path((b) => {
    for (let i = 0; i < 12; i++) petal(b, cx, cy, R * 0.3, R * 0.1, (i / 12) * TAU);
  });
  c.drawPath(centre, fill('#ffb300'));
  c.drawCircle(cx, cy, R * 0.1, fill('#e65100'));
  c.drawCircle(cx, cy, R * 0.04, fill('#fff3c4'));
  // Petal texture.
  for (let i = 0; i < 700; i++) {
    const t = ctx.rnd() * TAU;
    const r = Math.sqrt(ctx.rnd()) * R * 0.9;
    c.drawCircle(
      cx + Math.cos(t) * r,
      cy + Math.sin(t) * r,
      1.5 + ctx.rnd() * 2,
      fill(ctx.rnd() < 0.5 ? '#ffffff' : '#000000', 0.08 + ctx.rnd() * 0.08),
    );
  }
  ctx.fx.push(
    { x: cx, y: cy },
    { x: cx - R * 0.6, y: cy + R * 0.2 },
    { x: cx + R * 0.6, y: cy + R * 0.3 },
  );
  // Scattered petals near the bottom corners.
  for (let i = 0; i < 26; i++) {
    const x = ctx.rnd() < 0.5 ? ctx.rnd() * 110 : W - ctx.rnd() * 110;
    const y = H - ctx.rnd() * (story ? 500 : 300);
    c.drawPath(
      path((b) => petal(b, x, y, 16, 7, ctx.rnd() * TAU)),
      fill(pick3(ctx), 0.9),
    );
  }
  starDust(ctx, story ? 18 : 8, pal.gold);
}

function pick3(ctx: Ctx): string {
  const list = ['#f57c00', '#ffb300', '#c2185b', '#ffffff'];
  return list[Math.floor(ctx.rnd() * list.length)]!;
}

export function kasavuDesign(ctx: Ctx): void {
  const { c, W, H, pal, story } = ctx;
  background(ctx, { x: 0.5, y: 0.45, r: 0.8 });
  const goldBand = (y: number, h: number) => {
    c.drawRect(
      Skia.XYWHRect(0, y, W, h),
      linear(
        0,
        y,
        0,
        y + h,
        [
          col(mix(pal.gold, '#000000', 0.15)),
          col('#fff1b0'),
          col(pal.gold),
          col('#ffe68a'),
          col(mix(pal.gold, '#000000', 0.2)),
        ],
        [0, 0.3, 0.5, 0.7, 1],
      ),
    );
    for (let x = 0; x < W; x += 36) {
      c.drawPath(
        path((b) =>
          b.addPoly(
            [
              { x, y: y + h },
              { x: x + 18, y: y + h - 14 },
              { x: x + 36, y: y + h },
            ],
            true,
          ),
        ),
        fill(pal.accent, 0.75),
      );
    }
    c.drawLine(0, y - 12, W, y - 12, stroke(pal.gold, 3, 0.9));
    c.drawLine(0, y + h + 12, W, y + h + 12, stroke(pal.gold, 2, 0.8));
  };
  const h = story ? 92 : 64;
  goldBand(story ? 120 : 52, h);
  goldBand(H - (story ? 120 : 52) - h, h);
  c.drawLine(32, 0, 32, H, stroke(pal.gold, 2, 0.5));
  c.drawLine(W - 32, 0, W - 32, H, stroke(pal.gold, 2, 0.5));
  const lampH = story ? 380 : 270;
  const lampBase = H - (story ? 260 : 140);
  nilavilakku(ctx, 82, lampBase, lampH);
  nilavilakku(ctx, W - 82, lampBase, lampH);
  // Jasmine buds scattered under the top band.
  for (let i = 0; i < 18; i++) {
    const x = 130 + ctx.rnd() * (W - 260);
    const y = (story ? 240 : 140) + ctx.rnd() * 22;
    const f = path((b) => {
      for (let k = 0; k < 5; k++) petal(b, x, y, 9, 5, (k / 5) * TAU);
    });
    c.drawPath(f, fill('#ffffff'));
    c.drawCircle(x, y, 2.4, fill('#f4c430'));
  }
}
