import type { AuthUser, Profile } from '@/domain/entities/OnlineMatch';
import type { IAuthProvider } from '@/domain/ports/IAuthProvider';
import type { IProfileRepository } from '@/domain/ports/IProfileRepository';

export interface Session {
  readonly user: AuthUser;
  readonly profile: Profile;
}

/**
 * Signs the device in (the saved login, else a new guest) and makes sure
 * it has a profile. Nobody fills in a form to start playing.
 */
export async function ensureSignedIn(
  auth: IAuthProvider,
  profiles: IProfileRepository,
): Promise<Session> {
  const user = (await auth.restoreSession()) ?? (await auth.signInAsGuest());
  const profile = await profiles.ensure();
  return { user, profile };
}
