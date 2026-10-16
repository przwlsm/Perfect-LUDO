import { LANG_IDS, LANGUAGES } from './languages';
import { PACKS_BY_LANG } from './packs';
import { allLineTemplates, BONUS_PACKS, SCENES, scenesInPack } from './scenes';
import { endMark, entryProblems, strayNativeChars } from './validate';

describe('scene templates', () => {
  it('have unique ids', () => {
    const ids = allLineTemplates().map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(SCENES.map((s) => s.id)).size).toBe(SCENES.length);
  });

  it.each(SCENES.map((s) => [s.id, s] as const))('%s is a real short dialogue', (_, s) => {
    expect(s.lines.length).toBeGreaterThanOrEqual(4);
    expect(s.lines.length).toBeLessThanOrEqual(8);
    expect(s.lines.some((l) => l.speaker === 'you')).toBe(true);
    expect(s.lines.some((l) => l.speaker !== 'you')).toBe(true);
    expect(s.extras.length).toBeGreaterThanOrEqual(2);
    for (const l of [...s.lines, ...s.extras]) {
      expect(l.en.trim()).not.toBe('');
      expect(l.hi.trim()).not.toBe('');
      expect(strayNativeChars('hi', l.hi)).toEqual([]);
      expect(endMark(l.en)).not.toBe('');
      expect(endMark(l.hi)).not.toBe('');
    }
  });

  it('twelve core scenes, five bonus packs of two', () => {
    expect(scenesInPack('core')).toHaveLength(12);
    expect(BONUS_PACKS).toHaveLength(5);
    for (const p of BONUS_PACKS) expect(scenesInPack(p)).toHaveLength(2);
  });
});

describe.each(LANG_IDS.map((l) => [l] as const))('%s pack', (lang) => {
  const pack = PACKS_BY_LANG[lang];
  const templates = allLineTemplates();

  it('belongs to its language', () => {
    expect(pack.lang).toBe(lang);
    expect(LANGUAGES[lang].id).toBe(lang);
  });

  it('covers every line of every scene', () => {
    const missing = templates.filter((t) => !pack.lines[t.id]).map((t) => t.id);
    expect(missing).toEqual([]);
  });

  it('has no lines that no scene uses', () => {
    const known = new Set(templates.map((t) => t.id));
    expect(Object.keys(pack.lines).filter((id) => !known.has(id))).toEqual([]);
  });

  it('every line keeps the content rules (script, romanisation, punctuation)', () => {
    const problems = Object.entries(pack.lines).flatMap(([id, e]) => entryProblems(lang, id, e));
    expect(problems).toEqual([]);
  });

  it('no two different meanings share the same native text', () => {
    const seen = new Map<string, string>();
    const clashes: string[] = [];
    for (const t of templates) {
      const e = pack.lines[t.id];
      if (!e) continue;
      const meaning = e[2]?.en ?? t.en;
      const prior = seen.get(e[0]);
      if (prior !== undefined && prior !== meaning) clashes.push(`${t.id}: ${e[0]}`);
      seen.set(e[0], meaning);
    }
    expect(clashes).toEqual([]);
  });
});
