// Draws the app icon, Android adaptive icon layers, splash image and favicon
// with CanvasKit (the same Skia the app renders with): a city at dusk under
// an auto-rickshaw-yellow speech bubble with a voice in it.
// Run with `npm run icons`; writes PNGs to assets/images/.
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const CanvasKitInit = require('canvaskit-wasm/bin/full/canvaskit.js');
const ck = await CanvasKitInit();

const out = new URL('../assets/images/', import.meta.url);
await fs.mkdir(out, { recursive: true });

const C = (hex, a = 1) => {
  const n = parseInt(hex.slice(1), 16);
  return ck.Color((n >> 16) & 255, (n >> 8) & 255, n & 255, a);
};
const paint = (color) => {
  const p = new ck.Paint();
  p.setAntiAlias(true);
  if (color) p.setColor(color);
  return p;
};

/** Dusk sky: navy to violet to a warm horizon, with the sun just setting. */
function sky(canvas, s) {
  const p = paint();
  p.setShader(
    ck.Shader.MakeLinearGradient([0, 0], [0, s], [C('#16204a'), C('#4f3470'), C('#ef8a5c')], [0, 0.55, 1], ck.TileMode.Clamp),
  );
  canvas.drawRect(ck.XYWHRect(0, 0, s, s), p);
  const glow = paint();
  glow.setShader(
    ck.Shader.MakeRadialGradient([s * 0.5, s * 0.86], s * 0.42, [C('#ffd27a', 0.75), C('#ffd27a', 0)], null, ck.TileMode.Clamp),
  );
  canvas.drawCircle(s * 0.5, s * 0.86, s * 0.42, glow);
  for (const [x, y, r] of [[0.14, 0.13, 0.005], [0.83, 0.1, 0.006], [0.9, 0.3, 0.004], [0.08, 0.38, 0.004], [0.3, 0.07, 0.003]]) {
    canvas.drawCircle(x * s, y * s, r * s, paint(C('#fff6dc', 0.8)));
  }
}

/** A row of stylised landmarks: a domed hall, a tiered temple tower, minarets, lit blocks. */
function skyline(canvas, s, color, base = 0.88) {
  const g = s * base;
  const u = s / 100;
  const b = new ck.PathBuilder();
  const rect = (x0, y0, x1, y1) => b.addRect(ck.LTRBRect(x0 * u, g - y0 * u, x1 * u, g - y1 * u + 1));
  const lit = [];
  const block = (x, w, h) => {
    rect(x, h, x + w, 0);
    for (let wy = h - 2.6; wy > 2.5; wy -= 3.4)
      for (let wx = x + 1.2; wx < x + w - 1.4; wx += 2.6) if ((wx * 7 + wy * 13) % 5 < 2.2) lit.push([wx, wy]);
  };
  block(0, 7, 11); block(7.5, 6, 16); block(84, 6.5, 15); block(91, 9, 10);
  // Domed hall with a drum and two small side domes.
  rect(15, 9, 37, 0);
  rect(22, 14, 30, 9);
  b.moveTo(21.5 * u, g - 14 * u);
  b.cubicTo(21.5 * u, g - 21 * u, 30.5 * u, g - 21 * u, 30.5 * u, g - 14 * u);
  b.close();
  rect(25.7, 23.5, 26.3, 19);
  for (const x of [17.5, 34.5]) {
    b.moveTo((x - 2) * u, g - 9 * u);
    b.cubicTo((x - 2) * u, g - 12.5 * u, (x + 2) * u, g - 12.5 * u, (x + 2) * u, g - 9 * u);
    b.close();
  }
  // Tiered temple tower with ledges and a barrel top.
  let w = 7.5;
  let y = 0;
  for (let i = 0; i < 6; i++) {
    const top = w - 0.9;
    b.moveTo((50 - w) * u, g - y * u + 1);
    b.lineTo((50 - top) * u, g - (y + 4.2) * u);
    b.lineTo((50 + top) * u, g - (y + 4.2) * u);
    b.lineTo((50 + w) * u, g - y * u + 1);
    b.close();
    rect(50 - top - 0.5, y + 4.9, 50 + top + 0.5, y + 4.2);
    w = top;
    y += 4.9;
  }
  b.addRRect(ck.RRectXY(ck.LTRBRect((50 - 3.6) * u, g - (y + 3) * u, (50 + 3.6) * u, g - y * u + 1), 1.5 * u, 1.5 * u));
  // A gateway between two minarets.
  rect(64, 12, 76, 0);
  rect(63.2, 14, 76.8, 12);
  for (const x of [63, 77]) {
    rect(x - 1.1, 25, x + 1.1, 0);
    rect(x - 1.7, 17.6, x + 1.7, 16.8);
    b.moveTo((x - 1.4) * u, g - 25 * u);
    b.cubicTo((x - 1.4) * u, g - 27.4 * u, (x + 1.4) * u, g - 27.4 * u, (x + 1.4) * u, g - 25 * u);
    b.close();
  }
  const path = b.detach();
  const arch = new ck.PathBuilder();
  arch.moveTo(67.5 * u, g + 1);
  arch.lineTo(67.5 * u, g - 6.5 * u);
  arch.quadTo(70 * u, g - 10.5 * u, 72.5 * u, g - 6.5 * u);
  arch.lineTo(72.5 * u, g + 1);
  arch.close();
  const cut = ck.Path.MakeFromOp(path, arch.detach(), ck.PathOp.Difference) ?? path;
  canvas.drawPath(cut, paint(color));
  for (const [x, wy] of lit) canvas.drawRect(ck.LTRBRect(x * u, g - wy * u, (x + 1) * u, g - (wy - 1.3) * u), paint(C('#ffc94d', 0.85)));
  canvas.drawRect(ck.LTRBRect(0, g, s, s), paint(color));
}

