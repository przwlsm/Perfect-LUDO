import { lettersOf } from '@/domain/entities/Script';
import { SCRIPTS } from '@/domain/entities/scripts';
import { en } from './en';

describe('English strings', () => {
  it('every example word has an English meaning', () => {
    for (const s of SCRIPTS) {
      for (const l of lettersOf(s)) {
        expect(en.glossary).toHaveProperty(l.meaning);
      }
    }
  });

  it('no glossary entry is unused', () => {
    const used = new Set(SCRIPTS.flatMap((s) => lettersOf(s).map((l) => l.meaning)));
    for (const key of Object.keys(en.glossary)) expect(used.has(key)).toBe(true);
  });

  it('keys never contain dots (the path separator)', () => {
    const walk = (o: object) => {
      for (const [k, v] of Object.entries(o)) {
        expect(k.includes('.')).toBe(false);
        if (v && typeof v === 'object') walk(v);
      }
    };
    walk(en);
  });

  it('names every script', () => {
    for (const s of SCRIPTS) {
      expect(en.scripts[s.id].name).toBeTruthy();
      expect(en.speechLanguage[s.id]).toBeTruthy();
    }
  });
});
