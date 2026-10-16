import type { AudioSource } from 'expo-audio';
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
  IStoreBilling,
  ITextSharer,
  SoundCue,
} from '@/domain/ports/ports';
import { NativeTextSharer } from '@/infrastructure/sharing/NativeTextSharer';

/**
 * Composition root: the only file allowed to create concrete adapters.
 * Everything else depends on the ports.
 *
 * Kolam has no server and no accounts. Progress stays on the device; Plus
 * is restored from the store account.
 */

// Original synthesized effects; regenerate with `npm run sounds`.
const SOURCES: Readonly<Record<SoundCue, AudioSource>> = {
  tap: require('../../assets/audio/tap.wav'),
  segment: require('../../assets/audio/segment.wav'),
  cross: require('../../assets/audio/cross.wav'),
  erase: require('../../assets/audio/erase.wav'),
  hint: require('../../assets/audio/hint.wav'),
  solve: require('../../assets/audio/solve.wav'),
};

export const haptics: IHaptics = new ExpoHaptics();
export const sounds: ISoundPlayer<SoundCue> = new AudioCuePlayer<SoundCue>({
  sources: SOURCES,
  volumes: { tap: 0.3, segment: 0.45, cross: 0.35, erase: 0.35, hint: 0.55, solve: 0.75 },
  // A drag draws segments in quick runs; several voices keep each tick whole.
  voices: { segment: 4, cross: 2, erase: 3, tap: 2 },
});
export const storage: IKeyValueStore = new AsyncStorageKeyValueStore();
/** Opt-in rewarded videos; `supported()` is false in Expo Go, on the web, and without an ad unit. */
export const rewardedAds: IRewardedAdsService = new AdMobRewardedAds();
export const billing: IStoreBilling = new ExpoIapBilling();
export const imageSharer: IImageSharer = new ExpoImageSharer();
export const textSharer: ITextSharer = new NativeTextSharer();
export const reviews: IReviewPrompt = new ExpoReviewPrompt();
