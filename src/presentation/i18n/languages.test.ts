import { resolveLanguage } from './languages';

describe('resolveLanguage', () => {
  it('picks the first supported language from the phone list', () => {
    expect(resolveLanguage(['fr', 'hi', 'en'])).toBe('hi');
    expect(resolveLanguage(['en-GB', 'hi'])).toBe('en');
  });

  it('matches by base language code', () => {
    expect(resolveLanguage(['hi-IN'])).toBe('hi');
    expect(resolveLanguage(['HI_in'])).toBe('hi');
  });

  it('falls back to English', () => {
    expect(resolveLanguage(['fr', 'de'])).toBe('en');
    expect(resolveLanguage([null])).toBe('en');
    expect(resolveLanguage([])).toBe('en');
  });
});
