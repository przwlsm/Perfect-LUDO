// Draws Monsoon Fields' app icon, Android adaptive layers, splash image and
// favicon with CanvasKit (the same Skia the app renders with): a rain cloud
// over green terraces, its rain running down a stone channel into a paddy.
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
  if (color) p.setColor(C(color, a));
  return p;
};
const stroke = (color, width, a = 1) => {
  const p = paint(color, a);
  p.setStyle(ck.PaintStyle.Stroke);
  p.setStrokeWidth(width);
  p.setStrokeCap(ck.StrokeCap.Round);
  p.setStrokeJoin(ck.StrokeJoin.Round);
  return p;
};
const linear = (p, x0, y0, x1, y1, colors, pos = null) => {
  p.setShader(
    ck.Shader.MakeLinearGradient([x0, y0], [x1, y1], colors.map((c) => C(c)), pos, ck.TileMode.Clamp),
  );
  return p;
};

/** The stormy sky over green terraced hills. */
function background(canvas, s) {
  canvas.drawRect(ck.XYWHRect(0, 0, s, s), linear(paint(), 0, 0, 0, s, ['#16343c', '#24505a', '#3d6e6a']));
  // Terraces: curved green steps, each with a bright water line along its lip.
  const steps = [
    { y: 0.62, c: ['#5f9e4a', '#4b8a3b'] },
    { y: 0.72, c: ['#78b65a', '#5f9e47'] },
    { y: 0.83, c: ['#8fca6a', '#73b354'] },
    { y: 0.93, c: ['#a6dc7c', '#88c564'] },
  ];
  for (const step of steps) {
    const b = new ck.PathBuilder();
    const y = step.y * s;
    b.moveTo(0, y + s * 0.03);
    b.cubicTo(s * 0.3, y - s * 0.04, s * 0.7, y + s * 0.05, s, y - s * 0.02);
    b.lineTo(s, s);
    b.lineTo(0, s);
    b.close();
    const path = b.snapshot();
    canvas.drawPath(path, linear(paint(), 0, y - s * 0.04, 0, y + s * 0.1, step.c));
    const lip = new ck.PathBuilder();
    lip.moveTo(0, y + s * 0.03);
    lip.cubicTo(s * 0.3, y - s * 0.04, s * 0.7, y + s * 0.05, s, y - s * 0.02);
    canvas.drawPath(lip.snapshot(), stroke('#bfe8ff', s * 0.008, 0.55));
  }
}

/** A puffy rain cloud centred at (cx, cy), `w` wide. */
function cloud(canvas, cx, cy, w, { mono = false } = {}) {
  const k = w / 2;
  const puffs = [
    [-0.55, 0.12, 0.42],
    [-0.12, -0.16, 0.55],
    [0.42, -0.02, 0.46],
    [0.72, 0.2, 0.3],
    [-0.85, 0.28, 0.26],
  ];
  const b = new ck.PathBuilder();
  for (const [x, y, r] of puffs) b.addCircle(cx + x * k, cy + y * k, r * k);
  b.addRRect(ck.RRectXY(ck.XYWHRect(cx - k * 1.1, cy + k * 0.05, k * 2.1, k * 0.5), k * 0.25, k * 0.25));
  const shape = b.snapshot();
  if (mono) {
    canvas.drawPath(shape, paint('#000000'));
    return;
  }
  const shadow = paint('#08161a', 0.35);
  shadow.setMaskFilter(ck.MaskFilter.MakeBlur(ck.BlurStyle.Normal, k * 0.08, true));
  canvas.save();
  canvas.translate(0, k * 0.1);
  canvas.drawPath(shape, shadow);
  canvas.restore();
  canvas.drawPath(shape, linear(paint(), 0, cy - k * 0.7, 0, cy + k * 0.55, ['#ffffff', '#dbe9f0', '#a9c1cc']));
}

/** A teardrop of rain at (x, y), `h` tall. */
function drop(canvas, x, y, h, color, a = 1) {
  const w = h * 0.36;
  const b = new ck.PathBuilder();
  b.moveTo(x, y - h * 0.5);
  b.cubicTo(x + w * 0.2, y - h * 0.2, x + w, y + h * 0.05, x + w, y + h * 0.22);
  b.cubicTo(x + w, y + h * 0.42, x + w * 0.55, y + h * 0.5, x, y + h * 0.5);
  b.cubicTo(x - w * 0.55, y + h * 0.5, x - w, y + h * 0.42, x - w, y + h * 0.22);
  b.cubicTo(x - w, y + h * 0.05, x - w * 0.2, y - h * 0.2, x, y - h * 0.5);
  b.close();
  canvas.drawPath(b.snapshot(), paint(color, a));
}

