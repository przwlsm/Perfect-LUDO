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
 * Diya has no server and no accounts. Progress stays on the device; Plus is
 * restored from the store account.
 */
export const haptics: IHaptics = new ExpoHaptics();
export const sounds: ISoundPlayer<SoundCue> = new AudioCuePlayer<SoundCue>({
  sources: {
    tap: require('../../assets/audio/tap.wav'),
    place: require('../../assets/audio/place.wav'),
    rotate: require('../../assets/audio/rotate.wav'),
    lift: require('../../assets/audio/lift.wav'),
    nope: require('../../assets/audio/nope.wav'),
    light1: require('../../assets/audio/light1.wav'),
    light2: require('../../assets/audio/light2.wav'),
    light3: require('../../assets/audio/light3.wav'),
    light4: require('../../assets/audio/light4.wav'),
    light5: require('../../assets/audio/light5.wav'),
    light6: require('../../assets/audio/light6.wav'),
    win: require('../../assets/audio/win.wav'),
    star: require('../../assets/audio/star.wav'),
    hint: require('../../assets/audio/hint.wav'),
  },
  volumes: { tap: 0.35, rotate: 0.45, lift: 0.45, place: 0.6, nope: 0.4, win: 0.75 },
  voices: { rotate: 3, place: 2, star: 3, light1: 2, light2: 2, light3: 2 },
  loop: require('../../assets/audio/hum.wav'),
});
export const storage: IKeyValueStore = new AsyncStorageKeyValueStore();
/** Opt-in rewarded videos; `supported()` is false in Expo Go, on the web, and without an ad unit. */
export const rewardedAds: IRewardedAdsService = new AdMobRewardedAds();
export const billing: IStoreBilling = new ExpoIapBilling();
export const imageSharer: IImageSharer = new ExpoImageSharer();
export const textSharer: ITextSharer = new NativeTextSharer();
export const reviews: IReviewPrompt = new ExpoReviewPrompt();
