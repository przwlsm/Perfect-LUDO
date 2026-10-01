import { i18n } from './index';

/**
 * The locale for numbers and dates: the current language's grouping and date
 * order (e.g. 12,34,567 in Indian languages), always with Latin digits. Bengali,
 * Marathi and Arabic would otherwise switch to their own digits, while dice,
 * timers and scores everywhere else show 0-9.
 */
export function numberLocale(): string {
  return `${i18n.language}-u-nu-latn`;
}

export function formatNumber(n: number): string {
  try {
    return n.toLocaleString(numberLocale());
  } catch {
    return n.toLocaleString('en');
  }
}

export function formatDate(date: Date): string {
  try {
    return date.toLocaleDateString(numberLocale());
  } catch {
    return date.toLocaleDateString('en');
  }
}
