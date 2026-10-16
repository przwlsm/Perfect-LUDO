import { LESSON_ORDER, type Lesson } from './Board';
import { THEMES, type ThemeId } from './Theme';

/** Stormy dusk (dark) or monsoon morning (light); `system` follows the device. */
export type LightChoice = 'system' | 'dusk' | 'morning';

export interface Settings {
  readonly sound: boolean;
  readonly haptics: boolean;
  /** A soft frog croak now and then when a pond fills. */
  readonly frogs: boolean;
  readonly light: LightChoice;
  /** Calmer motion: no idle rain, a simpler win. Follows the OS until changed. */
  readonly reduceMotion: boolean | null;
  /** Patterns on the two waters (dots for rain, petals for the temple tank), so colour is never the only clue. */
  readonly colourAid: boolean;
  readonly theme: ThemeId;
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
  frogs: true,
  light: 'system',
  reduceMotion: null,
  colourAid: false,
  theme: 'terraces',
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
      frogs: bool(v.frogs, DEFAULT_SETTINGS.frogs),
      light: v.light === 'dusk' || v.light === 'morning' ? v.light : 'system',
      reduceMotion: typeof v.reduceMotion === 'boolean' ? v.reduceMotion : null,
      colourAid: bool(v.colourAid, DEFAULT_SETTINGS.colourAid),
      theme: THEMES.find((t) => t.id === v.theme)?.id ?? 'terraces',
      lessonsSeen: Array.isArray(v.lessonsSeen)
        ? v.lessonsSeen.filter((l): l is Lesson => LESSON_ORDER.includes(l as Lesson))
        : [],
      language: typeof v.language === 'string' ? v.language : null,
      reviewAsked: v.reviewAsked === true,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}
