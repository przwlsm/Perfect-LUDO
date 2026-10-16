import { Skia } from '@shopify/react-native-skia';
import {
  background,
  blurred,
  col,
  fill,
  glow,
  linear,
  mix,
  path,
  petal,
  radial,
  starDust,
  stroke,
  TAU,
  type Ctx,
} from './kit';

function lotus(ctx: Ctx, cx: number, cy: number, s: number): void {
  const { c, pal } = ctx;
  const pink = pal.dark ? '#f48fb1' : mix(pal.accent, '#f06292', 0.6);
  const deep = mix(pink, '#880e4f', 0.45);
  glow(c, cx, cy - s * 0.4, s * 1.6, pal.glow, pal.dark ? 0.4 : 0.35);
  const petalPaint = () =>
    linear(cx, cy - s, cx, cy, [col('#fff5f8'), col(pink), col(deep)], [0, 0.55, 1]);
  // Back petals fan wide, the front ones stand up.
  const back = path((b) => {
    for (const a of [-0.95, -0.55, 0.55, 0.95])
      petal(b, cx, cy, s * 0.95, s * 0.36, -Math.PI / 2 + a, 0.6);
  });
  c.drawPath(back, petalPaint());
  c.drawPath(back, stroke(deep, 2, 0.35));
  const mid = path((b) => {
    for (const a of [-0.3, 0.3]) petal(b, cx, cy, s * 1.0, s * 0.38, -Math.PI / 2 + a, 0.6);
  });
  c.drawPath(mid, petalPaint());
  c.drawPath(mid, stroke(deep, 2, 0.35));
  const front = path((b) => petal(b, cx, cy, s * 1.05, s * 0.4, -Math.PI / 2, 0.6));
  c.drawPath(front, petalPaint());
  c.drawPath(front, stroke(deep, 2, 0.35));
  const low = path((b) => {
    for (const a of [-1.35, 1.35])
      petal(b, cx, cy + s * 0.04, s * 0.7, s * 0.26, -Math.PI / 2 + a, 0.6);
  });
  c.drawPath(low, petalPaint());
  ctx.fx.push({ x: cx, y: cy - s * 0.6 });
}

function pad(ctx: Ctx, cx: number, cy: number, r: number): void {
  const { c } = ctx;
  const green = '#3e8e5a';
  const leaf = path((b) => {
    b.moveTo(cx, cy);
    b.arcToOval(Skia.XYWHRect(cx - r, cy - r * 0.36, r * 2, r * 0.72), -70, 330, false);
    b.close();
  });
  c.drawPath(
    leaf,
    radial(cx - r * 0.3, cy - r * 0.1, r * 1.3, [col('#6fbf7f'), col(green), col('#245c38')]),
  );
  for (let i = 0; i < 6; i++) {
    const a = (-70 + 20 + i * 52) * (Math.PI / 180);
    c.drawLine(
      cx,
      cy,
      cx + Math.cos(a) * r * 0.9,
      cy + Math.sin(a) * r * 0.32,
      stroke('#245c38', 1.5, 0.45),
    );
  }
}

/** Lotuses on still water, with lily pads and ripples. */
export function lotusDesign(ctx: Ctx): void {
  const { c, W, H, pal, story } = ctx;
  background(ctx, { x: 0.5, y: 0.8, r: 0.7 });
  starDust(ctx, story ? 24 : 12, pal.gold);
  const water = story ? H - 520 : H - 300;
  const tint = pal.dark ? mix(pal.bg[1], '#3b5bdb', 0.2) : mix(pal.bg[1], '#4fb3bf', 0.28);
  c.drawRect(
    Skia.XYWHRect(0, water, W, H - water),
    linear(
      0,
      water,
      0,
      H,
      [col(tint, 0), col(tint, 0.85), col(mix(tint, '#000000', 0.1))],
      [0, 0.25, 1],
    ),
  );
  for (let i = 0; i < 7; i++) {
    const y = water + 60 + i * ((H - water - 60) / 7);
    const w = 260 + (i % 3) * 120;
    c.drawOval(
      Skia.XYWHRect(W / 2 - w / 2 + Math.sin(i * 2.7) * 120, y, w, 16 + i * 2),
      stroke('#ffffff', 2, pal.dark ? 0.14 : 0.35),
    );
  }
  const s = story ? 1.25 : 1;
  pad(ctx, W * 0.16, water + 150 * s, 100 * s);
  pad(ctx, W * 0.86, water + 110 * s, 86 * s);
  pad(ctx, W * 0.62, water + 210 * s, 70 * s);
  c.drawOval(
    Skia.XYWHRect(W / 2 - 170 * s, water + 120 * s, 340 * s, 60 * s),
    blurred(fill('#000000', 0.18), 10),
  );
  lotus(ctx, W / 2, water + 140 * s, 190 * s);
  lotus(ctx, W * 0.22, water + 120 * s, 110 * s);
  lotus(ctx, W * 0.8, water + 90 * s, 96 * s);
  for (let i = 0; i < 6; i++) {
    const x = 80 + ((i * 173) % (W - 160));
    const y = water + 40 + ((i * 97) % 120);
    const f = path((b) => {
      for (let k = 0; k < 5; k++) petal(b, x, y, 9, 5, (k / 5) * TAU);
    });
    c.drawPath(f, fill('#fff5f8', 0.9));
  }
}
