import type { IUserProgressRepository, UserProfile } from '@/domain';
import type { Profile } from '../store/ProfileService';

/**
 * Merge account statistics into the device profile on sign-in. Coins and
 * inventory are untouched here: for members they are replaced wholesale by
 * the server wallet right after this runs, and for guests they stay local.
 */
export function mergeCloudProfile(local: Profile, cloud: UserProfile): Profile {
  const gamesPlayed = Math.max(local.games, cloud.gamesPlayed);
  const gamesWon = Math.max(local.wins, cloud.gamesWon);
  return {
    ...local,
    name: cloud.displayName ?? local.name,
    coins: local.coins,
    games: gamesPlayed,
    wins: gamesWon,
    // A current streak is a property of one device's run of games, so take
    // it from whichever side is further along rather than maxing it.
    streak: cloud.gamesPlayed > local.games ? cloud.streak : local.streak,
    bestStreak: Math.max(local.bestStreak, cloud.bestStreak),
  };
}

/**
 * On sign-in: adopt whatever the account already knows, and make sure the
 * account carries this player's display name. Returns the merged profile
 * the caller should persist locally.
 */
export async function syncOnSignIn(
  repository: IUserProgressRepository,
  uid: string,
  local: Profile,
): Promise<Profile> {
  const cloud = await repository.getProfile(uid);
  const merged = cloud ? mergeCloudProfile(local, cloud) : local;
  if (!cloud || cloud.displayName !== merged.name)
    await repository.saveDisplayName(uid, merged.name);
  return merged;
}

/** Pushes the one client-owned field up after a change. */
export async function pushDisplayName(
  repository: IUserProgressRepository,
  uid: string,
  local: Profile,
): Promise<void> {
  await repository.saveDisplayName(uid, local.name);
}
