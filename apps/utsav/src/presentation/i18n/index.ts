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

/**
 * The app's own words are English for now (the cards themselves speak nine
 * languages). New UI languages are added here as full translations.
 */
const RESOURCES: Record<string, { translation: Resources }> = {
  en: { translation: en },
};

/** The device's language code ("hi", "ta", "en"…), used to pick a card language. */
export function deviceLanguage(): string {
  return getLocales()[0]?.languageCode ?? 'en';
}

void i18n.use(initReactI18next).init({
  resources: RESOURCES,
  lng: deviceLanguage() in RESOURCES ? deviceLanguage() : 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;
