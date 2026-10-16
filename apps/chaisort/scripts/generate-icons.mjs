// Draws Chai Sort's app icon, Android adaptive layers, splash image and
// favicon with CanvasKit (the same Skia the app renders with): a clay kulhad
// holding three neat layers, steam curling up, under an evening stall's
// string lights. Run with `npm run icons`; writes PNGs to assets/images/.
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
const strokePaint = (color, w, a = 1) => {
  const p = paint(color, a);
  p.setStyle(ck.PaintStyle.Stroke);
  p.setStrokeWidth(w);
  p.setStrokeCap(ck.StrokeCap.Round);
  return p;
};

/** The evening stall: a deep plum-to-ember gradient, a warm glow and a strand of lights. */
function stall(canvas, s, { bulbs = true } = {}) {
  const p = paint();
  p.setShader(
    ck.Shader.MakeLinearGradient([0, 0], [0, s], [C('#1c0d12'), C('#3a1a16'), C('#6a2c17')], null, ck.TileMode.Clamp),
  );
  canvas.drawRect(ck.XYWHRect(0, 0, s, s), p);
  const glow = paint();
  glow.setShader(
    ck.Shader.MakeRadialGradient([s * 0.5, s * 0.62], s * 0.55, [C('#ff9a3c', 0.5), C('#ff9a3c', 0)], null, ck.TileMode.Clamp),
  );
  canvas.drawRect(ck.XYWHRect(0, 0, s, s), glow);
  if (!bulbs) return;
  const wire = new ck.PathBuilder();
  wire.moveTo(-s * 0.05, s * 0.08);
  wire.quadTo(s * 0.5, s * 0.3, s * 1.05, s * 0.08);
  canvas.drawPath(wire.snapshot(), strokePaint('#140806', s * 0.006));
  const colours = ['#ffcf6b', '#ff8f6b', '#ffe9a8', '#7fe0c4', '#ffb35c', '#ffcf6b', '#ff8f6b'];
  for (let i = 1; i <= 7; i++) {
    const t = i / 8;
    const x = -s * 0.05 + t * s * 1.1;
    const y = (1 - t) * (1 - t) * s * 0.08 + 2 * (1 - t) * t * s * 0.3 + t * t * s * 0.08;
    const halo = paint(colours[i - 1], 0.4);
    halo.setMaskFilter(ck.MaskFilter.MakeBlur(ck.BlurStyle.Normal, s * 0.02, true));
    canvas.drawCircle(x, y + s * 0.03, s * 0.035, halo);
    canvas.drawOval(ck.XYWHRect(x - s * 0.012, y + s * 0.012, s * 0.024, s * 0.034), paint(colours[i - 1]));
  }
}

