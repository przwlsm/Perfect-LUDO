/* eslint-disable import/no-named-as-default-member -- i18next's documented API is the default instance's methods. */
import 'intl-pluralrules';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import { en, type Resources } from './en';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: { translation: Resources };
  }
}

/** Languages with a full translation, in the order the Settings list shows them. */
export const LANGUAGES = [{ code: 'en', name: 'English' }] as const;

const RESOURCES: Record<string, { translation: Resources }> = {
  en: { translation: en },
};

export function deviceLanguage(): string {
  const code = getLocales()[0]?.languageCode ?? 'en';
  return code in RESOURCES ? code : 'en';
}

void i18n.use(initReactI18next).init({
  resources: RESOURCES,
  lng: deviceLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnNull: false,
});

export function setLanguage(code: string | null): void {
  const next = code && code in RESOURCES ? code : deviceLanguage();
  if (i18n.language !== next) void i18n.changeLanguage(next);
}

export type GlossaryKey = keyof Resources['glossary'];

export function isGlossaryKey(key: string): key is GlossaryKey {
  return key in en.glossary;
}

export default i18n;
