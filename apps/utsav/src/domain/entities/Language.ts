/**
 * Languages a card's words can be written in. The app's own buttons and
 * labels are English; the card itself speaks the sender's language.
 */
export const CARD_LANGUAGES = ['en', 'hi', 'mr', 'ta', 'te', 'kn', 'bn', 'gu', 'ur'] as const;
export type CardLanguage = (typeof CARD_LANGUAGES)[number];

/** The writing system decides which fonts can draw the words. */
export type Script =
  'latin' | 'devanagari' | 'tamil' | 'telugu' | 'kannada' | 'bengali' | 'gujarati' | 'arabic';

export interface LanguageInfo {
  readonly code: CardLanguage;
  /** The language's name in its own script, as the picker shows it. */
  readonly nativeName: string;
  readonly englishName: string;
  readonly script: Script;
  readonly rtl: boolean;
}

export const LANGUAGE_INFO: Readonly<Record<CardLanguage, LanguageInfo>> = {
  en: { code: 'en', nativeName: 'English', englishName: 'English', script: 'latin', rtl: false },
  hi: { code: 'hi', nativeName: 'हिन्दी', englishName: 'Hindi', script: 'devanagari', rtl: false },
  mr: { code: 'mr', nativeName: 'मराठी', englishName: 'Marathi', script: 'devanagari', rtl: false },
  ta: { code: 'ta', nativeName: 'தமிழ்', englishName: 'Tamil', script: 'tamil', rtl: false },
  te: { code: 'te', nativeName: 'తెలుగు', englishName: 'Telugu', script: 'telugu', rtl: false },
  kn: { code: 'kn', nativeName: 'ಕನ್ನಡ', englishName: 'Kannada', script: 'kannada', rtl: false },
  bn: { code: 'bn', nativeName: 'বাংলা', englishName: 'Bengali', script: 'bengali', rtl: false },
  gu: {
    code: 'gu',
    nativeName: 'ગુજરાતી',
    englishName: 'Gujarati',
    script: 'gujarati',
    rtl: false,
  },
  ur: { code: 'ur', nativeName: 'اردو', englishName: 'Urdu', script: 'arabic', rtl: true },
};

export function isCardLanguage(code: unknown): code is CardLanguage {
  return typeof code === 'string' && (CARD_LANGUAGES as readonly string[]).includes(code);
}

/** The card language to start with for a device language code ("hi", "ta"…); English otherwise. */
export function cardLanguageFor(deviceCode: string | null | undefined): CardLanguage {
  const code = (deviceCode ?? '').toLowerCase().split(/[-_]/)[0];
  return isCardLanguage(code) ? code : 'en';
}
