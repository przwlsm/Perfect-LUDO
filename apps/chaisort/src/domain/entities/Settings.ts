import { CUP_THEMES, type CupThemeId } from './CupTheme';
import type { Lesson } from './Level';

/** Evening (dark, string lights) or Morning (light, sun on terracotta); `system` follows the device. */
export type LightChoice = 'system' | 'evening' | 'morning';

export interface Settings {
  readonly sound: boolean;
  readonly haptics: boolean;
  readonly light: LightChoice;
  /** Calmer motion: no flying cups, steam or confetti. Follows the OS until changed. */
  readonly reduceMotion: boolean | null;
  /**
   * A symbol on every layer (star for masala, leaf for mint…). On by
   * default: in a sort puzzle colour is the whole rule, roughly one man in
   * twelve sees some colours alike, and the people who need a setting like
   * this are the least likely to go looking for it. The symbols are small
   * and read as spice motifs, so they cost everyone else nothing.
   */
  readonly symbols: boolean;
  /** The cups the counter uses. */
  readonly cups: CupThemeId;
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
  symbols: true,
  cups: 'kulhad',
  lessonsSeen: [],
  language: null,
  reviewAsked: false,
};

const LESSONS: readonly Lesson[] = [
  'pour',
  'match',
  'serve',
  'froth',
  'oneSpare',
  'lid',
  'tall',
  'spice',
];

export function parseSettings(raw: string | null): Settings {
  if (!raw) return DEFAULT_SETTINGS;
  try {
    const v = JSON.parse(raw) as Partial<Settings>;
    const bool = (x: unknown, d: boolean) => (typeof x === 'boolean' ? x : d);
    return {
      sound: bool(v.sound, DEFAULT_SETTINGS.sound),
      haptics: bool(v.haptics, DEFAULT_SETTINGS.haptics),
      light: v.light === 'evening' || v.light === 'morning' ? v.light : 'system',
      reduceMotion: typeof v.reduceMotion === 'boolean' ? v.reduceMotion : null,
      symbols: bool(v.symbols, DEFAULT_SETTINGS.symbols),
      cups: CUP_THEMES.find((f) => f.id === v.cups)?.id ?? 'kulhad',
      lessonsSeen: Array.isArray(v.lessonsSeen)
        ? v.lessonsSeen.filter((l): l is Lesson => LESSONS.includes(l as Lesson))
        : [],
      language: typeof v.language === 'string' ? v.language : null,
      reviewAsked: v.reviewAsked === true,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}
