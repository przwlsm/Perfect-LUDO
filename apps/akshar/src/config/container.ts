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
  IHaptics,
  IImageSharer,
  IKeyValueStore,
  IReviewPrompt,
  IRewardedAdsService,
  ISoundPlayer,
  ISpeech,
  IStoreBilling,
  SoundCue,
} from '@/domain/ports';
import { ExpoSpeech } from '@/infrastructure/speech/ExpoSpeech';

/**
 * Composition root: the only file that creates concrete adapters.
 * Everything else depends on the domain ports.
 *
 * Akshar has no server and no accounts. Progress stays on the device;
 * purchases are restored from the store account.
 */
export const haptics: IHaptics = new ExpoHaptics();
export const sounds: ISoundPlayer<SoundCue> = new AudioCuePlayer<SoundCue>({
  // Original synthesized effects; regenerate with `npm run sounds`.
  sources: {
    scratch: require('../../assets/audio/scratch.wav'),
    chime: require('../../assets/audio/chime.wav'),
    stamp: require('../../assets/audio/stamp.wav'),
    page: require('../../assets/audio/page.wav'),
    tap: require('../../assets/audio/tap.wav'),
    soft: require('../../assets/audio/soft.wav'),
  },
  volumes: { scratch: 0.22, tap: 0.3, page: 0.45, soft: 0.5 },
  voices: { scratch: 3 },
});
export const storage: IKeyValueStore = new AsyncStorageKeyValueStore();
/** Opt-in rewarded videos; `supported()` is false in Expo Go, on the web, and without an ad unit. */
export const rewardedAds: IRewardedAdsService = new AdMobRewardedAds();
export const billing: IStoreBilling = new ExpoIapBilling();
export const sharer: IImageSharer = new ExpoImageSharer();
export const reviews: IReviewPrompt = new ExpoReviewPrompt();
export const speech: ISpeech = new ExpoSpeech();
