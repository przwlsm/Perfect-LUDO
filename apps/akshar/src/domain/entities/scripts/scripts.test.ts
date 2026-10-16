import { letterKey, lettersOf } from '../Script';
import { letterAt, SCRIPTS, scriptById } from './index';

const inBlock = (cp: number, [a, b]: readonly [number, number]) => cp >= a && cp <= b;
// Joiners and the Urdu/Arabic hamza-like apostrophes are fine inside words.
const ALLOWED_IN_WORDS = new Set([0x200c, 0x200d]);

describe('script data', () => {
  it('covers nine scripts', () => {
    expect(SCRIPTS.map((s) => s.id)).toEqual([
      'devanagari',
      'tamil',
      'kannada',
      'telugu',
      'bengali',
      'gujarati',
      'gurmukhi',
      'malayalam',
      'urdu',
    ]);
  });

  it.each(SCRIPTS.map((s) => [s.id, s] as const))('%s letters are well formed', (_, script) => {
    const letters = lettersOf(script);
    expect(letters.length).toBeGreaterThanOrEqual(30);
    const seen = new Set<string>();
    for (const l of letters) {
      // One code point, inside the script's own Unicode block.
      expect([...l.char]).toHaveLength(1);
      expect(inBlock(l.char.codePointAt(0)!, script.block)).toBe(true);
      expect(seen.has(l.char)).toBe(false);
      seen.add(l.char);
      // The example word is written in the same script and uses the letter.
      for (const ch of l.word) {
        const cp = ch.codePointAt(0)!;
        expect(inBlock(cp, script.block) || ALLOWED_IN_WORDS.has(cp)).toBe(true);
      }
      expect(l.word.includes(l.char)).toBe(true);
      expect(l.translit.trim()).not.toBe('');
      expect(l.wordTranslit.trim()).not.toBe('');
      expect(l.meaning).toMatch(/^[a-z][A-Za-z]*$/);
    }
  });

  it('Urdu never uses the Arabic look-alikes of ک ی ہ', () => {
    const urdu = scriptById('urdu');
    for (const l of lettersOf(urdu)) {
      for (const bad of ['ك', 'ي', 'ه', 'ى']) {
        expect(l.word.includes(bad)).toBe(false);
        expect(l.char).not.toBe(bad);
      }
      expect(l.sound).toBeDefined();
    }
    expect(urdu.rtl).toBe(true);
  });

  it('Bengali uses the precomposed ড় ঢ় য় letters', () => {
    const chars = lettersOf(scriptById('bengali')).map((l) => l.char.codePointAt(0));
    expect(chars).toEqual(expect.arrayContaining([0x09dc, 0x09dd, 0x09df]));
  });

  it('finds letters by index and builds keys', () => {
    expect(letterAt('tamil', 0)?.char).toBe('அ');
    expect(letterAt('tamil', 999)).toBeUndefined();
    expect(letterKey('kannada', 'ಕ')).toBe('kannada:ಕ');
  });

  it('every script has a speech language to try', () => {
    for (const s of SCRIPTS) expect(s.voices.length).toBeGreaterThan(0);
  });
});
