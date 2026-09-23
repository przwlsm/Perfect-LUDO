import type { IKeyValueStore, IRandomProvider } from '@/domain';
import { AsyncStorageKeyValueStore } from '@/infrastructure/storage/AsyncStorageKeyValueStore';
import { SecureRandomProvider } from '@/infrastructure/random/SecureRandomProvider';
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
