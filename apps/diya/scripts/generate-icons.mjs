// Draws Diya's app icon, Android adaptive layers, splash image and favicon with
// CanvasKit (the same Skia the app renders with): a clay diya on a festival
// night, its flame caught by a beam of gold light.
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

/** The night: deep violet with a warm glow low down and a few stars. */
function night(canvas, s) {
  const p = paint();
  p.setShader(
    ck.Shader.MakeLinearGradient(
      [0, 0],
      [s * 0.3, s],
      [C('#0b0616'), C('#24103b'), C('#4a2050')],
      null,
      ck.TileMode.Clamp,
    ),
  );
  canvas.drawRect(ck.XYWHRect(0, 0, s, s), p);
  const glow = paint();
  glow.setShader(
    ck.Shader.MakeRadialGradient(
      [s * 0.5, s * 0.78],
      s * 0.6,
      [C('#ff9a3c', 0.45), C('#ff9a3c', 0)],
      null,
      ck.TileMode.Clamp,
    ),
  );
  canvas.drawRect(ck.XYWHRect(0, 0, s, s), glow);
  for (const [x, y, r] of [
    [0.16, 0.14, 0.006],
    [0.82, 0.1, 0.005],
    [0.9, 0.32, 0.004],
    [0.08, 0.4, 0.004],
    [0.3, 0.07, 0.003],
    [0.66, 0.22, 0.003],
  ]) {
    canvas.drawCircle(x * s, y * s, r * s, paint('#fff1d2', 0.85));
  }
}

