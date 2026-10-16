import type { CityId, LangId } from './types';

/** The Baloo 2 family face that draws each language's script (SIL OFL 1.1). */
export type ScriptFont =
  'Baloo2' | 'BalooTamma2' | 'BalooThambi2' | 'BalooTammudu2' | 'BalooDa2' | 'BalooChettan2';

export interface Language {
  readonly id: LangId;
  /** BCP 47 tag the device's text-to-speech is asked for. */
  readonly speech: string;
  /** The language's own name, in its script. */
  readonly nativeName: string;
  readonly font: ScriptFont;
  /** The Unicode block its script lives in (inclusive). */
  readonly block: readonly [number, number];
  /** One letter that stands for the script on small badges. */
  readonly sample: string;
  /** True when the full stop is the danda (।) in native text. */
  readonly danda: boolean;
}

export const LANGUAGES: Readonly<Record<LangId, Language>> = {
  kn: {
    id: 'kn',
    speech: 'kn-IN',
    nativeName: 'ಕನ್ನಡ',
    font: 'BalooTamma2',
    block: [0x0c80, 0x0cff],
    sample: 'ಕ',
    danda: false,
  },
  ta: {
    id: 'ta',
    speech: 'ta-IN',
    nativeName: 'தமிழ்',
    font: 'BalooThambi2',
    block: [0x0b80, 0x0bff],
    sample: 'த',
    danda: false,
  },
  te: {
    id: 'te',
    speech: 'te-IN',
    nativeName: 'తెలుగు',
    font: 'BalooTammudu2',
    block: [0x0c00, 0x0c7f],
    sample: 'తె',
    danda: false,
  },
  mr: {
    id: 'mr',
    speech: 'mr-IN',
    nativeName: 'मराठी',
    font: 'Baloo2',
    block: [0x0900, 0x097f],
    sample: 'म',
    danda: false,
  },
  bn: {
    id: 'bn',
    speech: 'bn-IN',
    nativeName: 'বাংলা',
    font: 'BalooDa2',
    block: [0x0980, 0x09ff],
    sample: 'বা',
    danda: true,
  },
  ml: {
    id: 'ml',
    speech: 'ml-IN',
    nativeName: 'മലയാളം',
    font: 'BalooChettan2',
    block: [0x0d00, 0x0d7f],
    sample: 'മ',
    danda: false,
  },
  hi: {
    id: 'hi',
    speech: 'hi-IN',
    nativeName: 'हिन्दी',
    font: 'Baloo2',
    block: [0x0900, 0x097f],
    sample: 'हि',
    danda: true,
  },
};

export const LANG_IDS: readonly LangId[] = ['kn', 'ta', 'te', 'mr', 'bn', 'ml', 'hi'];

export function isLangId(v: unknown): v is LangId {
  return typeof v === 'string' && (LANG_IDS as readonly string[]).includes(v);
}

/** The skyline drawn behind a city: stylised shapes, never a logo. */
export type Skyline =
  'dome' | 'gopuram' | 'minarets' | 'fort' | 'gateway' | 'bridge' | 'boats' | 'arch';

export interface City {
  readonly id: CityId;
  readonly lang: LangId;
  readonly skyline: Skyline;
}

/** Cities in the order onboarding shows them. */
export const CITIES: readonly City[] = [
  { id: 'bengaluru', lang: 'kn', skyline: 'dome' },
  { id: 'chennai', lang: 'ta', skyline: 'gopuram' },
  { id: 'hyderabad', lang: 'te', skyline: 'minarets' },
  { id: 'pune', lang: 'mr', skyline: 'fort' },
  { id: 'mumbai', lang: 'mr', skyline: 'gateway' },
  { id: 'kolkata', lang: 'bn', skyline: 'bridge' },
  { id: 'kochi', lang: 'ml', skyline: 'boats' },
  { id: 'delhi', lang: 'hi', skyline: 'arch' },
];

export function cityById(id: CityId): City {
  return CITIES.find((c) => c.id === id) ?? CITIES[0]!;
}

export function isCityId(v: unknown): v is CityId {
  return typeof v === 'string' && CITIES.some((c) => c.id === v);
}
