import { Platform } from 'react-native';
import type {
  IHaptics,
  IImageSharer,
  IKeyValueStore,
  IReviewPrompt,
  IRewardedAdsService,
  ISoundPlayer,
  IStoreBilling,
} from 'app-kit';
import {
  AdMobRewardedAds,
  AsyncStorageKeyValueStore,
  AudioCuePlayer,
  ExpoHaptics,
  ExpoIapBilling,
  ExpoImageSharer,
  ExpoReviewPrompt,
} from 'app-kit/native';
import type { IClipboard } from '@/domain/ports/IClipboard';
import type { IPhotoPicker } from '@/domain/ports/IPhotoPicker';
import type { SoundCue } from '@/domain/ports/Sounds';
import { ExpoClipboard } from '@/infrastructure/clipboard/ExpoClipboard';
import { ExpoPhotoPicker } from '@/infrastructure/photos/ExpoPhotoPicker';
import { WebImageSharer } from '@/infrastructure/sharing/WebImageSharer';

/**
 * Composition root: the only file that creates concrete adapters.
 * Everything else depends on the ports.
 *
 * Utsav has no server and no accounts. Cards, photos and settings stay on
 * the phone; purchases are restored from the store account.
 */
export const haptics: IHaptics = new ExpoHaptics();
export const sounds: ISoundPlayer<SoundCue> = new AudioCuePlayer<SoundCue>({
  // Original synthesized effects; regenerate with `npm run sounds`.
  sources: {
    tap: require('../../assets/audio/tap.wav'),
    sparkle: require('../../assets/audio/sparkle.wav'),
    whoosh: require('../../assets/audio/whoosh.wav'),
    chime: require('../../assets/audio/chime.wav'),
  },
  volumes: { tap: 0.3, sparkle: 0.35, whoosh: 0.55, chime: 0.5 },
  voices: { tap: 2, sparkle: 2 },
});
export const storage: IKeyValueStore = new AsyncStorageKeyValueStore();
/** Opt-in rewarded videos; `supported()` is false in Expo Go, on the web, and without an ad unit. */
export const rewardedAds: IRewardedAdsService = new AdMobRewardedAds();
export const billing: IStoreBilling = new ExpoIapBilling();
export const sharer: IImageSharer =
  Platform.OS === 'web' ? new WebImageSharer() : new ExpoImageSharer();
export const reviews: IReviewPrompt = new ExpoReviewPrompt();
export const photos: IPhotoPicker = new ExpoPhotoPicker();
export const clipboard: IClipboard = new ExpoClipboard();
