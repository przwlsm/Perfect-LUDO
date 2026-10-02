import { act } from '@testing-library/react-native';
import { i18n } from './index';
import { formatNumber } from './format';

describe('formatNumber', () => {
  afterEach(() => act(() => i18n.changeLanguage('en')));

  it.each([
    ['en', '1,234,567'],
    ['hi', '12,34,567'],
    ['bn', '12,34,567'],
    ['mr', '12,34,567'],
    ['ar', '1,234,567'],
    ['es', '1.234.567'],
  ])('keeps Latin digits in %s', async (language, expected) => {
    await act(() => i18n.changeLanguage(language));
    expect(formatNumber(1234567)).toBe(expected);
  });
});