/** The game's stone channel: a bend carrying bright water, ending in a paddy with rice. */
function channel(canvas, s, { scale = 1, dx = 0, dy = 0, mono = false } = {}) {
  const S = s * scale;
  const ox = dx * s;
  const oy = dy * s;
  const b = new ck.PathBuilder();
  b.moveTo(ox + S * 0.38, oy + S * 0.5);
  b.lineTo(ox + S * 0.38, oy + S * 0.66);
  b.quadTo(ox + S * 0.38, oy + S * 0.78, ox + S * 0.5, oy + S * 0.78);
  b.lineTo(ox + S * 0.6, oy + S * 0.78);
  const path = b.snapshot();
  if (mono) {
    canvas.drawPath(path, stroke('#000000', S * 0.13));
    canvas.drawRRect(
      ck.RRectXY(ck.XYWHRect(ox + S * 0.56, oy + S * 0.68, S * 0.22, S * 0.2), S * 0.05, S * 0.05),
      paint('#000000'),
    );
    return;
  }
  canvas.drawPath(path, stroke('#5b5a50', S * 0.15));
  canvas.drawPath(path, stroke('#d8d3c0', S * 0.125));
  canvas.drawPath(path, stroke('#4a3d2c', S * 0.07));
  const water = stroke('#5cc0ff', S * 0.055);
  canvas.drawPath(path, water);
  canvas.drawPath(path, stroke('#e6f7ff', S * 0.014, 0.8));
  // The paddy: a square of water with young rice.
  const px = ox + S * 0.58;
  const py = oy + S * 0.69;
  const pw = S * 0.2;
  canvas.drawRRect(ck.RRectXY(ck.XYWHRect(px - S * 0.012, py - S * 0.012, pw + S * 0.024, pw + S * 0.024), S * 0.045, S * 0.045), paint('#6b5236'));
  canvas.drawRRect(ck.RRectXY(ck.XYWHRect(px, py, pw, pw), S * 0.035, S * 0.035), linear(paint(), 0, py, 0, py + pw, ['#7fd1ff', '#3d9edb']));
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 2; j++) {
      const x = px + pw * (0.22 + i * 0.28);
      const y = py + pw * (0.38 + j * 0.36);
      const leaf = stroke('#bff27a', S * 0.012);
      for (const a of [-0.5, 0, 0.5]) {
        canvas.drawLine(x, y, x + Math.sin(a) * S * 0.035, y - Math.cos(a) * S * 0.045, leaf);
      }
    }
  }
}

function rain(canvas, s, { scale = 1, dx = 0, dy = 0 } = {}) {
  const S = s * scale;
  for (const [x, y, h] of [
    [0.3, 0.42, 0.07],
    [0.48, 0.47, 0.06],
    [0.62, 0.41, 0.075],
    [0.74, 0.5, 0.055],
    [0.2, 0.52, 0.05],
  ]) {
    drop(canvas, dx * s + x * S, dy * s + y * S, h * S, '#bfe6ff', 0.95);
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

function full(c, s) {
  background(c, s);
  rain(c, s);
  cloud(c, s * 0.5, s * 0.27, s * 0.56);
  channel(c, s);
}

// Store / iOS icon: full bleed.
await png('icon.png', 1024, full);
// Android adaptive icon: cloud, rain and channel inside the 66% safe zone over the hills.
await png('adaptive-foreground.png', 1024, (c, s) => {
  rain(c, s, { scale: 0.66, dx: 0.17, dy: 0.17 });
  cloud(c, s * 0.5, s * 0.35, s * 0.38);
  channel(c, s, { scale: 0.66, dx: 0.17, dy: 0.17 });
});
await png('adaptive-background.png', 1024, (c, s) => background(c, s));
// Android 13+ themed icon: a single-colour silhouette the system tints.
await png('adaptive-monochrome.png', 1024, (c, s) => {
  cloud(c, s * 0.5, s * 0.35, s * 0.38, { mono: true });
  for (const [x, y, h] of [
    [0.38, 0.52, 0.06],
    [0.5, 0.55, 0.05],
    [0.62, 0.52, 0.06],
  ])
    drop(c, x * s, y * s, h * s, '#000000');
  channel(c, s, { scale: 0.66, dx: 0.17, dy: 0.17, mono: true });
});
// Splash: the cloud and channel alone on the storm colour.
await png('splash-icon.png', 1024, (c, s) => {
  rain(c, s, { scale: 0.9, dx: 0.05, dy: 0.04 });
  cloud(c, s * 0.5, s * 0.3, s * 0.5);
  channel(c, s, { scale: 0.9, dx: 0.05, dy: 0.04 });
});
// Web favicon.
await png('favicon.png', 96, full);
console.log('Wrote icons to assets/images/.');
