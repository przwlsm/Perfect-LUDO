import type { ToyId } from './Toy';

export type ThemeChoice = 'system' | 'dawn' | 'dusk';

export interface Settings {
  readonly sound: boolean;
  readonly haptics: boolean;
  readonly theme: ThemeChoice;
  /** Calmer motion: no globe spin, no drifting particles. Follows the OS until changed. */
  readonly reduceMotion: boolean | null;
  /** The look each toy was last played with. */
  readonly looks: Readonly<Partial<Record<ToyId, string>>>;
  /** Toys whose one-line "how to play" hint has been seen. */
  readonly hintsSeen: readonly ToyId[];
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
  looks: {},
  hintsSeen: [],
  language: null,
  reviewAsked: false,
};

export function parseSettings(raw: string | null): Settings {
  if (!raw) return DEFAULT_SETTINGS;
  try {
    const v = JSON.parse(raw) as Partial<Settings>;
    return {
      sound: typeof v.sound === 'boolean' ? v.sound : DEFAULT_SETTINGS.sound,
      haptics: typeof v.haptics === 'boolean' ? v.haptics : DEFAULT_SETTINGS.haptics,
      theme: v.theme === 'dawn' || v.theme === 'dusk' ? v.theme : 'system',
      reduceMotion: typeof v.reduceMotion === 'boolean' ? v.reduceMotion : null,
      looks: v.looks && typeof v.looks === 'object' ? v.looks : {},
      hintsSeen: Array.isArray(v.hintsSeen) ? v.hintsSeen : [],
      language: typeof v.language === 'string' ? v.language : null,
      reviewAsked: v.reviewAsked === true,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}
