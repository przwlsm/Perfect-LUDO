/**
 * Every language the app ships. Adding one means: a row here, its catalogue
 * under `locales/<code>/` (with an index.ts), an entry in `resources.ts`, and
 * (for a new script) its fonts in `theme/typography.ts` and
 * `LanguageProvider.tsx`. See docs/I18N.md.
 */
export type Script =
  'latin' | 'devanagari' | 'bengali' | 'tamil' | 'telugu' | 'gujarati' | 'kannada' | 'arabic';

export interface Language {
  /** The language's own name, shown in the picker so speakers can find it. */
  readonly nativeName: string;
  readonly englishName: string;
  /** 'rtl' languages flip the whole layout and need a restart to apply. */
  readonly dir: 'ltr' | 'rtl';
  /** Decides which font family renders it. */
  readonly script: Script;
}

/** In picker order: English, then Indian languages, then the rest. */
export const LANGUAGES = {
  en: { nativeName: 'English', englishName: 'English', dir: 'ltr', script: 'latin' },
  hi: { nativeName: 'हिन्दी', englishName: 'Hindi', dir: 'ltr', script: 'devanagari' },
  bn: { nativeName: 'বাংলা', englishName: 'Bengali', dir: 'ltr', script: 'bengali' },
  mr: { nativeName: 'मराठी', englishName: 'Marathi', dir: 'ltr', script: 'devanagari' },
  te: { nativeName: 'తెలుగు', englishName: 'Telugu', dir: 'ltr', script: 'telugu' },
  ta: { nativeName: 'தமிழ்', englishName: 'Tamil', dir: 'ltr', script: 'tamil' },
  gu: { nativeName: 'ગુજરાતી', englishName: 'Gujarati', dir: 'ltr', script: 'gujarati' },
  kn: { nativeName: 'ಕನ್ನಡ', englishName: 'Kannada', dir: 'ltr', script: 'kannada' },
  es: { nativeName: 'Español', englishName: 'Spanish', dir: 'ltr', script: 'latin' },
  pt: { nativeName: 'Português', englishName: 'Portuguese', dir: 'ltr', script: 'latin' },
  ar: { nativeName: 'العربية', englishName: 'Arabic', dir: 'rtl', script: 'arabic' },
} as const satisfies Record<string, Language>;

export type LanguageCode = keyof typeof LANGUAGES;
/** What the player chose in Settings; 'system' follows the phone's language. */
export type LanguagePreference = LanguageCode | 'system';

export const DEFAULT_LANGUAGE: LanguageCode = 'en';
export const LANGUAGE_CODES = Object.keys(LANGUAGES) as LanguageCode[];

export function isRightToLeft(language: Language): boolean {
  return language.dir === 'rtl';
}

export function isLanguageCode(value: unknown): value is LanguageCode {
  return typeof value === 'string' && value in LANGUAGES;
}

/**
 * The first of the phone's preferred languages that the app supports, by
 * language code ("hi-IN" -> "hi"); English when none is.
 */
export function resolveLanguage(deviceLanguageCodes: readonly (string | null)[]): LanguageCode {
  for (const code of deviceLanguageCodes) {
    const base = code?.toLowerCase().split(/[-_]/)[0];
    if (isLanguageCode(base)) return base;
  }
  return DEFAULT_LANGUAGE;
}