/** A clay diya centred at (cx, cy), `w` wide, with its flame and an optional beam. */
function diya(canvas, cx, cy, w, { mono = false, beam = true } = {}) {
  const k = w / 2;
  if (beam && !mono) {
    // A beam of gold light arriving from the upper left, glowing.
    const ray = paint('#ffd27a', 0.55);
    ray.setStyle(ck.PaintStyle.Stroke);
    ray.setStrokeWidth(k * 0.32);
    ray.setStrokeCap(ck.StrokeCap.Round);
    ray.setMaskFilter(ck.MaskFilter.MakeBlur(ck.BlurStyle.Normal, k * 0.12, true));
    canvas.drawLine(cx - k * 2.1, cy - k * 2.05, cx + k * 0.42, cy - k * 0.62, ray);
    const core = paint('#fff6dc', 0.95);
    core.setStyle(ck.PaintStyle.Stroke);
    core.setStrokeWidth(k * 0.07);
    core.setStrokeCap(ck.StrokeCap.Round);
    canvas.drawLine(cx - k * 2.1, cy - k * 2.05, cx + k * 0.42, cy - k * 0.62, core);
  }
  // Halo.
  if (!mono) {
    const halo = paint();
    halo.setShader(
      ck.Shader.MakeRadialGradient(
        [cx + k * 0.5, cy - k * 0.75],
        k * 1.9,
        [C('#ffc65c', 0.75), C('#ff8a3d', 0.25), C('#ff8a3d', 0)],
        [0, 0.45, 1],
        ck.TileMode.Clamp,
      ),
    );
    canvas.drawCircle(cx + k * 0.5, cy - k * 0.75, k * 1.9, halo);
  }
  // Bowl with spout.
  const bowl = new ck.PathBuilder();
  bowl.moveTo(cx - k * 0.95, cy - k * 0.08);
  bowl.cubicTo(
    cx - k * 0.9,
    cy + k * 0.9,
    cx + k * 0.75,
    cy + k * 0.9,
    cx + k * 0.82,
    cy - k * 0.08,
  );
  bowl.lineTo(cx + k * 1.12, cy - k * 0.34);
  bowl.lineTo(cx + k * 0.5, cy - k * 0.16);
  bowl.close();
  const clay = paint(mono ? '#000000' : null);
  if (!mono)
    clay.setShader(
      ck.Shader.MakeLinearGradient(
        [0, cy - k * 0.3],
        [0, cy + k * 0.8],
        [C('#e08a5a'), C('#c4623a'), C('#6e2c17')],
        null,
        ck.TileMode.Clamp,
      ),
    );
  canvas.drawPath(bowl.snapshot(), clay);
  if (!mono) {
    const band = paint('#ffd27a');
    band.setStyle(ck.PaintStyle.Stroke);
    band.setStrokeWidth(k * 0.2);
    const b = new ck.PathBuilder();
    b.moveTo(cx - k * 0.82, cy + k * 0.18);
    b.cubicTo(
      cx - k * 0.55,
      cy + k * 0.6,
      cx + k * 0.45,
      cy + k * 0.6,
      cx + k * 0.72,
      cy + k * 0.18,
    );
    canvas.save();
    canvas.clipPath(bowl.snapshot(), ck.ClipOp.Intersect, true);
    canvas.drawPath(b.snapshot(), band);
    for (let i = 0; i < 5; i++) {
      const t = (i + 0.5) / 5;
      canvas.drawCircle(
        cx - k * 0.7 + t * k * 1.3,
        cy + k * 0.35 + Math.sin(t * Math.PI) * k * 0.12,
        k * 0.045,
        paint('#fff6dc'),
      );
    }
    canvas.restore();
    canvas.drawOval(
      ck.XYWHRect(cx - k * 0.95, cy - k * 0.25, k * 1.78, k * 0.32),
      paint('#a24f2c'),
    );
    canvas.drawOval(ck.XYWHRect(cx - k * 0.8, cy - k * 0.19, k * 1.45, k * 0.2), paint('#3a1a0e'));
  }
  // Flame at the spout.
  const fx = cx + k * 0.68;
  const fy = cy - k * 0.3;
  const h = k * 1.25;
  const fw = k * 0.3;
  const flame = new ck.PathBuilder();
  flame.moveTo(fx, fy + fw * 0.4);
  flame.cubicTo(fx - fw * 1.2, fy, fx - fw * 0.8, fy - h * 0.5, fx - fw * 0.15, fy - h);
  flame.cubicTo(fx + fw * 0.9, fy - h * 0.5, fx + fw * 1.2, fy, fx, fy + fw * 0.4);
  flame.close();
  if (mono) {
    canvas.drawPath(flame.snapshot(), paint('#000000'));
    return;
  }
  const outer = paint('#ffb53f');
  outer.setMaskFilter(ck.MaskFilter.MakeBlur(ck.BlurStyle.Solid, k * 0.08, true));
  canvas.drawPath(flame.snapshot(), outer);
  const inner = new ck.PathBuilder();
  inner.moveTo(fx, fy + fw * 0.25);
  inner.cubicTo(fx - fw * 0.6, fy, fx - fw * 0.4, fy - h * 0.3, fx - fw * 0.05, fy - h * 0.55);
  inner.cubicTo(fx + fw * 0.45, fy - h * 0.3, fx + fw * 0.6, fy, fx, fy + fw * 0.25);
  inner.close();
  canvas.drawPath(inner.snapshot(), paint('#fffbea'));
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

// Store / iOS icon: full bleed night with the diya.
await png('icon.png', 1024, (c, s) => {
  night(c, s);
  diya(c, s * 0.48, s * 0.66, s * 0.5);
});
// Android adaptive icon: the diya inside the 66% safe zone over a separate night layer.
await png('adaptive-foreground.png', 1024, (c, s) => diya(c, s * 0.48, s * 0.6, s * 0.34));
await png('adaptive-background.png', 1024, (c, s) => night(c, s));
// Android 13+ themed icon: a single-colour silhouette the system tints.
await png('adaptive-monochrome.png', 1024, (c, s) =>
  diya(c, s * 0.48, s * 0.6, s * 0.34, { mono: true }),
);
// Splash: the lit diya alone on the night colour.
await png('splash-icon.png', 1024, (c, s) => diya(c, s * 0.48, s * 0.62, s * 0.5, { beam: false }));
// Web favicon.
await png('favicon.png', 96, (c, s) => {
  night(c, s);
  diya(c, s * 0.46, s * 0.66, s * 0.56, { beam: false });
});
console.log('Wrote icons to assets/images/.');
