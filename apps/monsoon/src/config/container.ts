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
 * Monsoon Fields has no server and no accounts. Progress stays on the
 * device; Plus is restored from the store account.
 */
export const haptics: IHaptics = new ExpoHaptics();
export const sounds: ISoundPlayer<SoundCue> = new AudioCuePlayer<SoundCue>({
  sources: {
    tap: require('../../assets/audio/tap.wav'),
    clack: require('../../assets/audio/clack.wav'),
    nope: require('../../assets/audio/nope.wav'),
    sprout: require('../../assets/audio/sprout.wav'),
    chime1: require('../../assets/audio/chime1.wav'),
    chime2: require('../../assets/audio/chime2.wav'),
    chime3: require('../../assets/audio/chime3.wav'),
    chime4: require('../../assets/audio/chime4.wav'),
    chime5: require('../../assets/audio/chime5.wav'),
    chime6: require('../../assets/audio/chime6.wav'),
    splash: require('../../assets/audio/splash.wav'),
    frog: require('../../assets/audio/frog.wav'),
    win: require('../../assets/audio/win.wav'),
    star: require('../../assets/audio/star.wav'),
    hint: require('../../assets/audio/hint.wav'),
  },
  volumes: { tap: 0.35, clack: 0.55, nope: 0.4, sprout: 0.5, splash: 0.35, frog: 0.45, win: 0.75 },
  voices: { clack: 3, sprout: 3, chime1: 2, chime2: 2, chime3: 2, star: 3 },
  // A rain bed with a trickle of water in it; it swells as the network grows.
  loop: require('../../assets/audio/rain.wav'),
});
export const storage: IKeyValueStore = new AsyncStorageKeyValueStore();
/** Opt-in rewarded videos; `supported()` is false in Expo Go, on the web, and without an ad unit. */
export const rewardedAds: IRewardedAdsService = new AdMobRewardedAds();
export const billing: IStoreBilling = new ExpoIapBilling();
export const imageSharer: IImageSharer = new ExpoImageSharer();
export const textSharer: ITextSharer = new NativeTextSharer();
export const reviews: IReviewPrompt = new ExpoReviewPrompt();
