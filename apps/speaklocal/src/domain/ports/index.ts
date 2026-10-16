// The ports Speak Local shares with every app come from app-kit; speech and
// the microphone are its own.
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
export type { DeviceVoice, ISpeech, SpeakOptions } from './ISpeech';
export { SILENT_SPEECH } from './ISpeech';
export type { IClipPlayer, IRecorder, IRecordingStore, MicPermission } from './IRecorder';

/** Speak Local's original sound effects (scripts/generate-sounds.mjs). */
export type SoundCue = 'tap' | 'correct' | 'wrong' | 'chime' | 'recStart' | 'recStop';
