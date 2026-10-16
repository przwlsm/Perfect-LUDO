// The ports every DevMinds app shares come from app-kit; Tambola adds ISpeaker.
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
export type { ISpeaker } from './ISpeaker';
export { SILENT_SPEAKER } from './ISpeaker';

/** The app's sound effects, synthesized by scripts/generate-sounds.mjs. */
export type SoundCue = 'roll' | 'chime' | 'dab' | 'undab' | 'cheer' | 'bogus' | 'tap' | 'start';