/** The speech bubble with sound bars. `mono` draws a flat silhouette for themed icons. */
function bubble(canvas, cx, cy, w, { mono = false } = {}) {
  const h = w * 0.72;
  const r = h * 0.42;
  const b = new ck.PathBuilder();
  b.addRRect(ck.RRectXY(ck.LTRBRect(cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2), r, r));
  const body = b.detach();
  // Tail, bottom left, as its own shape (so its winding never cancels the body's).
  const tb = new ck.PathBuilder();
  tb.moveTo(cx - w * 0.3, cy + h * 0.3);
  tb.lineTo(cx - w * 0.36, cy + h * 0.8);
  tb.lineTo(cx - w * 0.04, cy + h * 0.42);
  tb.close();
  const tail = tb.detach();
  const shape = ck.Path.MakeFromOp(body, tail, ck.PathOp.Union) ?? body;
  if (!mono) {
    const shadow = paint(C('#000000', 0.28));
    shadow.setMaskFilter(ck.MaskFilter.MakeBlur(ck.BlurStyle.Normal, w * 0.04, true));
    canvas.save();
    canvas.translate(0, w * 0.035);
    canvas.drawPath(shape, shadow);
    canvas.restore();
  }
  const fill = paint();
  if (mono) fill.setColor(C('#000000'));
  else
    fill.setShader(
      ck.Shader.MakeLinearGradient([cx, cy - h / 2], [cx, cy + h / 2], [C('#ffd75a'), C('#f7b500')], null, ck.TileMode.Clamp),
    );
  canvas.drawPath(shape, fill);
  // Sound bars: a voice, rising and falling.
  const bars = [0.32, 0.6, 0.9, 0.62, 0.38];
  const bw = w * 0.085;
  const gap = w * 0.055;
  const total = bars.length * bw + (bars.length - 1) * gap;
  const bar = paint(mono ? C('#000000') : C('#13233a'));
  if (mono) bar.setBlendMode(ck.BlendMode.Clear);
  bars.forEach((v, i) => {
    const x = cx - total / 2 + i * (bw + gap);
    const bh = h * 0.62 * v;
    canvas.drawRRect(ck.RRectXY(ck.LTRBRect(x, cy - bh / 2, x + bw, cy + bh / 2), bw / 2, bw / 2), bar);
  });
}

async function png(name, size, draw) {
  const surface = ck.MakeSurface(size, size);
  const canvas = surface.getCanvas();
  canvas.clear(ck.TRANSPARENT);
  draw(canvas, size);
  surface.flush();
  const bytes = surface.makeImageSnapshot().encodeToBytes();
  await fs.writeFile(new URL(name, out), Buffer.from(bytes));
  surface.delete();
}

// Store / iOS icon: full-bleed dusk, the city, the bubble.
await png('icon.png', 1024, (c, s) => {
  sky(c, s);
  skyline(c, s, C('#141a36'));
  bubble(c, s * 0.52, s * 0.41, s * 0.56);
});
// Android adaptive: the bubble and city inside the 66% safe zone, over the sky layer.
await png('adaptive-foreground.png', 1024, (c, s) => bubble(c, s * 0.52, s * 0.44, s * 0.42));
await png('adaptive-background.png', 1024, (c, s) => {
  sky(c, s);
  c.save();
  // Keep the city low and inside the area every launcher mask shows.
  c.translate(s * 0.08, s * 0.02);
  c.scale(0.84, 0.84);
  skyline(c, s, C('#141a36'), 0.9);
  c.restore();
  c.drawRect(ck.LTRBRect(0, s * 0.77, s, s), paint(C('#141a36')));
});
// Android 13+ themed icon: one flat silhouette the system tints.
await png('adaptive-monochrome.png', 1024, (c, s) => bubble(c, s * 0.51, s * 0.47, s * 0.4, { mono: true }));
// Splash: the bubble alone on the dusk-navy splash colour.
await png('splash-icon.png', 1024, (c, s) => bubble(c, s * 0.5, s * 0.46, s * 0.7));
// Web favicon.
await png('favicon.png', 96, (c, s) => {
  sky(c, s);
  skyline(c, s, C('#141a36'));
  bubble(c, s * 0.52, s * 0.42, s * 0.62);
});
console.log('Wrote icons to assets/images/.');
