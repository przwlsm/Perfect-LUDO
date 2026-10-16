import { isCityId, isLangId } from '../content/languages';
import type { CityId, LangId } from '../content/types';
import { BUBBLE_IDS, type BubbleId } from './Bubbles';

/** Day is the light look, Dusk the dark one; System follows the device. */
export type ThemeChoice = 'system' | 'day' | 'dusk';
/** Slow is the default: new sounds are easier to catch slowly. */
export type Speed = 'slow' | 'normal';

export interface Settings {
  readonly city: CityId | null;
  /** Show a Hindi meaning line under the English one. */
  readonly hindiMeanings: boolean;
  readonly speed: Speed;
  /** Chosen voice per language (a device voice identifier); missing = our pick. */
  readonly voices: Readonly<Partial<Record<LangId, string>>>;
  readonly sound: boolean;
  readonly haptics: boolean;
  readonly theme: ThemeChoice;
  /** Calmer motion; null follows the OS until changed. */
  readonly reduceMotion: boolean | null;
  readonly bubbles: BubbleId;
  readonly onboarded: boolean;
  /** One-line first-time hints already shown. */
  readonly tipsSeen: readonly string[];
  readonly reviewAsked: boolean;
  /** App language override; null follows the device. */
  readonly language: string | null;
}

export const DEFAULT_SETTINGS: Settings = {
  city: null,
  hindiMeanings: false,
  speed: 'slow',
  voices: {},
  sound: true,
  haptics: true,
  theme: 'system',
  reduceMotion: null,
  bubbles: 'classic',
  onboarded: false,
  tipsSeen: [],
  reviewAsked: false,
  language: null,
};

/** Speech rate for each speed (1 is the voice's natural pace). */
export const RATES: Readonly<Record<Speed, number>> = { slow: 0.7, normal: 1 };

const oneOf = <T extends string>(v: unknown, options: readonly T[], fallback: T): T =>
  typeof v === 'string' && (options as readonly string[]).includes(v) ? (v as T) : fallback;

export function parseSettings(raw: string | null): Settings {
  if (!raw) return DEFAULT_SETTINGS;
  try {
    const v = JSON.parse(raw) as Partial<Record<keyof Settings, unknown>>;
    const d = DEFAULT_SETTINGS;
    const voices: Partial<Record<LangId, string>> = {};
    if (v.voices && typeof v.voices === 'object') {
      for (const [lang, id] of Object.entries(v.voices as Record<string, unknown>)) {
        if (isLangId(lang) && typeof id === 'string' && id) voices[lang] = id;
      }
    }
    const city = isCityId(v.city) ? v.city : null;
    return {
      city,
      hindiMeanings: v.hindiMeanings === true,
      speed: oneOf(v.speed, ['slow', 'normal'] as const, d.speed),
      voices,
      sound: typeof v.sound === 'boolean' ? v.sound : d.sound,
      haptics: typeof v.haptics === 'boolean' ? v.haptics : d.haptics,
      theme: oneOf(v.theme, ['system', 'day', 'dusk'] as const, d.theme),
      reduceMotion: typeof v.reduceMotion === 'boolean' ? v.reduceMotion : null,
      bubbles: oneOf(v.bubbles, BUBBLE_IDS, d.bubbles),
      onboarded: v.onboarded === true && city !== null,
      tipsSeen: Array.isArray(v.tipsSeen)
        ? v.tipsSeen.filter((x): x is string => typeof x === 'string')
        : [],
      reviewAsked: v.reviewAsked === true,
      language: typeof v.language === 'string' ? v.language : null,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}
