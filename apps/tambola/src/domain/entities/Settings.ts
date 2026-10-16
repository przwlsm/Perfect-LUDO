import { DEFAULT_PRIZES, normalizePrizes, type PrizeId } from './Prize';

export type ThemeChoice = 'system' | 'day' | 'night';
export type VoiceLanguage = 'en' | 'hi';
export type CallMode = 'auto' | 'tap';

export const MIN_CALL_SECONDS = 3;
export const MAX_CALL_SECONDS = 10;

export interface Settings {
  readonly sound: boolean;
  readonly haptics: boolean;
  readonly theme: ThemeChoice;
  /** Calmer motion: no twinkling lights, no rolling ball. Follows the OS until changed. */
  readonly reduceMotion: boolean | null;
  /** The caller speaks each number. */
  readonly voice: boolean;
  readonly voiceLanguage: VoiceLanguage;
  /** Show the traditional rhyme under each called number. */
  readonly funCalls: boolean;
  /** Speak the rhyme too (the Plus fun-call voice; ignored while it is locked). */
  readonly funVoice: boolean;
  readonly callMode: CallMode;
  /** Seconds between automatic calls. */
  readonly callSeconds: number;
  /** Players: softly mark numbers that were probably called while you looked away. Off by default. */
  readonly missedHelper: boolean;
  /** The prizes the host played for last time. */
  readonly hostPrizes: readonly PrizeId[];
  readonly ticketTheme: string;
  readonly dabber: string;
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
  voice: true,
  voiceLanguage: 'en',
  funCalls: true,
  funVoice: true,
  callMode: 'auto',
  callSeconds: 6,
  missedHelper: false,
  hostPrizes: DEFAULT_PRIZES,
  ticketTheme: 'classic',
  dabber: 'marigold',
  hintsSeen: [],
  language: null,
  reviewAsked: false,
};

export function clampCallSeconds(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_SETTINGS.callSeconds;
  return Math.min(MAX_CALL_SECONDS, Math.max(MIN_CALL_SECONDS, Math.round(n)));
}

export function parseSettings(raw: string | null): Settings {
  if (!raw) return DEFAULT_SETTINGS;
  try {
    const v = JSON.parse(raw) as Partial<Settings>;
    const bool = (x: unknown, d: boolean) => (typeof x === 'boolean' ? x : d);
    const str = (x: unknown, d: string) => (typeof x === 'string' ? x : d);
    return {
      sound: bool(v.sound, DEFAULT_SETTINGS.sound),
      haptics: bool(v.haptics, DEFAULT_SETTINGS.haptics),
      theme: v.theme === 'day' || v.theme === 'night' ? v.theme : 'system',
      reduceMotion: typeof v.reduceMotion === 'boolean' ? v.reduceMotion : null,
      voice: bool(v.voice, DEFAULT_SETTINGS.voice),
      voiceLanguage: v.voiceLanguage === 'hi' ? 'hi' : 'en',
      funCalls: bool(v.funCalls, DEFAULT_SETTINGS.funCalls),
      funVoice: bool(v.funVoice, DEFAULT_SETTINGS.funVoice),
      callMode: v.callMode === 'tap' ? 'tap' : 'auto',
      callSeconds: clampCallSeconds(
        typeof v.callSeconds === 'number' ? v.callSeconds : DEFAULT_SETTINGS.callSeconds,
      ),
      missedHelper: bool(v.missedHelper, false),
      hostPrizes: Array.isArray(v.hostPrizes)
        ? normalizePrizes(v.hostPrizes.filter((p): p is string => typeof p === 'string'))
        : DEFAULT_PRIZES,
      ticketTheme: str(v.ticketTheme, DEFAULT_SETTINGS.ticketTheme),
      dabber: str(v.dabber, DEFAULT_SETTINGS.dabber),
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
