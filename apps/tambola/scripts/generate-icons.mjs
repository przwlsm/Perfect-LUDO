// Draws Tambola Party's app icon, Android adaptive icon layers, splash
// image and favicon with CanvasKit (the same Skia the app renders with).
// The mark: a glossy marigold Tambola ball in front of a ticket with two
// pink daubs, under a string of festival lights on a plum night.
// Run with `npm run icons`; writes PNGs to assets/images/.
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const CanvasKitInit = require('canvaskit-wasm/bin/full/canvaskit.js');
const ck = await CanvasKitInit();

const fontData = await fs.readFile(
  require.resolve('@expo-google-fonts/fredoka/700Bold/Fredoka_700Bold.ttf'),
);
const typeface = ck.Typeface.MakeTypefaceFromData(
  fontData.buffer.slice(fontData.byteOffset, fontData.byteOffset + fontData.byteLength),
);
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

/** The festive night: plum to indigo, with a warm glow where the ball sits. */
function night(canvas, s) {
  const bg = paint();
  bg.setShader(
    ck.Shader.MakeLinearGradient([0, 0], [s * 0.4, s], [C('#3a1150'), C('#24093a'), C('#160626')], null, ck.TileMode.Clamp),
  );
  canvas.drawRect(ck.XYWHRect(0, 0, s, s), bg);
  const glow = paint();
  glow.setShader(
    ck.Shader.MakeRadialGradient([s * 0.56, s * 0.6], s * 0.55, [C('#ff7a3d', 0.35), C('#ff3d8b', 0.12), C('#ff3d8b', 0)], [0, 0.55, 1], ck.TileMode.Clamp),
  );
  canvas.drawRect(ck.XYWHRect(0, 0, s, s), glow);
}

/** A sagging wire of little coloured bulbs across the top. */
function lights(canvas, s, { mono = false, y0 = 0.17, sag = 0.08 } = {}) {
  const wire = paint(mono ? C('#000000') : C('#f5d48a', 0.55), 'stroke');
  wire.setStrokeWidth(s * 0.006);
  const pb = new ck.PathBuilder();
  pb.moveTo(-s * 0.05, s * (y0 - 0.02));
  pb.quadTo(s * 0.5, s * (y0 + sag * 2), s * 1.05, s * (y0 - 0.02));
  const path = pb.detach ? pb.detach() : pb.snapshot();
  canvas.drawPath(path, wire);
  const hues = ['#ffd166', '#ff5d8f', '#4dd6c4', '#ffb627', '#c58bff', '#ff8a3d'];
  for (let i = 0; i < 9; i++) {
    const t = (i + 0.5) / 9;
    const x = -s * 0.05 + t * s * 1.1;
    const y = s * (y0 - 0.02) * (1 - t) ** 2 + 2 * (1 - t) * t * s * (y0 + sag * 2) + t * t * s * (y0 - 0.02);
    const hue = hues[i % hues.length];
    if (!mono) {
      const halo = paint(C(hue, 0.45));
      halo.setMaskFilter(ck.MaskFilter.MakeBlur(ck.BlurStyle.Normal, s * 0.018, true));
      canvas.drawCircle(x, y + s * 0.025, s * 0.03, halo);
    }
    canvas.drawCircle(x, y + s * 0.025, s * 0.017, paint(mono ? C('#000000') : C(hue)));
  }
}

/** A cream ticket, tilted, with a few cells and two pink daubs. */
function ticket(canvas, cx, cy, w, { mono = false } = {}) {
  const h = w * 0.62;
  canvas.save();
  canvas.rotate(-9, cx, cy);
  const rect = ck.XYWHRect(cx - w / 2, cy - h / 2, w, h);
  if (!mono) {
    const shadow = paint(C('#0a0214', 0.5));
    shadow.setMaskFilter(ck.MaskFilter.MakeBlur(ck.BlurStyle.Normal, w * 0.03, true));
    canvas.drawRRect(ck.RRectXY(ck.XYWHRect(cx - w / 2, cy - h / 2 + w * 0.03, w, h), w * 0.06, w * 0.06), shadow);
  }
  canvas.drawRRect(ck.RRectXY(rect, w * 0.06, w * 0.06), paint(mono ? C('#000000') : C('#fff8ec')));
  if (!mono) {
    // Header band.
    canvas.save();
    canvas.clipRRect(ck.RRectXY(rect, w * 0.06, w * 0.06), ck.ClipOp.Intersect, true);
    canvas.drawRect(ck.XYWHRect(cx - w / 2, cy - h / 2, w, h * 0.2), paint(C('#b0174f')));
    canvas.restore();
    const cols = 5;
    const rows = 3;
    const gw = w * 0.88;
    const gh = h * 0.68;
    const x0 = cx - gw / 2;
    const y0 = cy - h / 2 + h * 0.26;
    const cw = gw / cols;
    const chh = gh / rows;
    const filled = [[1, 0, 1, 1, 0], [0, 1, 1, 0, 1], [1, 1, 0, 1, 0]];
    const daubs = [[0, 2], [2, 1]];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = ck.XYWHRect(x0 + c * cw + cw * 0.06, y0 + r * chh + chh * 0.08, cw * 0.88, chh * 0.84);
        canvas.drawRRect(ck.RRectXY(cell, cw * 0.14, cw * 0.14), paint(C(filled[r][c] ? '#ffffff' : '#f2dcb6')));
        if (filled[r][c]) {
          const isDaub = daubs.some(([dr, dc]) => dr === r && dc === c);
          if (isDaub) canvas.drawCircle(cell[0] + cw * 0.44, cell[1] + chh * 0.42, Math.min(cw, chh) * 0.36, paint(C('#e0457b', 0.92)));
          else {
            const bar = paint(C('#2a1238', 0.85));
            canvas.drawRRect(ck.RRectXY(ck.XYWHRect(cell[0] + cw * 0.24, cell[1] + chh * 0.32, cw * 0.4, chh * 0.2), chh * 0.1, chh * 0.1), bar);
          }
        }
      }
    }
  }
  canvas.restore();
}

