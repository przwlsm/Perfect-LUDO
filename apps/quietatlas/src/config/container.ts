import type { IHaptics } from '@/domain/ports/IHaptics';
import type { IImageSharer } from '@/domain/ports/IImageSharer';
import type { IKeyValueStore } from '@/domain/ports/IKeyValueStore';
import type { IReviewPrompt } from '@/domain/ports/IReviewPrompt';
import type { IRewardedAdsService } from '@/domain/ports/IRewardedAdsService';
import type { ISoundPlayer } from '@/domain/ports/ISoundPlayer';
import type { IStoreBilling } from '@/domain/ports/IStoreBilling';
import { AdMobRewardedAdsService } from '@/infrastructure/ads/AdMobRewardedAdsService';
import { ExpoAudioSoundPlayer } from '@/infrastructure/audio/ExpoAudioSoundPlayer';
import { ExpoIapBilling } from '@/infrastructure/billing/ExpoIapBilling';
import { ExpoHaptics } from '@/infrastructure/haptics/ExpoHaptics';
import { ExpoReviewPrompt } from '@/infrastructure/review/ExpoReviewPrompt';
import { ExpoImageSharer } from '@/infrastructure/sharing/ExpoImageSharer';
import { AsyncStorageKeyValueStore } from '@/infrastructure/storage/AsyncStorageKeyValueStore';

/**
 * Composition root: the only file allowed to import concrete infrastructure
 * classes. Everything else depends on the domain ports.
 *
 * Quiet Atlas has no server and no accounts. Everything about the player
 * stays on the device; purchases are restored from the store account.
 */
export const haptics: IHaptics = new ExpoHaptics();
export const sounds: ISoundPlayer = new ExpoAudioSoundPlayer();
export const storage: IKeyValueStore = new AsyncStorageKeyValueStore();
/** Opt-in rewarded videos; `supported()` is false in Expo Go, on the web, and without an ad unit. */
export const rewardedAds: IRewardedAdsService = new AdMobRewardedAdsService();
export const billing: IStoreBilling = new ExpoIapBilling();
export const sharer: IImageSharer = new ExpoImageSharer();
export const reviews: IReviewPrompt = new ExpoReviewPrompt();
