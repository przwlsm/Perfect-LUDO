import type { AuthUser, IAuthProvider, IUserProgressRepository, UserProfile } from '@/domain';

/** Creates the account and its progress profile together — never one without the other. */
export async function signUp(
  auth: IAuthProvider,
  progress: IUserProgressRepository,
  email: string,
  password: string,
  seed: Omit<UserProfile, 'uid'>,
): Promise<{ readonly user: AuthUser; readonly profile: UserProfile }> {
  const user = await auth.signUp(email, password);
  // The client owns only the display name; the database seeds the wallet.
  await progress.saveDisplayName(user.uid, seed.displayName);
  const profile = (await progress.getProfile(user.uid)) ?? { ...seed, uid: user.uid };
  return { user, profile };
}

export async function signIn(
  auth: IAuthProvider,
  email: string,
  password: string,
): Promise<AuthUser> {
  return auth.signIn(email, password);
}

export async function signOut(auth: IAuthProvider): Promise<void> {
  return auth.signOut();
}
