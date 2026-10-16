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
  ISpeaker,
  IStoreBilling,
  SoundCue,
} from '@/domain/ports/ports';
import { ExpoSpeaker } from '@/infrastructure/speech/ExpoSpeaker';

/**
 * Composition root: the only file allowed to create concrete adapters.
 * Everything else depends on the ports.
 *
 * Tambola Party has no server and no accounts. A Party Room lives in its
 * six-character code; everything about the player stays on the device, and
 * purchases are restored from the store account.
 */

// Original synthesized effects; regenerate with `npm run sounds`.
const SOURCES: Readonly<Record<SoundCue, AudioSource>> = {
  roll: require('../../assets/audio/roll.wav'),
  chime: require('../../assets/audio/chime.wav'),
  dab: require('../../assets/audio/dab.wav'),
  undab: require('../../assets/audio/undab.wav'),
  cheer: require('../../assets/audio/cheer.wav'),
  bogus: require('../../assets/audio/bogus.wav'),
  tap: require('../../assets/audio/tap.wav'),
  start: require('../../assets/audio/start.wav'),
};

export const haptics: IHaptics = new ExpoHaptics();
export const sounds: ISoundPlayer<SoundCue> = new AudioCuePlayer<SoundCue>({
  sources: SOURCES,
  volumes: { tap: 0.3, undab: 0.35, dab: 0.55, roll: 0.5, chime: 0.55, cheer: 0.7, bogus: 0.5 },
  voices: { dab: 3, undab: 2, tap: 2 },
});
export const speaker: ISpeaker = new ExpoSpeaker();
export const storage: IKeyValueStore = new AsyncStorageKeyValueStore();
/** Opt-in rewarded videos; `supported()` is false in Expo Go, on the web, and without an ad unit. */
export const rewardedAds: IRewardedAdsService = new AdMobRewardedAds();
export const billing: IStoreBilling = new ExpoIapBilling();
export const sharer: IImageSharer = new ExpoImageSharer();
export const reviews: IReviewPrompt = new ExpoReviewPrompt();
