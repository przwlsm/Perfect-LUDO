import { LANGUAGE_CODES } from './languages';
import { en, NAMESPACES, resources } from './resources';

const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;

/** "a.b.c" -> value, for every string leaf. */
function flatten(tree: object, prefix = ''): Map<string, string> {
  const out = new Map<string, string>();
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') out.set(path, value);
    else if (value && typeof value === 'object') {
      for (const [k, v] of flatten(value, path)) out.set(k, v);
    } else throw new Error(`${path} is not a string or object`);
  }
  return out;
}

const placeholders = (text: string) => [...text.matchAll(/\{\{\s*(\w+)/g)].map((m) => m[1]).sort();
const base = (key: string) => key.replace(PLURAL_SUFFIX, '');

describe.each(LANGUAGE_CODES.filter((code) => code !== 'en'))('%s catalogue', (code) => {
  const categories = new Intl.PluralRules(code).resolvedOptions().pluralCategories;

  describe.each(NAMESPACES)('%s', (ns) => {
    const source = flatten(en[ns]);
    const target = flatten(resources[code][ns]);
    const sourceBases = new Set([...source.keys()].map(base));
    const targetBases = new Set([...target.keys()].map(base));

    it('has every English key and nothing extra', () => {
      expect([...sourceBases].filter((k) => !targetBases.has(k))).toEqual([]);
      expect([...targetBases].filter((k) => !sourceBases.has(k))).toEqual([]);
    });

    it('has every plural form this language needs', () => {
      const plurals = new Set([...source.keys()].filter((k) => PLURAL_SUFFIX.test(k)).map(base));
      const missing = [...plurals].flatMap((key) =>
        categories
          .filter((category) => category !== 'zero' || target.has(`${key}_zero`))
          .filter((category) => !target.has(`${key}_${category}`))
          .map((category) => `${key}_${category}`),
      );
      expect(missing).toEqual([]);
    });

    it('keeps every {{placeholder}} and leaves nothing empty', () => {
      const problems: string[] = [];
      for (const [key, text] of target) {
        if (!text.trim()) problems.push(`${key} is empty`);
        const english = source.get(key) ?? source.get(`${base(key)}_other`) ?? '';
        if (placeholders(text).join() !== placeholders(english).join()) {
          // A singular form may drop {{count}} ("one coin"), never anything else.
          const allowed = placeholders(english).filter((p) => p !== 'count');
          if (
            placeholders(text)
              .filter((p) => p !== 'count')
              .join() !== allowed.join()
          ) {
            problems.push(`${key}: ${placeholders(text)} vs ${placeholders(english)}`);
          }
        }
      }
      expect(problems).toEqual([]);
    });
  });
});

describe.each(LANGUAGE_CODES.filter((code) => code !== 'en'))('%s translation', (code) => {
  it('is actually translated, not left in English', () => {
    // Brand names, "XP" and the like may legitimately stay the same, but a
    // catalogue copied from English and never translated must not ship.
    let words = 0;
    let unchanged = 0;
    for (const ns of NAMESPACES) {
      const target = flatten(resources[code][ns]);
      for (const [key, english] of flatten(en[ns])) {
        if (!/[A-Za-z]{4,}/.test(english)) continue;
        words += 1;
        const text = target.get(key) ?? target.get(`${base(key)}_other`);
        if (text === english) unchanged += 1;
      }
    }
    expect(unchanged / words).toBeLessThan(0.15);
  });
});

describe('English catalogue', () => {
  it.each(NAMESPACES)('%s has no empty strings', (ns) => {
    const empty = [...flatten(en[ns])].filter(([, text]) => !text.trim()).map(([key]) => key);
    expect(empty).toEqual([]);
  });
});
