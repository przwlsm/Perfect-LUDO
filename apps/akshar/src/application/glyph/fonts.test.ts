import { lettersOf } from '@/domain/entities/Script';
import { SCRIPTS } from '@/domain/entities/scripts';
import { scoreAttempt } from '../tracing/score';
import { analyseGlyph } from './centreline';
import { boundsOf, fitToBox, flatten, makeContains, transformCmds } from './path';
import { readTrueType, type TrueTypeFont } from './ttf';

// Node's file reading, typed locally so the app's tsconfig needs no Node types.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as { readFileSync(path: string): Uint8Array };
const resolve = (id: string) => (require as unknown as { resolve(id: string): string }).resolve(id);

/** The real font files the app ships (Baloo 2 family, SemiBold). */
function fontFor(family: string): TrueTypeFont {
  const pkg = family
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/2$/, '-2')
    .toLowerCase();
  const file = resolve(`@expo-google-fonts/${pkg}/600SemiBold/${family}_600SemiBold.ttf`);
  return readTrueType(new Uint8Array(fs.readFileSync(file)));
}

const fonts = new Map(SCRIPTS.map((s) => [s.id, fontFor(s.font)]));

describe('every letter is in its font (no tofu boxes)', () => {
  it.each(SCRIPTS.map((s) => [s.id, s] as const))('%s', (id, script) => {
    const font = fonts.get(id)!;
    for (const l of lettersOf(script)) {
      const gid = font.glyphId(l.char.codePointAt(0)!);
      if (gid === 0) throw new Error(`${id} font has no glyph for ${l.char} (${l.translit})`);
      const polys = flatten(font.outline(l.char, 200, 0, 200));
      expect(polys.length).toBeGreaterThan(0);
      const b = boundsOf(polys);
      expect(b.width).toBeGreaterThan(5);
    }
  });
});

describe('romanisations show in the interface font', () => {
  it.each(['Nunito_800ExtraBold', 'Nunito_700Bold', 'Nunito_500Medium'])(
    '%s has every character',
    (face) => {
      const weight = face.split('_')[1]!;
      const file = resolve(`@expo-google-fonts/nunito/${weight}/${face}.ttf`);
      const nunito = readTrueType(new Uint8Array(fs.readFileSync(file)));
      const missing = new Set<string>();
      for (const s of SCRIPTS) {
        for (const l of lettersOf(s)) {
          for (const c of l.translit + l.wordTranslit + (l.sound ?? '') + s.praise[1]) {
            if (nunito.glyphId(c.codePointAt(0)!) === 0) missing.add(c);
          }
        }
      }
      expect([...missing]).toEqual([]);
    },
  );
});

/** A real letter fitted into a 300 px writing box, as the trace screen does. */
function boxed(font: TrueTypeFont, char: string) {
  const raw = font.outline(char, 1000, 0, 1000);
  const fit = fitToBox(boundsOf(flatten(raw)), 300);
  const polys = flatten(transformCmds(raw, fit.scale, fit.dx, fit.dy));
  const contains = makeContains(polys);
  const bounds = boundsOf(polys);
  const shape = analyseGlyph(contains, { x: 0, y: 0, width: 300, height: 300 }, 4);
  return { contains, bounds, shape };
}

describe('tracing real letters', () => {
  const cases: [string, string][] = [
    ['devanagari', 'क'],
    ['kannada', 'ಅ'],
    ['tamil', 'ழ'],
    ['urdu', 'ج'],
  ];

  it.each(cases)('following the dotted guide of %s %s earns two stars', (id, char) => {
    const { contains, bounds, shape } = boxed(fonts.get(id as never)!, char);
    expect(shape.dots.length).toBeGreaterThan(5);
    // Every guide dot sits on the letter.
    for (const d of shape.dots) expect(contains(d.x, d.y)).toBe(true);
    const strokes = shape.dots.map((d) => [d, { x: d.x + 1, y: d.y + 1 }]);
    const a = scoreAttempt({
      mode: 'trace',
      contains,
      glyphBounds: bounds,
      targets: shape.inside,
      halfWidth: shape.halfWidth,
      penRadius: 7,
      strokes,
    });
    expect(a.coverage).toBeGreaterThan(0.9);
    expect(a.accuracy).toBeGreaterThan(0.95);
    expect(a.stars).toBe(2);
  });

  it('a scribble beside the letter earns nothing', () => {
    const { contains, bounds, shape } = boxed(fonts.get('kannada')!, 'ಕ');
    const strokes = [
      Array.from({ length: 30 }, (_, i) => ({ x: 5 + i, y: 5 + (i % 3) })),
      Array.from({ length: 30 }, (_, i) => ({ x: 290 - i, y: 295 })),
    ];
    const a = scoreAttempt({
      mode: 'trace',
      contains,
      glyphBounds: bounds,
      targets: shape.inside,
      halfWidth: shape.halfWidth,
      penRadius: 7,
      strokes,
    });
    expect(a.stars).toBe(0);
    expect(a.missed.length).toBeGreaterThan(shape.inside.length * 0.8);
  });

  it('writing from memory, smaller and off to one side, still earns the third star', () => {
    const { contains, bounds, shape } = boxed(fonts.get('devanagari')!, 'ग');
    // The same shape at 60% size in the top-left corner.
    const cx = bounds.x + bounds.width / 2;
    const cy = bounds.y + bounds.height / 2;
    const strokes = shape.dots.map((d) => {
      const p = { x: 70 + (d.x - cx) * 0.6, y: 80 + (d.y - cy) * 0.6 };
      return [p, { x: p.x + 0.6, y: p.y + 0.6 }];
    });
    const a = scoreAttempt({
      mode: 'memory',
      contains,
      glyphBounds: bounds,
      targets: shape.inside,
      halfWidth: shape.halfWidth,
      penRadius: 7,
      strokes,
    });
    expect(a.stars).toBe(3);
  });
});
