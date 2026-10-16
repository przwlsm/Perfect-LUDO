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
} from 'app-kit';
import type { ITextSharer } from '@/domain/ports/ITextSharer';
import type { SoundCue } from '@/domain/ports/Sounds';
import { NativeTextSharer } from '@/infrastructure/sharing/NativeTextSharer';

/**
 * Composition root: the only file that creates concrete adapters. Everything
 * else depends on the ports.
 *
 * Chai Sort has no server and no accounts. Progress stays on the device;
 * Plus is restored from the store account.
 */
export const haptics: IHaptics = new ExpoHaptics();
export const sounds: ISoundPlayer<SoundCue> = new AudioCuePlayer<SoundCue>({
  sources: {
    tap: require('../../assets/audio/tap.wav'),
    lift: require('../../assets/audio/lift.wav'),
    clink: require('../../assets/audio/clink.wav'),
    pour1: require('../../assets/audio/pour1.wav'),
    pour2: require('../../assets/audio/pour2.wav'),
    pour3: require('../../assets/audio/pour3.wav'),
    pour4: require('../../assets/audio/pour4.wav'),
    pour5: require('../../assets/audio/pour5.wav'),
    ting: require('../../assets/audio/ting.wav'),
    order: require('../../assets/audio/order.wav'),
    nope: require('../../assets/audio/nope.wav'),
    undo: require('../../assets/audio/undo.wav'),
    star: require('../../assets/audio/star.wav'),
    hint: require('../../assets/audio/hint.wav'),
    lid: require('../../assets/audio/lid.wav'),
  },
  volumes: { tap: 0.35, lift: 0.45, clink: 0.55, nope: 0.4, undo: 0.4, order: 0.75 },
  voices: { pour1: 2, pour2: 2, pour3: 2, pour4: 2, pour5: 2, clink: 2, ting: 2, star: 3 },
  loop: require('../../assets/audio/simmer.wav'),
});
export const storage: IKeyValueStore = new AsyncStorageKeyValueStore();
/** Opt-in rewarded videos; `supported()` is false in Expo Go, on the web, and without an ad unit. */
export const rewardedAds: IRewardedAdsService = new AdMobRewardedAds();
export const billing: IStoreBilling = new ExpoIapBilling();
export const imageSharer: IImageSharer = new ExpoImageSharer();
export const textSharer: ITextSharer = new NativeTextSharer();
export const reviews: IReviewPrompt = new ExpoReviewPrompt();
