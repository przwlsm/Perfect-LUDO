import type { AuthUser, IAuthProvider, IUserProgressRepository, UserProfile } from '@/domain';

/** Creates the account and its progress profile together — never one without the other. */
export async function signUp(
  auth: IAuthProvider,
  progress: IUserProgressRepository,
  email: string,
  password: string,
  displayName: string | null,
): Promise<{ readonly user: AuthUser; readonly profile: UserProfile }> {
  const user = await auth.signUp(email, password);
  const profile = await progress.createProfile(user.uid, displayName);
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
