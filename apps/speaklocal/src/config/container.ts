import { Platform } from 'react-native';
import {
  AdMobRewardedAds,
  AsyncStorageKeyValueStore,
  AudioCuePlayer,
  ExpoHaptics,
  ExpoIapBilling,
  ExpoImageSharer,
  ExpoReviewPrompt,
} from 'app-kit/native';
import type {
  IClipPlayer,
  IHaptics,
  IImageSharer,
  IKeyValueStore,
  IRecorder,
  IRecordingStore,
  IReviewPrompt,
  IRewardedAdsService,
  ISoundPlayer,
  ISpeech,
  IStoreBilling,
  SoundCue,
} from '@/domain/ports';
import { ExpoClipPlayer } from '@/infrastructure/audio/ExpoClipPlayer';
import { ExpoRecorder } from '@/infrastructure/audio/ExpoRecorder';
import {
  FileRecordingStore,
  MemoryRecordingStore,
} from '@/infrastructure/audio/FileRecordingStore';
import { ExpoSpeech } from '@/infrastructure/speech/ExpoSpeech';

/**
 * Composition root: the only file that creates concrete adapters.
 * Everything else depends on the domain ports.
 *
 * Speak Local has no server and no accounts. Progress and recordings stay on
 * the device; purchases are restored from the store account.
 */
export const haptics: IHaptics = new ExpoHaptics();
export const sounds: ISoundPlayer<SoundCue> = new AudioCuePlayer<SoundCue>({
  // Original synthesized effects; regenerate with `npm run sounds`.
  sources: {
    tap: require('../../assets/audio/tap.wav'),
    correct: require('../../assets/audio/correct.wav'),
    wrong: require('../../assets/audio/wrong.wav'),
    chime: require('../../assets/audio/chime.wav'),
    recStart: require('../../assets/audio/recStart.wav'),
    recStop: require('../../assets/audio/recStop.wav'),
  },
  volumes: { tap: 0.28, correct: 0.5, wrong: 0.45, chime: 0.5, recStart: 0.4, recStop: 0.4 },
});
export const storage: IKeyValueStore = new AsyncStorageKeyValueStore();
/** Opt-in rewarded videos; `supported()` is false in Expo Go, on the web, and without an ad unit. */
export const rewardedAds: IRewardedAdsService = new AdMobRewardedAds();
export const billing: IStoreBilling = new ExpoIapBilling();
export const sharer: IImageSharer = new ExpoImageSharer();
export const reviews: IReviewPrompt = new ExpoReviewPrompt();
export const speech: ISpeech = new ExpoSpeech();
export const recorder: IRecorder = new ExpoRecorder();
export const clips: IClipPlayer = new ExpoClipPlayer();
export const recordings: IRecordingStore =
  Platform.OS === 'web' ? new MemoryRecordingStore() : new FileRecordingStore();
