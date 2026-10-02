// Hermes may lack Intl.PluralRules, which i18next needs for "1 coin / 5 coins";
// this installs it only where missing.
import 'intl-pluralrules';
import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import { DEFAULT_LANGUAGE, LANGUAGES, resolveLanguage, type LanguageCode } from './languages';
import { NAMESPACES, resources } from './resources';

/** The phone's own preferred, supported language. */
export function deviceLanguage(): LanguageCode {
  try {
    return resolveLanguage(getLocales().map((locale) => locale.languageCode));
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

/** The app's one translator; react-i18next hooks use it via initReactI18next. */
const i18n = createInstance();

// Synchronous: the first frame is already in the right language. A saved
// choice from Settings is applied right after by LanguageProvider.
void i18n.use(initReactI18next).init({
  resources,
  lng: deviceLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  supportedLngs: Object.keys(LANGUAGES),
  ns: NAMESPACES,
  defaultNS: 'common',
  // React already escapes; double escaping would show "&amp;".
  interpolation: { escapeValue: false },
  returnNull: false,
  initAsync: false,
});

export function currentLanguage(): LanguageCode {
  const code = i18n.resolvedLanguage ?? i18n.language;
  return code in LANGUAGES ? (code as LanguageCode) : DEFAULT_LANGUAGE;
}

export { i18n };
