/** Dawn is the dark light (rice flour on wet earth), Courtyard the light one. */
export type ThemeChoice = 'system' | 'dawn' | 'courtyard';

export interface Settings {
  readonly sound: boolean;
  readonly haptics: boolean;
  readonly theme: ThemeChoice;
  /** Calmer motion: no falling petals or idle shimmer. Follows the OS until changed. */
  readonly reduceMotion: boolean | null;
  /** Show the clock while solving (hidden by default: this is a calm game). */
  readonly timer: boolean;
  /** Numbers with too many lines (or too few sides left) turn red. */
  readonly showErrors: boolean;
  /** Sides of a number that already has its lines are shown crossed out. */
  readonly autoCross: boolean;
  /** The kolam theme (colours of the line, dots and flowers). */
  readonly look: string;
  /** One-line first-run hints already seen (by key). */
  readonly hintsSeen: readonly string[];
  /** Language override; null follows the device. */
  readonly language: string | null;
  /** The store's review card has been offered once; never again. */
  readonly reviewAsked: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  sound: true,
  haptics: true,
  theme: 'system',
  reduceMotion: null,
  timer: false,
  showErrors: true,
  autoCross: true,
  look: 'classic',
  hintsSeen: [],
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
      theme: v.theme === 'dawn' || v.theme === 'courtyard' ? v.theme : 'system',
      reduceMotion: typeof v.reduceMotion === 'boolean' ? v.reduceMotion : null,
      timer: bool(v.timer, DEFAULT_SETTINGS.timer),
      showErrors: bool(v.showErrors, DEFAULT_SETTINGS.showErrors),
      autoCross: bool(v.autoCross, DEFAULT_SETTINGS.autoCross),
      look: typeof v.look === 'string' ? v.look : DEFAULT_SETTINGS.look,
      hintsSeen: Array.isArray(v.hintsSeen)
        ? v.hintsSeen.filter((h): h is string => typeof h === 'string')
        : [],
      language: typeof v.language === 'string' ? v.language : null,
      reviewAsked: v.reviewAsked === true,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}
