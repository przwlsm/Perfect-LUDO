// Draws Akshar's app icon, Android adaptive icon layers, splash image and
// favicon with CanvasKit (the same Skia the app renders with): the letter
// अ in the Baloo 2 face the app teaches with, written in cream ink on an
// indigo slate, with the dotted tracing guide the app draws under letters.
// Run with `npm run icons`; writes PNGs to assets/images/.
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const CanvasKitInit = require('canvaskit-wasm/bin/full/canvaskit.js');
const ck = await CanvasKitInit();

const fontBytes = await fs.readFile(
  require.resolve('@expo-google-fonts/baloo-2/700Bold/Baloo2_700Bold.ttf'),
);
const typeface = ck.Typeface.MakeTypefaceFromData(fontBytes);
const out = new URL('../assets/images/', import.meta.url);
await fs.mkdir(out, { recursive: true });

const C = (hex, a = 1) => {
  const n = parseInt(hex.slice(1), 16);
  return ck.Color((n >> 16) & 255, (n >> 8) & 255, n & 255, a);
};

const INDIGO = ['#2d3487', '#1b1f55'];
const CREAM = '#fff6e6';
const SAFFRON = '#f2a93b';
const VERMILION = '#e2562e';

function background(canvas, size) {
  const paint = new ck.Paint();
  paint.setShader(
    ck.Shader.MakeLinearGradient(
      [0, 0],
      [size, size],
      [C(INDIGO[0]), C(INDIGO[1])],
      null,
      ck.TileMode.Clamp,
    ),
  );
  canvas.drawRect(ck.XYWHRect(0, 0, size, size), paint);
  // A soft warm glow behind the letter, like lamplight on a desk.
  const glow = new ck.Paint();
  glow.setAntiAlias(true);
  glow.setShader(
    ck.Shader.MakeRadialGradient(
      [size * 0.5, size * 0.46],
      size * 0.55,
      [C('#7d6bd6', 0.35), C('#7d6bd6', 0)],
      null,
      ck.TileMode.Clamp,
    ),
  );
  canvas.drawRect(ck.XYWHRect(0, 0, size, size), glow);
}

/** The letter, centred on (cx, cy) and `h` tall, with its dotted guide line beneath. */
function letter(canvas, cx, cy, h, { mono = false, ink = CREAM, guide = true } = {}) {
  const font = new ck.Font(typeface, 100);
  const ids = font.getGlyphIDs('अ');
  const b = font.getGlyphBounds(ids);
  const s = h / (b[3] - b[1]);
  font.setSize(100 * s);
  const w = (b[2] - b[0]) * s;
  const x = cx - w / 2 - b[0] * s;
  const y = cy - ((b[1] + b[3]) / 2) * s;

  if (guide) {
    // Dotted baseline guide, as on the app's writing paper.
    const dot = new ck.Paint();
    dot.setAntiAlias(true);
    dot.setColor(mono ? C('#000000') : C(SAFFRON, 0.95));
    const gy = cy + h * 0.6;
    const n = 7;
    for (let i = 0; i < n; i++) {
      const gx = cx - w * 0.5 + (w * i) / (n - 1);
      canvas.drawCircle(gx, gy, h * 0.035, dot);
    }
  }

  if (!mono) {
    // A faint shadow so the cream ink lifts off the slate.
    const shadow = new ck.Paint();
    shadow.setAntiAlias(true);
    shadow.setColor(C('#0b0d2e', 0.45));
    shadow.setMaskFilter(ck.MaskFilter.MakeBlur(ck.BlurStyle.Normal, h * 0.03, true));
    canvas.drawText('अ', x + h * 0.012, y + h * 0.03, shadow, font);
  }
  const paint = new ck.Paint();
  paint.setAntiAlias(true);
  paint.setColor(mono ? C('#000000') : C(ink));
  canvas.drawText('अ', x, y, paint, font);

  if (!mono && guide) {
    // A little vermilion nib-spark where the pen lifted.
    const spark = new ck.Paint();
    spark.setAntiAlias(true);
    spark.setColor(C(VERMILION));
    const px = cx + w * 0.56;
    const py = cy - h * 0.5;
    const r = h * 0.07;
    let d = '';
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 - Math.PI / 2;
      const rr = k % 2 === 0 ? r : r * 0.36;
      d += `${k === 0 ? 'M' : 'L'}${px + Math.cos(a) * rr} ${py + Math.sin(a) * rr}`;
    }
    const path = ck.Path.MakeFromSVGString(`${d}Z`);
    canvas.drawPath(path, spark);
    path.delete();
  }
}

async function png(name, size, draw) {
  const surface = ck.MakeSurface(size, size);
  const canvas = surface.getCanvas();
  canvas.clear(ck.TRANSPARENT);
  draw(canvas, size);
  surface.flush();
  const image = surface.makeImageSnapshot();
  await fs.writeFile(new URL(name, out), Buffer.from(image.encodeToBytes()));
  surface.delete();
}

// Store / iOS icon: full bleed.
await png('icon.png', 1024, (c, s) => {
  background(c, s);
  letter(c, s / 2, s * 0.47, s * 0.5);
});
// Android adaptive icon: the letter inside the 66% safe zone over a separate background layer.
await png('adaptive-foreground.png', 1024, (c, s) => letter(c, s / 2, s * 0.48, s * 0.34));
await png('adaptive-background.png', 1024, (c, s) => background(c, s));
// Android 13+ themed icon: a single-colour silhouette the system tints.
await png('adaptive-monochrome.png', 1024, (c, s) =>
  letter(c, s / 2, s * 0.48, s * 0.34, { mono: true }),
);
// Splash: indigo ink on the cream paper the app opens onto.
await png('splash-icon.png', 1024, (c, s) =>
  letter(c, s / 2, s * 0.47, s * 0.52, { ink: '#2d3487' }),
);
await png('splash-icon-dark.png', 1024, (c, s) =>
  letter(c, s / 2, s * 0.47, s * 0.52, { ink: CREAM }),
);
// Web favicon.
await png('favicon.png', 96, (c, s) => {
  background(c, s);
  letter(c, s / 2, s * 0.5, s * 0.6, { guide: false });
});
console.log('Wrote icons to assets/images/.');
