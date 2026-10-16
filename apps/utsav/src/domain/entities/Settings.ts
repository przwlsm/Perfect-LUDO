import { isCardLanguage, type CardLanguage } from './Language';
import { LIMITS } from './Card';

/** System follows the device; Ivory is the light look, Night the dark one. */
export type ThemeChoice = 'system' | 'ivory' | 'night';

export interface Settings {
  /** The sender's name, remembered for every card's sign-off. */
  readonly name: string;
  /** The language new cards start in; null follows the device. */
  readonly cardLanguage: CardLanguage | null;
  readonly sound: boolean;
  readonly haptics: boolean;
  readonly theme: ThemeChoice;
  /** Calmer motion: no sparkles, flicker or falling petals. Follows the OS until changed. */
  readonly reduceMotion: boolean | null;
  /** The one-line editor hint has been seen. */
  readonly editorHintSeen: boolean;
  /** Cards shared so far, for the one-time review prompt. */
  readonly shares: number;
  /** The store's review card has been offered once; never again. */
  readonly reviewAsked: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  name: '',
  cardLanguage: null,
  sound: true,
  haptics: true,
  theme: 'system',
  reduceMotion: null,
  editorHintSeen: false,
  shares: 0,
  reviewAsked: false,
};

export function parseSettings(raw: string | null): Settings {
  if (!raw) return DEFAULT_SETTINGS;
  try {
    const v = JSON.parse(raw) as Partial<Settings>;
    return {
      name: typeof v.name === 'string' ? v.name.slice(0, LIMITS.from) : '',
      cardLanguage: isCardLanguage(v.cardLanguage) ? v.cardLanguage : null,
      sound: typeof v.sound === 'boolean' ? v.sound : DEFAULT_SETTINGS.sound,
      haptics: typeof v.haptics === 'boolean' ? v.haptics : DEFAULT_SETTINGS.haptics,
      theme: v.theme === 'ivory' || v.theme === 'night' ? v.theme : 'system',
      reduceMotion: typeof v.reduceMotion === 'boolean' ? v.reduceMotion : null,
      editorHintSeen: v.editorHintSeen === true,
      shares: typeof v.shares === 'number' && Number.isFinite(v.shares) ? Math.max(0, v.shares) : 0,
      reviewAsked: v.reviewAsked === true,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}
