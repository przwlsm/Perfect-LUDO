import { allPhrases } from '@/domain/content/catalogue';
import { LANG_IDS, LANGUAGES } from '@/domain/content/languages';
import { allLineTemplates } from '@/domain/content/scenes';
import { readCmap } from './cmap';

// Node's file reading, typed locally so the app's tsconfig needs no Node types.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as { readFileSync(path: string): Uint8Array };
const resolve = (id: string) => (require as unknown as { resolve(id: string): string }).resolve(id);

/** The font files the app ships (Baloo 2 family SemiBold; Nunito for Latin). */
function cmapOf(family: string, weight = '600SemiBold') {
  const pkg = family
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/2$/, '-2')
    .toLowerCase();
  const file = resolve(`@expo-google-fonts/${pkg}/${weight}/${family}_${weight}.ttf`);
  return readCmap(new Uint8Array(fs.readFileSync(file)));
}

/** Characters that never need a glyph of their own (joiners shape, they do not draw). */
const INVISIBLE = new Set([0x200c, 0x200d]);

function missing(has: (cp: number) => number, texts: Iterable<string>): string[] {
  const out = new Set<string>();
  for (const text of texts) {
    for (const ch of text) {
      const cp = ch.codePointAt(0)!;
      if (ch === ' ' || INVISIBLE.has(cp)) continue;
      if (has(cp) === 0) out.add(`${ch} U+${cp.toString(16).toUpperCase()}`);
    }
  }
  return [...out];
}

describe('every phrase shows in its font (no tofu boxes)', () => {
  it.each(LANG_IDS.map((l) => [l] as const))('%s native text', (lang) => {
    const has = cmapOf(LANGUAGES[lang].font);
    const phrases = allPhrases(lang);
    expect(phrases.length).toBeGreaterThan(150);
    expect(
      missing(
        has,
        phrases.map((p) => p.native),
      ),
    ).toEqual([]);
    expect(missing(has, [LANGUAGES[lang].nativeName, LANGUAGES[lang].sample])).toEqual([]);
  });

  it('Hindi meanings show in Baloo 2', () => {
    const has = cmapOf('Baloo2');
    const hi = [
      ...allLineTemplates().map((t) => t.hi),
      ...LANG_IDS.flatMap((l) => allPhrases(l).map((p) => p.hi)),
    ];
    expect(missing(has, hi)).toEqual([]);
  });

  it.each(['500Medium', '700Bold', '800ExtraBold'])(
    'romanisations, meanings and notes show in Nunito %s',
    (weight) => {
      const has = cmapOf('Nunito', weight);
      const texts = LANG_IDS.flatMap((l) =>
        allPhrases(l).flatMap((p) => [p.roman, p.en, p.note ?? '']),
      );
      expect(missing(has, texts)).toEqual([]);
    },
  );
});
