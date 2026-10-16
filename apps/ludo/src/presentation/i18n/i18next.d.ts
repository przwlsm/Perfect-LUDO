import 'i18next';
import type { en } from './resources';

// Keys are checked at compile time against the English catalogue, so a typo
// or a removed key is a type error, not a blank label on someone's phone.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: typeof en;
    returnNull: false;
  }
}
