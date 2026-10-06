/**
 * The flag emoji for an ISO 3166-1 alpha-2 country code ("IN" -> 🇮🇳):
 * two regional-indicator letters. Null for anything that is not a code.
 */
export function countryFlag(code: string | null | undefined): string | null {
  if (!code || !/^[A-Za-z]{2}$/.test(code)) return null;
  return [...code.toUpperCase()]
    .map((letter) => String.fromCodePoint(0x1f1e6 + letter.charCodeAt(0) - 65))
    .join('');
}
