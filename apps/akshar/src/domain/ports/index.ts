// The ports Akshar shares with every app come from app-kit; speech is its own.
export type {
  IHaptics,
  IImageSharer,
  IKeyValueStore,
  IReviewPrompt,
  IRewardedAdsService,
  ISoundPlayer,
  IStoreBilling,
} from 'app-kit';
export { SILENT_HAPTICS, silentSounds } from 'app-kit';
export type { ISpeech } from './ISpeech';
export { SILENT_SPEECH } from './ISpeech';

/** Akshar's original sound effects (scripts/generate-sounds.mjs). */
export type SoundCue = 'scratch' | 'chime' | 'stamp' | 'page' | 'tap' | 'soft';
