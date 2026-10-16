// Draws the app icon, Android adaptive icon layers and splash image with
// CanvasKit (the same Skia the app renders with), from the globe's own land
// dots, so the brand matches the home screen exactly.
// Run with `npm run icons`; writes PNGs to assets/images/.
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const CanvasKitInit = require('canvaskit-wasm/bin/full/canvaskit.js');
const ck = await CanvasKitInit();

const source = await fs.readFile(new URL('../src/presentation/globe/landDots.ts', import.meta.url), 'utf8');
const body = source.slice(source.indexOf('= [') + 2);
const LAND = body
  .slice(1, body.lastIndexOf(']'))
  .split(',')
  .map((v) => v.trim())
  .filter(Boolean)
  .map(Number);
const out = new URL('../assets/images/', import.meta.url);
await fs.mkdir(out, { recursive: true });

const RAD = Math.PI / 180;
const C = (hex, a = 1) => {
  const n = parseInt(hex.slice(1), 16);
  return ck.Color((n >> 16) & 255, (n >> 8) & 255, n & 255, a);
};

/** Sky background (dusk gradient with a few stars). */
function sky(canvas, size) {
  const paint = new ck.Paint();
  paint.setShader(
    ck.Shader.MakeLinearGradient([0, 0], [size * 0.3, size], [C('#0b0d20'), C('#231b4b'), C('#4a2b5f')], null, ck.TileMode.Clamp),
  );
  canvas.drawRect(ck.XYWHRect(0, 0, size, size), paint);
  const star = new ck.Paint();
  star.setAntiAlias(true);
  const stars = [[0.14, 0.16, 0.006], [0.82, 0.12, 0.005], [0.9, 0.36, 0.004], [0.1, 0.72, 0.004], [0.78, 0.86, 0.006], [0.3, 0.08, 0.003]];
  for (const [x, y, r] of stars) {
    star.setColor(C('#fff6dc', 0.85));
    canvas.drawCircle(x * size, y * size, r * size, star);
  }
}

/** The globe: glow, sea, land dots, shading, rim, and the saffron pins. */
function globe(canvas, cx, cy, R, { pins = true, mono = false } = {}) {
  const glow = new ck.Paint();
  glow.setAntiAlias(true);
  if (!mono) {
    glow.setShader(
      ck.Shader.MakeRadialGradient([cx, cy], R * 1.25, [C('#78aaff', 0.45), C('#78aaff', 0.35), C('#78aaff', 0)], [0, 0.75, 1], ck.TileMode.Clamp),
    );
    canvas.drawCircle(cx, cy, R * 1.25, glow);
  }
  const sea = new ck.Paint();
  sea.setAntiAlias(true);
  if (mono) sea.setColor(C('#ffffff'));
  else
    sea.setShader(
      ck.Shader.MakeRadialGradient([cx - R * 0.38, cy - R * 0.42], R * 1.6, [C('#2a5aa0'), C('#0b1636')], null, ck.TileMode.Clamp),
    );
  canvas.drawCircle(cx, cy, R, sea);

  // Centre on the Indian Ocean side: India, Africa, Europe and Asia in view.
  const lon0 = 40 * RAD;
  const tilt = 0.32;
  const dot = new ck.Paint();
  dot.setAntiAlias(true);
  for (let i = 0; i < LAND.length; i += 2) {
    const lat = LAND[i] * RAD;
    const d = LAND[i + 1] * RAD - lon0;
    const x = Math.cos(lat) * Math.sin(d);
    const y = Math.cos(tilt) * Math.sin(lat) - Math.sin(tilt) * Math.cos(lat) * Math.cos(d);
    const depth = Math.sin(tilt) * Math.sin(lat) + Math.cos(tilt) * Math.cos(lat) * Math.cos(d);
    if (depth <= 0.05) continue;
    dot.setColor(mono ? C('#000000', 1) : C('#ffd89a', 0.3 + 0.7 * depth));
    canvas.drawCircle(cx + x * R, cy - y * R, R * (0.012 + 0.016 * depth), dot);
  }

  if (!mono) {
    const shade = new ck.Paint();
    shade.setAntiAlias(true);
    shade.setShader(
      ck.Shader.MakeRadialGradient([cx - R * 0.38, cy - R * 0.42], R * 2, [C('#000000', 0), C('#000000', 0), C('#030414', 0.55)], [0, 0.45, 1], ck.TileMode.Clamp),
    );
    canvas.drawCircle(cx, cy, R, shade);
    const rim = new ck.Paint();
    rim.setAntiAlias(true);
    rim.setStyle(ck.PaintStyle.Stroke);
    rim.setStrokeWidth(R * 0.012);
    rim.setColor(C('#9cc2ff', 0.7));
    canvas.drawCircle(cx, cy, R, rim);
  }

  if (pins) {
    // Lights over India and Türkiye, the way they glow on the home screen.
    for (const [lat, lon, hue] of [[21, 78, '#ff8a3d'], [41, 29, '#4f8dff'], [27.7, 85.3, '#e5b25d']]) {
      const la = lat * RAD;
      const d = lon * RAD - lon0;
      const x = cx + Math.cos(la) * Math.sin(d) * R;
      const y = cy - (Math.cos(tilt) * Math.sin(la) - Math.sin(tilt) * Math.cos(la) * Math.cos(d)) * R;
      const halo = new ck.Paint();
      halo.setAntiAlias(true);
      halo.setColor(mono ? C('#000000') : C(hue, 0.55));
      if (!mono) halo.setMaskFilter(ck.MaskFilter.MakeBlur(ck.BlurStyle.Normal, R * 0.05, true));
      canvas.drawCircle(x, y, R * 0.085, halo);
      const core = new ck.Paint();
      core.setAntiAlias(true);
      core.setColor(mono ? C('#000000') : C('#fff3d6'));
      canvas.drawCircle(x, y, R * 0.04, core);
    }
  }
}

async function png(name, size, draw) {
  const surface = ck.MakeSurface(size, size);
  const canvas = surface.getCanvas();
  canvas.clear(ck.TRANSPARENT);
  draw(canvas, size);
  surface.flush();
  const image = surface.makeImageSnapshot();
  const bytes = image.encodeToBytes();
  await fs.writeFile(new URL(name, out), Buffer.from(bytes));
  surface.delete();
}

// Store icon / iOS icon: full bleed sky with the globe.
await png('icon.png', 1024, (c, s) => {
  sky(c, s);
  globe(c, s / 2, s / 2, s * 0.34);
});
// Android adaptive icon: the globe in the 66% safe zone over a separate sky layer.
await png('adaptive-foreground.png', 1024, (c, s) => globe(c, s / 2, s / 2, s * 0.24));
await png('adaptive-background.png', 1024, (c, s) => sky(c, s));
// Android 13+ themed icon: a single-colour silhouette the system tints.
await png('adaptive-monochrome.png', 1024, (c, s) => globe(c, s / 2, s / 2, s * 0.24, { mono: true }));
// Splash: the globe alone; the splash background colour is the night sky.
await png('splash-icon.png', 1024, (c, s) => globe(c, s / 2, s / 2, s * 0.4));
// Web favicon.
await png('favicon.png', 96, (c, s) => {
  sky(c, s);
  globe(c, s / 2, s / 2, s * 0.36, { pins: false });
});
console.log('Wrote icons to assets/images/.');
