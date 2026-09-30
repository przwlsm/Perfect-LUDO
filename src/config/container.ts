import { AccountProfiles } from '@/application/auth/AccountProfiles';
import type {
  IAccountAuthProvider,
  IChallengeRepository,
  IConnectivityService,
  IFeedbackRepository,
  IFriendsRepository,
  IKeyValueStore,
  IMatchmakingRepository,
  IMatchSyncRepository,
  INotificationRepository,
  IPresenceService,
  IRandomProvider,
  IIapService,
  IRewardedAdsService,
  IRewardsRepository,
  IReactionChannel,
  ISocialIdentityRepository,
  IUserProgressRepository,
  IWalletRepository,
} from '@/domain';
import { AdMobRewardedAdsService } from '@/infrastructure/ads/rewardedAds';
import { ExpoIapService } from '@/infrastructure/iap/ExpoIapService';
import { AsyncStorageKeyValueStore } from '@/infrastructure/storage/AsyncStorageKeyValueStore';
import { ExpoConnectivityService } from '@/infrastructure/network/ExpoConnectivityService';
import { SecureRandomProvider } from '@/infrastructure/random/SecureRandomProvider';
import {
  getSupabaseClient,
  isSupabaseConfigured,
  isSocialProviderEnabled,
  readStoredSessionUser,
  probeSupabaseHealth,
} from '@/infrastructure/supabase/supabaseClient';
import { SupabaseMatchmakingRepository } from '@/infrastructure/supabase/SupabaseMatchmakingRepository';
import { SupabaseAuthAdapter } from '@/infrastructure/supabase/SupabaseAuthAdapter';
import { SupabaseUserProgressRepository } from '@/infrastructure/supabase/SupabaseUserProgressRepository';
import { SupabaseWalletRepository } from '@/infrastructure/supabase/SupabaseWalletRepository';
import { SupabaseFeedbackRepository } from '@/infrastructure/supabase/SupabaseFeedbackRepository';
import { SupabaseRewardsRepository } from '@/infrastructure/supabase/SupabaseRewardsRepository';
import { SupabaseReactionChannel } from '@/infrastructure/supabase/SupabaseReactionChannel';
import { SupabaseChallengeRepository } from '@/infrastructure/supabase/SupabaseChallengeRepository';
import { SupabaseFriendsRepository } from '@/infrastructure/supabase/SupabaseFriendsRepository';
import { SupabaseMatchSyncRepository } from '@/infrastructure/supabase/SupabaseMatchSyncRepository';
import { SupabaseNotificationRepository } from '@/infrastructure/supabase/SupabaseNotificationRepository';
import { SupabasePresenceService } from '@/infrastructure/supabase/SupabasePresenceService';
import { SupabaseSocialIdentityRepository } from '@/infrastructure/supabase/SupabaseSocialIdentityRepository';
import { ProfileService, type IProfileService } from '@/application/store/ProfileService';
import { MatchRepository, type IMatchRepository } from '@/application/session/MatchRepository';

/**
 * Composition root: the only file in the app allowed to import concrete
 * infrastructure classes. Everything else — application use cases,
 * presentation hooks/components — depends only on the domain ports
 * (IRandomProvider, IAuthProvider, IUserProgressRepository, IKeyValueStore).
 * Swapping an implementation (e.g. Firebase for a custom backend later)
 * means adding a new adapter and changing the wiring here, nowhere else.
 */
export const randomProvider: IRandomProvider = new SecureRandomProvider();
export const preferencesStore: IKeyValueStore = new AsyncStorageKeyValueStore();
export const profileService: IProfileService = new ProfileService(preferencesStore);
export const matchRepository: IMatchRepository = new MatchRepository(preferencesStore);

/**
 * Cloud sync is opt-in: both are null when no Supabase credentials are
 * configured, and the app stays fully playable on local storage alone.
 * Callers must handle null rather than assume an account exists.
 */
const supabase = isSupabaseConfigured ? getSupabaseClient() : null;
export const authProvider: IAccountAuthProvider | null = supabase
  ? new SupabaseAuthAdapter(supabase, isSocialProviderEnabled, readStoredSessionUser)
  : null;
export const userProgressRepository: IUserProgressRepository | null = supabase
  ? new SupabaseUserProgressRepository(supabase)
  : null;
/**
 * Coins, inventory and rewards for signed-in members live on the server;
 * null in an offline build, where the store is browse-only.
 */
export const walletRepository: IWalletRepository | null = supabase
  ? new SupabaseWalletRepository(supabase)
  : null;
/**
 * Reachable by anyone, signed in or not — reporting a bug should never
 * require an account. Null only when this build has no Supabase project
 * configured at all, in which case the feedback screen falls back to email.
 */
/** Daily spin, missions, season pass and tournament: members only, server-owned. */
export const rewardsRepository: IRewardsRepository | null = supabase
  ? new SupabaseRewardsRepository(supabase)
  : null;
/** Opt-in rewarded video ads; unsupported (hidden) in Expo Go builds. */
export const rewardedAds: IRewardedAdsService = new AdMobRewardedAdsService();
/** Real-money store purchases, verified server-side; null in offline builds. */
export const iapService: IIapService | null = supabase ? new ExpoIapService(supabase) : null;
/** Emoji between the players of an online match, over Realtime broadcast. */
export const reactionChannel: IReactionChannel | null = supabase
  ? new SupabaseReactionChannel(supabase)
  : null;
export const feedbackRepository: IFeedbackRepository | null = supabase
  ? new SupabaseFeedbackRepository(supabase)
  : null;

/**
 * Playing with friends needs an account, so every social capability is null
 * in an offline build. Callers branch on that rather than assuming a server.
 */
const currentUserId = () => authProvider?.getCurrentUser()?.uid ?? null;
export const friendsRepository: IFriendsRepository | null = supabase
  ? new SupabaseFriendsRepository(supabase, currentUserId)
  : null;
export const challengeRepository: IChallengeRepository | null = supabase
  ? new SupabaseChallengeRepository(supabase)
  : null;
export const notificationRepository: INotificationRepository | null = supabase
  ? new SupabaseNotificationRepository(supabase, currentUserId)
  : null;
export const matchSyncRepository: IMatchSyncRepository | null = supabase
  ? new SupabaseMatchSyncRepository(supabase)
  : null;
export const presenceService: IPresenceService | null = supabase
  ? new SupabasePresenceService(supabase)
  : null;
export const socialIdentityRepository: ISocialIdentityRepository | null = supabase
  ? new SupabaseSocialIdentityRepository(supabase)
  : null;
export const matchmakingRepository: IMatchmakingRepository | null = supabase
  ? new SupabaseMatchmakingRepository(supabase)
  : null;

/**
 * "Online" is judged by reaching the game server, not by the Wi-Fi icon.
 * Null in an offline build, where there is no server to be online to.
 */
export const connectivityService: IConnectivityService | null = supabase
  ? new ExpoConnectivityService(probeSupabaseHealth)
  : null;

export const accountProfiles = new AccountProfiles(
  preferencesStore,
  profileService,
  userProgressRepository,
  walletRepository,
);
