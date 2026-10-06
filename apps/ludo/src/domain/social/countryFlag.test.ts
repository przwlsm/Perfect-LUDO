import { countryFlag } from './countryFlag';

describe('countryFlag', () => {
  it('turns a country code into its flag', () => {
    expect(countryFlag('IN')).toBe('🇮🇳');
    expect(countryFlag('br')).toBe('🇧🇷');
  });

  it.each([null, undefined, '', 'I', 'IND', '1N'])('gives nothing for %p', (code) => {
    expect(countryFlag(code)).toBeNull();
  });
});