/** The Tambola ball: marigold gloss, a white disc, and the number. */
function ball(canvas, cx, cy, R, { mono = false, label = '7' } = {}) {
  if (!mono) {
    const shadow = paint(C('#0a0214', 0.55));
    shadow.setMaskFilter(ck.MaskFilter.MakeBlur(ck.BlurStyle.Normal, R * 0.12, true));
    canvas.drawCircle(cx + R * 0.05, cy + R * 0.12, R * 0.98, shadow);
    const body = paint();
    body.setShader(
      ck.Shader.MakeRadialGradient([cx - R * 0.35, cy - R * 0.4], R * 1.5, [C('#ffe28a'), C('#ffb627'), C('#ff7a1a'), C('#c2410c')], [0, 0.35, 0.75, 1], ck.TileMode.Clamp),
    );
    canvas.drawCircle(cx, cy, R, body);
  } else {
    // A clear gap separates the ball from the ticket behind it.
    const gap = paint(C('#000000', 0));
    gap.setBlendMode(ck.BlendMode.Clear);
    canvas.drawCircle(cx, cy, R * 1.08, gap);
    canvas.drawCircle(cx, cy, R, paint(C('#000000')));
  }
  // The white disc carries the number; in the monochrome icon it is cut out.
  const disc = paint(mono ? C('#000000', 0) : C('#fffaf0'));
  if (mono) disc.setBlendMode(ck.BlendMode.Clear);
  canvas.drawCircle(cx, cy, R * 0.6, disc);
  if (!mono) {
    const ring = paint(C('#ff5d8f'), 'stroke');
    ring.setStrokeWidth(R * 0.045);
    canvas.drawCircle(cx, cy, R * 0.6, ring);
  }
  const font = new ck.Font(typeface, R * 0.78);
  const glyphs = font.getGlyphIDs(label);
  const widths = font.getGlyphWidths(glyphs);
  const w = widths.reduce((a, b) => a + b, 0);
  const ink = paint(mono ? C('#000000') : C('#2a1238'));
  canvas.drawText(label, cx - w / 2, cy + R * 0.28, ink, font);
  if (!mono) {
    const shine = paint(C('#ffffff', 0.55));
    shine.setMaskFilter(ck.MaskFilter.MakeBlur(ck.BlurStyle.Normal, R * 0.05, true));
    canvas.drawOval(ck.XYWHRect(cx - R * 0.62, cy - R * 0.86, R * 0.5, R * 0.26), shine);
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

/** The mark, centred in a box of side `s` scaled by `k` (1 = full icon composition). */
function mark(canvas, s, k = 1, opts = {}) {
  const c = s / 2;
  ticket(canvas, c - s * 0.1 * k, c - s * 0.02 * k, s * 0.62 * k, opts);
  ball(canvas, c + s * 0.13 * k, c + s * 0.12 * k, s * 0.21 * k, opts);
}

await png('icon.png', 1024, (c, s) => {
  night(c, s);
  lights(c, s);
  mark(c, s, 1);
});
// Android adaptive icon: the mark inside the 66% safe zone over the night layer.
await png('adaptive-foreground.png', 1024, (c, s) => mark(c, s, 0.68));
await png('adaptive-background.png', 1024, (c, s) => {
  night(c, s);
  lights(c, s, { y0: 0.2, sag: 0.06 });
});
// Android 13+ themed icon: one colour the system tints.
await png('adaptive-monochrome.png', 1024, (c, s) => mark(c, s, 0.68, { mono: true }));
// Splash: the mark alone; the splash background is the plum night.
await png('splash-icon.png', 1024, (c, s) => mark(c, s, 1));
// Web favicon: the ball alone reads best at 32 px.
await png('favicon.png', 96, (c, s) => {
  night(c, s);
  ball(c, s / 2, s / 2, s * 0.4);
});
console.log('Wrote icons to assets/images/.');
