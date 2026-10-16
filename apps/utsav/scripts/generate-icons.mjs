// Draws Utsav's app icon, Android adaptive icon layers, splash image and
// favicon with CanvasKit (the same Skia the app draws cards with): a glowing
// clay diya on a ring of gold rangoli petals, on a deep maroon night.
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
const paint = (color, a = 1) => {
  const p = new ck.Paint();
  p.setAntiAlias(true);
  p.setColor(C(color, a));
  return p;
};
const radial = (x, y, r, colors, stops = null) => {
  const p = new ck.Paint();
  p.setAntiAlias(true);
  p.setShader(ck.Shader.MakeRadialGradient([x, y], r, colors, stops, ck.TileMode.Clamp));
  return p;
};
const linear = (x0, y0, x1, y1, colors, stops = null) => {
  const p = new ck.Paint();
  p.setAntiAlias(true);
  p.setShader(ck.Shader.MakeLinearGradient([x0, y0], [x1, y1], colors, stops, ck.TileMode.Clamp));
  return p;
};

/** Deep maroon night with a warm light rising from the centre. */
function night(canvas, s) {
  canvas.drawRect(ck.XYWHRect(0, 0, s, s), linear(0, 0, s * 0.3, s, [C('#4d1534'), C('#2a0a1c'), C('#1a0610')]));
  canvas.drawRect(ck.XYWHRect(0, 0, s, s), radial(s / 2, s * 0.56, s * 0.62, [C('#ffb347', 0.35), C('#ff8c1a', 0.12), C('#ff8c1a', 0)], [0, 0.45, 1]));
  for (const [x, y, r] of [[0.16, 0.18, 0.008], [0.84, 0.14, 0.007], [0.88, 0.4, 0.005], [0.12, 0.7, 0.005], [0.8, 0.84, 0.006], [0.3, 0.1, 0.004]]) {
    canvas.drawCircle(x * s, y * s, r * s, paint('#ffe6b0', 0.8));
  }
}

function petalPath(x, y, len, w, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const P = (u, v) => [x + cos * u - sin * v, y + sin * u + cos * v];
  const p = new ck.PathBuilder();
  const [tx, ty] = P(len, 0);
  const [a1, a2] = P(len * 0.3, -w * 0.5);
  const [b1, b2] = P(len * 0.78, -w * 0.66);
  const [c1, c2] = P(len * 0.78, w * 0.66);
  const [d1, d2] = P(len * 0.3, w * 0.5);
  p.moveTo(x, y);
  p.cubicTo(a1, a2, b1, b2, tx, ty);
  p.cubicTo(c1, c2, d1, d2, x, y);
  p.close();
  return p.detachAndDelete();
}

/** The mark: a ring of petals, and a diya with its flame in the middle. */
function mark(canvas, cx, cy, R, { mono = false } = {}) {
  const gold = mono ? paint('#000000') : linear(cx, cy - R, cx, cy + R, [C('#ffe9a8'), C('#f2b84b'), C('#c47f12')]);
  if (!mono) canvas.drawCircle(cx, cy, R * 1.2, radial(cx, cy, R * 1.2, [C('#ffcf73', 0.35), C('#ffcf73', 0)]));
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 - Math.PI / 2;
    canvas.drawPath(petalPath(cx + Math.cos(a) * R * 0.78, cy + Math.sin(a) * R * 0.78, R * 0.24, R * 0.11, a), gold);
    const d = a + Math.PI / 16;
    canvas.drawCircle(cx + Math.cos(d) * R * 0.86, cy + Math.sin(d) * R * 0.86, R * 0.025, mono ? paint('#000000') : paint('#ffe6b0'));
  }
  // The diya.
  const w = R * 0.95;
  const h = w * 0.36;
  const base = cy + R * 0.32;
  const top = base - h;
  const bowl = new ck.PathBuilder();
  bowl.moveTo(cx - w * 0.5, top);
  bowl.cubicTo(cx - w * 0.48, top + h * 0.9, cx - w * 0.2, base, cx, base);
  bowl.cubicTo(cx + w * 0.25, base, cx + w * 0.45, top + h * 0.7, cx + w * 0.62, top - h * 0.18);
  bowl.quadTo(cx + w * 0.42, top + h * 0.12, cx + w * 0.3, top + h * 0.05);
  bowl.lineTo(cx - w * 0.5, top);
  bowl.close();
  canvas.drawPath(bowl.detachAndDelete(), mono ? paint('#000000') : linear(cx, top, cx, base, [C('#e8945a'), C('#b4522a'), C('#5e2410')], [0, 0.45, 1]));
  if (!mono) {
    canvas.drawOval(ck.XYWHRect(cx - w * 0.5, top - h * 0.16, w * 0.86, h * 0.34), paint('#5e2410'));
    canvas.drawOval(ck.XYWHRect(cx - w * 0.44, top - h * 0.1, w * 0.74, h * 0.22), paint('#e0a640'));
  }
  // The flame, at the spout.
  const fx = cx + w * 0.36;
  const fy = top + h * 0.02;
  const fh = w * 0.62;
  const fw = w * 0.24;
  if (!mono) canvas.drawCircle(fx, fy - fh * 0.5, fh * 1.1, radial(fx, fy - fh * 0.5, fh * 1.1, [C('#ffd36b', 0.75), C('#ff9d1c', 0.25), C('#ff9d1c', 0)], [0, 0.4, 1]));
  const flame = new ck.PathBuilder();
  flame.moveTo(fx, fy - fh);
  flame.cubicTo(fx + fw * 0.35, fy - fh * 0.62, fx + fw * 0.7, fy - fh * 0.28, fx + fw * 0.5, fy - fh * 0.08);
  flame.cubicTo(fx + fw * 0.32, fy + fh * 0.06, fx - fw * 0.32, fy + fh * 0.06, fx - fw * 0.5, fy - fh * 0.08);
  flame.cubicTo(fx - fw * 0.7, fy - fh * 0.28, fx - fw * 0.35, fy - fh * 0.62, fx, fy - fh);
  flame.close();
  canvas.drawPath(flame.detachAndDelete(), mono ? paint('#000000') : linear(fx, fy, fx, fy - fh, [C('#ff5a00'), C('#ff9d1c'), C('#ffd85a'), C('#fff3c0')], [0, 0.25, 0.6, 1]));
  if (!mono) {
    canvas.drawOval(ck.XYWHRect(fx - fw * 0.18, fy - fh * 0.5, fw * 0.36, fh * 0.42), paint('#fffbe6', 0.95));
  }
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

await png('icon.png', 1024, (c, s) => {
  night(c, s);
  mark(c, s / 2, s / 2, s * 0.34);
});
await png('adaptive-foreground.png', 1024, (c, s) => mark(c, s / 2, s / 2, s * 0.24));
await png('adaptive-background.png', 1024, (c, s) => night(c, s));
await png('adaptive-monochrome.png', 1024, (c, s) => mark(c, s / 2, s / 2, s * 0.24, { mono: true }));
await png('splash-icon.png', 1024, (c, s) => mark(c, s / 2, s / 2, s * 0.4));
await png('favicon.png', 96, (c, s) => {
  night(c, s);
  mark(c, s / 2, s / 2, s * 0.38);
});
console.log('Wrote icons to assets/images/.');
