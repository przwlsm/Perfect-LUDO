import { familyForWeight, scriptTextStyle } from './typography';

describe('scriptTextStyle', () => {
  it('only swaps the family for Latin', () => {
    expect(
      scriptTextStyle({ fontSize: 14, fontWeight: '800', letterSpacing: 1.4 }, 'latin'),
    ).toEqual({
      fontFamily: 'Outfit_800ExtraBold',
      fontWeight: 'normal',
    });
  });

  it('adjusts size and line height for Devanagari', () => {
    expect(
      scriptTextStyle({ fontSize: 20, lineHeight: 26, fontWeight: '700' }, 'devanagari'),
    ).toEqual({
      fontFamily: 'Baloo2_700Bold',
      fontWeight: 'normal',
      fontSize: 20 * 0.94,
      lineHeight: 26 * 0.94 * 1.22,
    });
  });

  it('drops tracking and enlarges small caps-style labels in scripts without case', () => {
    expect(
      scriptTextStyle({ fontSize: 11, fontWeight: '800', letterSpacing: 1.4 }, 'tamil'),
    ).toEqual({
      fontFamily: 'BalooThambi2_800ExtraBold',
      fontWeight: 'normal',
      letterSpacing: 0,
      fontSize: 11 * 1.12,
    });
  });

  it('maps black to the heaviest Baloo 2 cut', () => {
    expect(familyForWeight('900', 'devanagari')).toBe('Baloo2_800ExtraBold');
    expect(familyForWeight(undefined, 'latin')).toBe('Outfit_400Regular');
  });
});
