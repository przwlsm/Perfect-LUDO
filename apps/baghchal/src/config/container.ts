import type { IAuthProvider } from '@/domain/ports/IAuthProvider';
import type { IHaptics } from '@/domain/ports/IHaptics';
import type { IIapService } from '@/domain/ports/IIapService';
import type { IKeyValueStore } from '@/domain/ports/IKeyValueStore';
import type { IOnlineMatchRepository } from '@/domain/ports/IOnlineMatchRepository';
import type { IProfileRepository } from '@/domain/ports/IProfileRepository';
import type { IRewardedAdsService } from '@/domain/ports/IRewardedAdsService';
import type { ISoundPlayer } from '@/domain/ports/ISoundPlayer';
import type { IWalletRepository } from '@/domain/ports/IWalletRepository';
import { AdMobRewardedAdsService } from '@/infrastructure/ads/AdMobRewardedAdsService';
import { ExpoAudioSoundPlayer } from '@/infrastructure/audio/ExpoAudioSoundPlayer';
import { ExpoHaptics } from '@/infrastructure/haptics/ExpoHaptics';
import { ExpoIapService } from '@/infrastructure/iap/ExpoIapService';
import { AsyncStorageKeyValueStore } from '@/infrastructure/storage/AsyncStorageKeyValueStore';
import { SupabaseAuthAdapter } from '@/infrastructure/supabase/SupabaseAuthAdapter';
import { SupabaseOnlineMatchRepository } from '@/infrastructure/supabase/SupabaseOnlineMatchRepository';
import { SupabaseProfileRepository } from '@/infrastructure/supabase/SupabaseProfileRepository';
import { SupabaseWalletRepository } from '@/infrastructure/supabase/SupabaseWalletRepository';
import {
  getSupabaseClient,
  isSupabaseConfigured,
  readStoredSessionUser,
} from '@/infrastructure/supabase/supabaseClient';

/**
 * Composition root: the only file allowed to import concrete infrastructure
 * classes. Everything else depends on the domain ports, so swapping an
 * implementation means a new adapter and a change here, nowhere else.
 */
export const haptics: IHaptics = new ExpoHaptics();
export const sounds: ISoundPlayer = new ExpoAudioSoundPlayer();
export const preferencesStore: IKeyValueStore = new AsyncStorageKeyValueStore();
/** Opt-in rewarded ads; `supported()` is false in Expo Go, on the web, and without an ad unit. */
export const rewardedAds: IRewardedAdsService = new AdMobRewardedAdsService();

/**
 * Online play, coins and purchases need a server. All of these are null in
 * a build with no Supabase credentials, where the app stays fully playable
 * offline; callers branch on that rather than assume a server.
 */
const supabase = isSupabaseConfigured ? getSupabaseClient() : null;
export const authProvider: IAuthProvider | null = supabase
  ? new SupabaseAuthAdapter(supabase, readStoredSessionUser)
  : null;
export const profileRepository: IProfileRepository | null = supabase
  ? new SupabaseProfileRepository(supabase)
  : null;
export const onlineMatches: IOnlineMatchRepository | null = supabase
  ? new SupabaseOnlineMatchRepository(supabase)
  : null;
export const walletRepository: IWalletRepository | null = supabase
  ? new SupabaseWalletRepository(supabase)
  : null;
/** Real-money products, verified server-side; hidden where the native store module is missing. */
export const iapService: IIapService | null = supabase ? new ExpoIapService(supabase) : null;