/** A kulhad centred at (cx, base) and `w` wide, holding three layers, with steam. */
function kulhad(canvas, cx, base, w, { mono = false, steam = true } = {}) {
  const k = w / 2;
  const top = base - w * 1.08;
  const inner = k * 0.8;
  const innerB = inner * 0.76;
  const outerB = k * 0.78;
  const foot = w * 0.08;
  // Shadow.
  if (!mono) {
    const sh = paint('#000000', 0.35);
    sh.setMaskFilter(ck.MaskFilter.MakeBlur(ck.BlurStyle.Normal, w * 0.04, true));
    canvas.drawOval(ck.XYWHRect(cx - k * 1.1, base - w * 0.04, k * 2.2, w * 0.09), sh);
  }
  const outer = new ck.PathBuilder();
  outer.moveTo(cx - k, top);
  outer.lineTo(cx - outerB, base - w * 0.08);
  outer.quadTo(cx - outerB, base, cx - outerB + w * 0.08, base);
  outer.lineTo(cx + outerB - w * 0.08, base);
  outer.quadTo(cx + outerB, base, cx + outerB, base - w * 0.08);
  outer.lineTo(cx + k, top);
  outer.close();
  if (mono) {
    canvas.drawPath(outer.snapshot(), paint('#000000'));
  } else {
    const clay = paint();
    clay.setShader(
      ck.Shader.MakeLinearGradient([cx - k, 0], [cx + k, 0], [C('#e08a55'), C('#d27a47'), C('#97461f')], [0, 0.35, 1], ck.TileMode.Clamp),
    );
    canvas.drawPath(outer.snapshot(), clay);
  }
  // The cut-away inside, with three sorted layers.
  const inB = base - foot;
  const inT = top + w * 0.02;
  const interior = new ck.PathBuilder();
  interior.moveTo(cx - inner, inT);
  interior.lineTo(cx - innerB, inB - w * 0.06);
  interior.quadTo(cx - innerB, inB, cx - innerB + w * 0.06, inB);
  interior.lineTo(cx + innerB - w * 0.06, inB);
  interior.quadTo(cx + innerB, inB, cx + innerB, inB - w * 0.06);
  interior.lineTo(cx + inner, inT);
  interior.close();
  if (!mono) {
    canvas.drawPath(interior.snapshot(), paint('#4a2414'));
    canvas.save();
    canvas.clipPath(interior.snapshot(), ck.ClipOp.Intersect, true);
    const lh = (inB - inT) * 0.27;
    const layers = [
      ['#f2711c', '#ff9a4d'],
      ['#f3ead9', '#fffaf0'],
      ['#a85d2c', '#d08a4f'],
    ];
    layers.forEach(([c, l], i) => {
      const y1 = inB - i * lh;
      canvas.drawRect(ck.XYWHRect(cx - k, y1 - lh, w, lh + 1), paint(c));
      canvas.drawRect(ck.XYWHRect(cx - k, y1 - lh, w, lh * 0.12), paint(l, 0.6));
    });
    const surfaceY = inB - 3 * lh;
    const half = innerB + (inner - innerB) * ((inB - surfaceY) / (inB - inT));
    canvas.drawOval(ck.XYWHRect(cx - half, surfaceY - lh * 0.14, half * 2, lh * 0.28), paint('#d08a4f'));
    const shade = paint();
    shade.setShader(
      ck.Shader.MakeLinearGradient(
        [cx - inner, 0],
        [cx + inner, 0],
        [C('#ffffff', 0.22), C('#ffffff', 0), C('#000000', 0), C('#000000', 0.25)],
        [0, 0.35, 0.6, 1],
        ck.TileMode.Clamp,
      ),
    );
    canvas.drawRect(ck.XYWHRect(cx - k, surfaceY, w, inB - surfaceY), shade);
    canvas.restore();
    // Rim.
    const rimRy = w * 0.06;
    canvas.drawOval(ck.XYWHRect(cx - k * 0.9, top - rimRy, k * 1.8, rimRy * 2), paint('#4a2414'));
    canvas.drawOval(ck.XYWHRect(cx - k * 0.9, top - rimRy, k * 1.8, rimRy * 2), strokePaint('#eaa070', k * 0.18));
    canvas.drawOval(ck.XYWHRect(cx - inner, top - rimRy * 0.8, inner * 2, rimRy * 1.6), strokePaint('#7a3518', w * 0.012, 0.6));
  } else {
    canvas.drawOval(ck.XYWHRect(cx - k, top - w * 0.06, w, w * 0.12), paint('#000000'));
  }
  if (!steam) return;
  for (const [dx, h, a] of [
    [-0.28, 0.62, 0.9],
    [0.05, 0.78, 1],
    [0.34, 0.58, 0.85],
  ]) {
    const x0 = cx + dx * w;
    const y0 = top - w * 0.1;
    const len = w * h;
    const curl = new ck.PathBuilder();
    curl.moveTo(x0, y0);
    curl.cubicTo(x0 + w * 0.16, y0 - len * 0.33, x0 - w * 0.16, y0 - len * 0.66, x0 + w * 0.02, y0 - len);
    const sp = strokePaint(mono ? '#000000' : '#fff4e4', w * 0.065, mono ? 1 : a * 0.85);
    if (!mono) sp.setMaskFilter(ck.MaskFilter.MakeBlur(ck.BlurStyle.Normal, w * 0.008, true));
    canvas.drawPath(curl.snapshot(), sp);
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

// Store / iOS icon: full bleed stall with the kulhad.
await png('icon.png', 1024, (c, s) => {
  stall(c, s);
  kulhad(c, s * 0.5, s * 0.86, s * 0.48);
});
// Android adaptive icon: the kulhad inside the 66% safe zone over a separate stall layer.
await png('adaptive-foreground.png', 1024, (c, s) => kulhad(c, s * 0.5, s * 0.74, s * 0.32));
await png('adaptive-background.png', 1024, (c, s) => stall(c, s, { bulbs: false }));
// Android 13+ themed icon: a single-colour silhouette the system tints.
await png('adaptive-monochrome.png', 1024, (c, s) => kulhad(c, s * 0.5, s * 0.74, s * 0.32, { mono: true }));
// Splash: the kulhad alone on the stall colour.
await png('splash-icon.png', 1024, (c, s) => kulhad(c, s * 0.5, s * 0.82, s * 0.5));
// Web favicon.
await png('favicon.png', 96, (c, s) => {
  stall(c, s, { bulbs: false });
  kulhad(c, s * 0.5, s * 0.9, s * 0.56, { steam: false });
});
console.log('Wrote icons to assets/images/.');
