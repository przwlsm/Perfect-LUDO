/**
 * Every catalogue, by language and namespace. English is the source of truth:
 * its keys define the types (see i18next.d.ts), and the parity test checks
 * every other language has exactly the same keys and placeholders.
 */
import ar from './locales/ar';
import bn from './locales/bn';
import en from './locales/en';
import es from './locales/es';
import gu from './locales/gu';
import hi from './locales/hi';
import kn from './locales/kn';
import mr from './locales/mr';
import pt from './locales/pt';
import ta from './locales/ta';
import te from './locales/te';
import type { LanguageCode } from './languages';

export { en };

export type Namespace = keyof typeof en;
export const NAMESPACES = Object.keys(en) as Namespace[];

export const resources: Record<LanguageCode, Record<Namespace, object>> = {
  en,
  hi,
  bn,
  mr,
  te,
  ta,
  gu,
  kn,
  es,
  pt,
  ar,
};
