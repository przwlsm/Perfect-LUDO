// Draws Kolam's app icon, Android adaptive icon layers, splash image and
// favicon with CanvasKit (the same Skia the app renders with).
// The mark: a kolam in rice flour on dark wet earth at dawn. One unbroken
// line flows around a diamond of thirteen dots, the way the game's solved
// boards bloom, with a marigold at its heart.
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
const paint = (color, style) => {
  const p = new ck.Paint();
  p.setAntiAlias(true);
  if (color) p.setColor(color);
  if (style === 'stroke') p.setStyle(ck.PaintStyle.Stroke);
  return p;
};
const pathOf = (build) => {
  const pb = new ck.PathBuilder();
  build(pb);
  return pb.detach ? pb.detach() : pb.snapshot();
};

/** Cells of a diamond on a 5×5 grid: the inside of the loop. */
const N = 5;
const inside = new Set();
for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (Math.abs(r - 2) + Math.abs(c - 2) <= 2) inside.add(r * N + c);
const isIn = (r, c) => r >= 0 && c >= 0 && r < N && c < N && inside.has(r * N + c);

/** The loop around the diamond as dots in order (walks the boundary edges). */
function loopDots() {
  const edges = new Map(); // dot key -> list of neighbour dot keys
  const add = (a, b) => {
    edges.set(a, [...(edges.get(a) ?? []), b]);
    edges.set(b, [...(edges.get(b) ?? []), a]);
  };
  for (let r = 0; r <= N; r++) for (let c = 0; c < N; c++) if (isIn(r - 1, c) !== isIn(r, c)) add(`${r},${c}`, `${r},${c + 1}`);
  for (let r = 0; r < N; r++) for (let c = 0; c <= N; c++) if (isIn(r, c - 1) !== isIn(r, c)) add(`${r},${c}`, `${r + 1},${c}`);
  const start = [...edges.keys()][0];
  const order = [start];
  let prev = null;
  let cur = start;
  for (;;) {
    const next = edges.get(cur).find((d) => d !== prev);
    if (next === start) break;
    order.push(next);
    prev = cur;
    cur = next;
  }
  return order.map((k) => k.split(',').map(Number));
}
const LOOP = loopDots();

/** The flowing line: every corner rounded from mid-edge to mid-edge. */
function kolamPath(x0, y0, step) {
  const pts = LOOP.map(([r, c]) => [x0 + c * step, y0 + r * step]);
  const n = pts.length;
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  return pathOf((pb) => {
    const m0 = mid(pts[n - 1], pts[0]);
    pb.moveTo(m0[0], m0[1]);
    for (let i = 0; i < n; i++) {
      const p = pts[i];
      const m = mid(p, pts[(i + 1) % n]);
      pb.quadTo(p[0], p[1], m[0], m[1]);
    }
    pb.close();
  });
}

/** Dawn earth: deep terracotta-charcoal, warmer where the light comes from. */
function earth(canvas, s) {
  const bg = paint();
  bg.setShader(
    ck.Shader.MakeRadialGradient([s * 0.5, s * 0.42], s * 0.75, [C('#4a2c1d'), C('#2a1a12'), C('#170e09')], [0, 0.55, 1], ck.TileMode.Clamp),
  );
  canvas.drawRect(ck.XYWHRect(0, 0, s, s), bg);
  // A faint grain, like damp swept ground.
  const grain = paint(C('#ffe9cc', 0.035));
  for (let i = 0; i < 1400; i++) {
    const x = (Math.sin(i * 12.9898) * 43758.5453) % 1;
    const y = (Math.sin(i * 78.233) * 12345.6789) % 1;
    canvas.drawCircle(Math.abs(x) * s, Math.abs(y) * s, s * 0.0016, grain);
  }
}

function marigold(canvas, cx, cy, R, mono) {
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2;
    const px = cx + Math.cos(a) * R * 0.55;
    const py = cy + Math.sin(a) * R * 0.55;
    canvas.drawCircle(px, py, R * 0.42, paint(mono ? C('#000000') : C(k % 2 ? '#f4a01c' : '#ff8a2a')));
  }
  canvas.drawCircle(cx, cy, R * 0.42, paint(mono ? C('#000000') : C('#ffcf5a')));
  if (!mono) canvas.drawCircle(cx, cy, R * 0.18, paint(C('#c2561a')));
}

/** The kolam, centred, `w` wide. */
function mark(canvas, s, k = 1, { mono = false } = {}) {
  const w = s * 0.74 * k;
  const step = w / N;
  const x0 = s / 2 - w / 2;
  const y0 = s / 2 - w / 2;
  const path = kolamPath(x0, y0, step);
  const flour = mono ? C('#000000') : C('#f7f0e3');
  if (!mono) {
    const halo = paint(C('#fff3dc', 0.22), 'stroke');
    halo.setStrokeWidth(step * 0.3);
    halo.setMaskFilter(ck.MaskFilter.MakeBlur(ck.BlurStyle.Normal, step * 0.08, true));
    canvas.drawPath(path, halo);
  }
  const line = paint(flour, 'stroke');
  line.setStrokeWidth(step * 0.13);
  line.setStrokeCap(ck.StrokeCap.Round);
  line.setStrokeJoin(ck.StrokeJoin.Round);
  if (!mono) line.setMaskFilter(ck.MaskFilter.MakeBlur(ck.BlurStyle.Normal, step * 0.012, true));
  canvas.drawPath(path, line);
  if (!mono) {
    // Grains of flour along the line.
    const grain = paint(C('#ffffff', 0.55), 'stroke');
    grain.setStrokeWidth(step * 0.03);
    grain.setStrokeCap(ck.StrokeCap.Round);
    grain.setPathEffect(ck.PathEffect.MakeDash([0.5, step * 0.11], 0));
    canvas.drawPath(path, grain);
  }
  for (const cell of inside) {
    const r = Math.floor(cell / N);
    const c = cell % N;
    const cx = x0 + (c + 0.5) * step;
    const cy = y0 + (r + 0.5) * step;
    if (r === 2 && c === 2) marigold(canvas, cx, cy, step * 0.34, mono);
    else canvas.drawCircle(cx, cy, step * 0.085, paint(flour));
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
  earth(c, s);
  mark(c, s, 1);
});
// Android adaptive icon: the mark inside the 66% safe zone over the earth layer.
await png('adaptive-foreground.png', 1024, (c, s) => mark(c, s, 0.66));
await png('adaptive-background.png', 1024, (c, s) => earth(c, s));
// Android 13+ themed icon: one colour the system tints.
await png('adaptive-monochrome.png', 1024, (c, s) => mark(c, s, 0.66, { mono: true }));
// Splash: the mark alone over the dawn earth colour.
await png('splash-icon.png', 1024, (c, s) => mark(c, s, 1));
await png('favicon.png', 96, (c, s) => {
  earth(c, s);
  mark(c, s, 1.1);
});
console.log('Wrote icons to assets/images/.');
