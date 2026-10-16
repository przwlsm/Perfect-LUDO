import type { Lesson } from './Board';
import { FESTIVALS, type FestivalId } from './Festival';

/** Night (dark) or Dusk (light); `system` follows the device. */
export type LightChoice = 'system' | 'night' | 'dusk';

export interface Settings {
  readonly sound: boolean;
  readonly haptics: boolean;
  readonly light: LightChoice;
  /** Calmer motion: no drifting sparks, no fireworks. Follows the OS until changed. */
  readonly reduceMotion: boolean | null;
  /** Show a timer while playing. Off by default: Diya is relaxed unless asked otherwise. */
  readonly timer: boolean;
  /** Symbols on coloured light and lamps, so colour is never the only clue. */
  readonly colourAid: boolean;
  /** The festival skin the board wears. */
  readonly festival: FestivalId;
  /** One-line lessons already shown. */
  readonly lessonsSeen: readonly Lesson[];
  /** Language override; null follows the device. */
  readonly language: string | null;
  /** The store's review card has been offered once; never again. */
  readonly reviewAsked: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  sound: true,
  haptics: true,
  light: 'system',
  reduceMotion: null,
  timer: false,
  colourAid: false,
  festival: 'diwali',
  lessonsSeen: [],
  language: null,
  reviewAsked: false,
};

export function parseSettings(raw: string | null): Settings {
  if (!raw) return DEFAULT_SETTINGS;
  try {
    const v = JSON.parse(raw) as Partial<Settings>;
    const bool = (x: unknown, d: boolean) => (typeof x === 'boolean' ? x : d);
    return {
      sound: bool(v.sound, DEFAULT_SETTINGS.sound),
      haptics: bool(v.haptics, DEFAULT_SETTINGS.haptics),
      light: v.light === 'night' || v.light === 'dusk' ? v.light : 'system',
      reduceMotion: typeof v.reduceMotion === 'boolean' ? v.reduceMotion : null,
      timer: bool(v.timer, DEFAULT_SETTINGS.timer),
      colourAid: bool(v.colourAid, DEFAULT_SETTINGS.colourAid),
      festival: FESTIVALS.find((f) => f.id === v.festival)?.id ?? 'diwali',
      lessonsSeen: Array.isArray(v.lessonsSeen) ? v.lessonsSeen : [],
      language: typeof v.language === 'string' ? v.language : null,
      reviewAsked: v.reviewAsked === true,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}
