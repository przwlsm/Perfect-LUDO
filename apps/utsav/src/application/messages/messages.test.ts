import { LIMITS } from '@/domain/entities/Card';
import { CARD_LANGUAGES, LANGUAGE_INFO, type Script } from '@/domain/entities/Language';
import { OCCASION_IDS } from '@/domain/entities/Occasion';
import { defaultWords, MESSAGES, messagesFor, nextSuggestion, signOff } from '.';

const SCRIPT_RANGE: Record<Script, RegExp> = {
  latin: /[A-Za-z]/,
  devanagari: /[ऀ-ॿ]/,
  tamil: /[஀-௿]/,
  telugu: /[ఀ-౿]/,
  kannada: /[ಀ-೿]/,
  bengali: /[ঀ-৿]/,
  gujarati: /[઀-૿]/,
  arabic: /[؀-ۿ]/,
};

describe('message catalogue', () => {
  it.each(CARD_LANGUAGES)('%s has words for every occasion', (lang) => {
    const minMessages = lang === 'en' || lang === 'hi' ? 4 : 3;
    for (const occasion of OCCASION_IDS) {
      const set = messagesFor(occasion, lang);
      expect(set.headlines.length).toBeGreaterThanOrEqual(1);
      expect(set.messages.length).toBeGreaterThanOrEqual(minMessages);
    }
  });

  it.each(CARD_LANGUAGES)('%s lines are tidy, unique and fit the editor limits', (lang) => {
    for (const occasion of OCCASION_IDS) {
      const { headlines, messages } = messagesFor(occasion, lang);
      for (const h of headlines) {
        expect(h).toBe(h.trim());
        expect(h.length).toBeGreaterThan(1);
        expect(h.length).toBeLessThanOrEqual(LIMITS.headline);
      }
      for (const m of messages) {
        expect(m).toBe(m.trim());
        expect(m.length).toBeGreaterThan(8);
        expect(m.length).toBeLessThanOrEqual(LIMITS.message);
        expect(m).not.toMatch(/\s{2,}/);
      }
      expect(new Set(messages).size).toBe(messages.length);
      expect(new Set(headlines).size).toBe(headlines.length);
    }
  });

  it.each(CARD_LANGUAGES)('%s is written in its own script', (lang) => {
    const range = SCRIPT_RANGE[LANGUAGE_INFO[lang].script];
    for (const occasion of OCCASION_IDS) {
      const { headlines, messages } = messagesFor(occasion, lang);
      for (const line of [...headlines, ...messages]) expect(line).toMatch(range);
    }
  });

  it('every language has a sign-off with the name slot', () => {
    for (const lang of CARD_LANGUAGES) {
      expect(MESSAGES[lang].signOff).toContain('{name}');
      expect(signOff(lang, '  Priya ')).toContain('Priya');
      expect(signOff(lang, '   ')).toBe('');
    }
  });

  it('default words come from the suggestions and vary with the seed', () => {
    const a = defaultWords('diwali', 'en', 0);
    const b = defaultWords('diwali', 'en', 1);
    expect(MESSAGES.en.occasions.diwali.messages).toContain(a.message);
    expect(a.message).not.toBe(b.message);
    expect(a.headline).toBe('Happy Diwali');
    expect(defaultWords('diwali', 'en', -3).message).toBeTruthy();
  });

  it('next suggestion cycles and restarts from unknown text', () => {
    const list = ['a', 'b', 'c'];
    expect(nextSuggestion(list, 'a')).toBe('b');
    expect(nextSuggestion(list, 'c')).toBe('a');
    expect(nextSuggestion(list, 'my own words')).toBe('a');
    expect(nextSuggestion([], 'x')).toBe('x');
  });
});
