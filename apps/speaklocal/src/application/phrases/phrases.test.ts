import type { Phrase } from '@/domain/content/types';
import { SCENES } from '@/domain/content/scenes';
import { fold, pauseFor, phraseOfTheDay, readingTime, searchPhrases, syllables } from './phrases';

const p = (en: string, roman: string, native = 'ಎಲ್ಲಿ'): Phrase => ({
  key: `kn:x.${en}`,
  lang: 'kn',
  lineId: 'x',
  scene: 'auto',
  speaker: 'you',
  native,
  roman,
  en,
  hi: 'कहाँ?',
  extra: false,
});

const LIST = [
  p('Where do I have to go?', 'Ell-li hog-beku?'),
  p('Please go by the meter.', 'Meter haaki, anna.', 'ಮೀಟರ್ ಹಾಕಿ, ಅಣ್ಣ.'),
  p('Stop here, please.', 'Illi nilsi.', 'ಇಲ್ಲಿ ನಿಲ್ಸಿ.'),
];

describe('phrasebook search', () => {
  it('folds case, accents, hyphens and punctuation', () => {
    expect(fold('Ell-li  Hóg’beku?')).toBe('ellli hogbeku');
  });

  it('finds by English, by romanisation (forgiving doubled letters) and by script', () => {
    expect(searchPhrases(LIST, 'meter').map((x) => x.en)).toEqual(['Please go by the meter.']);
    expect(searchPhrases(LIST, 'elli')[0]!.en).toBe('Where do I have to go?');
    expect(searchPhrases(LIST, 'eli hogbek')[0]!.en).toBe('Where do I have to go?');
    expect(searchPhrases(LIST, 'ನಿಲ್ಸಿ').map((x) => x.en)).toEqual(['Stop here, please.']);
    expect(searchPhrases(LIST, 'please')).toHaveLength(2);
    expect(searchPhrases(LIST, 'banana')).toEqual([]);
    expect(searchPhrases(LIST, '   ')).toHaveLength(3);
  });

  it('ranks meanings that start with the query first', () => {
    expect(searchPhrases(LIST, 'stop')[0]!.en).toBe('Stop here, please.');
  });
});

describe('pacing', () => {
  it('counts rough syllables', () => {
    expect(syllables('Ell-li hog-beku?')).toBe(5);
    expect(syllables('Hm')).toBe(1);
  });

  it('gives longer lines more time, slow more than normal, and caps it', () => {
    const short = { roman: 'Haan.' };
    const long = { roman: 'Naale beligge ombattu gantege office nalli meeting ide.' };
    expect(pauseFor(long, true)).toBeGreaterThan(pauseFor(short, true));
    expect(pauseFor(long, true)).toBeGreaterThan(pauseFor(long, false));
    expect(pauseFor({ roman: 'a '.repeat(200) }, true)).toBe(9000);
    expect(readingTime(long)).toBeGreaterThan(readingTime(short));
  });
});

describe('phrase of the day', () => {
  const core = SCENES.filter((s) => s.pack === 'core').map((s) => s.id);

  it('is the same all day and comes from what you say', () => {
    const a = phraseOfTheDay('hi', core, new Date(2026, 9, 16, 8));
    const b = phraseOfTheDay('hi', core, new Date(2026, 9, 16, 9));
    expect(a).toEqual(b);
    expect(a).not.toBeNull();
    expect(a!.extra || a!.speaker === 'you').toBe(true);
  });

  it('changes from day to day across a week', () => {
    const week = Array.from(
      { length: 7 },
      (_, d) => phraseOfTheDay('bn', core, new Date(2026, 9, 10 + d, 12))?.key,
    );
    expect(new Set(week).size).toBeGreaterThan(3);
  });

  it('is none without scenes', () => {
    expect(phraseOfTheDay('kn', [], new Date())).toBeNull();
  });
});
