import type { SupabaseClient, User } from '@supabase/supabase-js';
import type {
  AuthUser,
  IAccountAuthProvider,
  AuthCompletion,
  SocialProvider,
  EmailVerification,
  RegistrationDetails,
} from '@/domain';
import { parseAuthCallback } from './authCallback';

function toAuthUser(user: User | null | undefined): AuthUser | null {
  return user
    ? { uid: user.id, email: user.email ?? null, isGuest: user.is_anonymous === true }
    : null;
}

/** Sign-up preferences travel as user metadata; the server reads them once, on first identity setup. */
function metadataFor(details?: RegistrationDetails): Record<string, string> | undefined {
  const username = details?.username?.trim();
  return username ? { username } : undefined;
}

/** How long start-up waits for the server before trusting the saved login. */
export const RESTORE_WAIT_MS = 3500;

/** Network trouble, as opposed to the server saying the login is no longer valid. */
function isNetworkError(error: { name?: string; status?: number; message?: string }): boolean {
  return (
    error.name === 'AuthRetryableFetchError' ||
    error.status === 0 ||
    /network|fetch|timed? ?out/i.test(error.message ?? '')
  );
}

export class SupabaseAuthAdapter implements IAccountAuthProvider {
  private currentUser: AuthUser | null = null;
  private readonly listeners = new Set<(user: AuthUser | null) => void>();
  private readonly exchanges = new Map<string, Promise<AuthCompletion>>();
  private recovering = false;

  constructor(
    private readonly client: SupabaseClient,
    private readonly providerEnabled?: (provider: SocialProvider) => Promise<boolean>,
    /** The login saved on this device, read without the network. */
    private readonly storedUser?: () => Promise<AuthUser | null>,
  ) {
    this.client.auth.onAuthStateChange((event, session) => {
      this.currentUser = toAuthUser(session?.user);
      if (event === 'PASSWORD_RECOVERY') this.recovering = true;
      if (event === 'SIGNED_OUT') {
        this.recovering = false;
        this.exchanges.clear();
      }
      // No awaited Supabase operations inside this callback: the SDK holds an auth lock.
      for (const listener of this.listeners) listener(this.currentUser);
    });
  }

  /**
   * Restoring an expired login refreshes it over the network, and offline
   * the SDK keeps retrying for a long time. So start-up waits briefly; if
   * the server is slow or unreachable, the player continues as the login
   * saved on this device, and Supabase keeps refreshing in the background
   * (reporting through onAuthStateChange once it succeeds). A login the
   * server actually rejects is still treated as signed out.
   */
  async restoreSession(): Promise<AuthUser | null> {
    const pending = this.client.auth.getSession();
    const result = await Promise.race([
      pending,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), RESTORE_WAIT_MS)),
    ]);
    if (result && !result.error) {
      this.currentUser = toAuthUser(result.data.session?.user);
      return this.currentUser;
    }
    if (result?.error && !isNetworkError(result.error))
      throw new Error('Could not restore your session. Please sign in again.');
    const saved = await this.storedUser?.().catch(() => null);
    if (saved) {
      this.currentUser = saved;
      return saved;
    }
    if (result) throw new Error('Could not restore your session. Please sign in again.');
    // Nothing saved to fall back on: wait for the SDK after all.
    const late = await pending;
    if (late.error) throw new Error('Could not restore your session. Please sign in again.');
    this.currentUser = toAuthUser(late.data.session?.user);
    return this.currentUser;
  }

  async register(
    email: string,
    password: string,
    redirectTo: string,
    details?: RegistrationDetails,
  ): Promise<AuthUser | null> {
    const { data, error } = await this.client.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectTo, data: metadataFor(details) },
    });
    if (error) throw error;
    // A user record without a session is NOT an authenticated account.
    this.currentUser = toAuthUser(data.session?.user);
    return this.currentUser;
  }

  async signInAsGuest(): Promise<AuthUser> {
    const { data, error } = await this.client.auth.signInAnonymously();
    if (error) throw error;
    const user = toAuthUser(data.session?.user);
    if (!user) throw new Error('Could not start a guest session. Please try again.');
    this.currentUser = user;
    return user;
  }

  async upgradeGuest(
    email: string,
    password: string,
    redirectTo: string,
    details?: RegistrationDetails,
  ): Promise<AuthUser> {
    if (!this.currentUser?.isGuest) {
      throw new Error('Only a guest session can be turned into an account.');
    }
    const { data, error } = await this.client.auth.updateUser(
      { email, password, data: metadataFor(details) },
      { emailRedirectTo: redirectTo },
    );
    if (error) throw error;
    // Guest status lives in the token's claims, so the app (and row-level
    // security) only see the change once a fresh token has been issued.
    const refreshed = await this.client.auth.refreshSession();
    const user = toAuthUser(refreshed.data.session?.user ?? data.user);
    if (!user) throw new Error('Your account was created but the session could not be refreshed.');
    this.currentUser = user;
    return user;
  }

  async signUp(email: string, password: string): Promise<AuthUser> {
    const { data, error } = await this.client.auth.signUp({ email, password });
    if (error) throw error;
    const user = toAuthUser(data.session?.user);
    if (!user) throw new Error('Check your email to confirm your account before signing in.');
    this.currentUser = user;
    return user;
  }

  async signIn(email: string, password: string): Promise<AuthUser> {
    const { data, error } = await this.client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    const user = toAuthUser(data.session?.user);
    if (!user) throw new Error('Sign-in did not create a session. Please try again.');
    this.currentUser = user;
    return user;
  }

  async getOAuthUrl(provider: SocialProvider, redirectTo: string): Promise<string> {
    if (this.providerEnabled && !(await this.providerEnabled(provider))) {
      throw new Error(
        `${provider === 'google' ? 'Google' : 'Facebook'} sign-in is not available yet. Please use email.`,
      );
    }
    const { data, error } = await this.client.auth.signInWithOAuth({
      provider,
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error) throw error;
    if (!data.url) throw new Error('This sign-in provider is unavailable. Please use email.');
    return data.url;
  }

  completeRedirect(url: string): Promise<AuthCompletion> {
    const { code, recovery, flowId } = parseAuthCallback(url);
    // Router and the native browser can deliver the same callback simultaneously.
    const pending = this.exchanges.get(code);
    if (pending) return pending;
    const exchange = this.exchange(code, recovery, flowId);
    this.exchanges.set(code, exchange);
    // Bound in-memory history; authorization codes are never logged or persisted here.
    if (this.exchanges.size > 8) this.exchanges.delete(this.exchanges.keys().next().value!);
    return exchange;
  }

  private async exchange(
    code: string,
    recovery: boolean,
    flowId?: string,
  ): Promise<AuthCompletion> {
    const { data, error } = await this.client.auth.exchangeCodeForSession(
      code,
      flowId ? { flowId } : undefined,
    );
    if (error || !data.session)
      throw new Error(
        'This link expired, was already used, or was opened on another device. Request a new email or enter its code.',
      );
    const user = toAuthUser(data.session.user)!;
    this.currentUser = user;
    return { user, recovery: recovery || this.recovering };
  }

  async requestPasswordReset(email: string, redirectTo: string): Promise<void> {
    const { error } = await this.client.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw error;
  }

  async resendConfirmation(
    email: string,
    redirectTo: string,
    kind: 'signup' | 'email_change' = 'signup',
  ): Promise<void> {
    const { error } = await this.client.auth.resend({
      type: kind,
      email,
      options: { emailRedirectTo: redirectTo },
    });
    if (error) throw error;
  }

  async verifyEmailCode(
    email: string,
    token: string,
    type: EmailVerification,
  ): Promise<AuthCompletion> {
    const { data, error } = await this.client.auth.verifyOtp({ email, token, type });
    if (error)
      throw new Error('That code is invalid or expired. Request a new code and try again.');
    const user = toAuthUser(data.session?.user);
    if (!user) throw new Error('Verification did not create a session. Please try again.');
    this.currentUser = user;
    return { user, recovery: type === 'recovery' };
  }

  async updatePassword(password: string): Promise<void> {
    const { data, error: sessionError } = await this.client.auth.getUser();
    if (sessionError || !data.user)
      throw new Error('Open a new password reset link before setting your password.');
    const { error } = await this.client.auth.updateUser({ password });
    if (error) throw error;
    this.recovering = false;
  }

  async signOut(): Promise<void> {
    const { error } = await this.client.auth.signOut({ scope: 'local' });
    if (error) throw error;
    this.currentUser = null;
    this.exchanges.clear();
  }
  /**
   * Deletes the account server-side first; only on success does it clear the
   * local session, exactly like signing out. A failed request leaves the
   * player signed in rather than dropping them into a half-deleted state.
   */
  async deleteAccount(): Promise<void> {
    const { error: rpcError } = await this.client.rpc('delete_own_account');
    if (rpcError) throw rpcError;
    const { error } = await this.client.auth.signOut({ scope: 'local' });
    if (error) throw error;
    this.currentUser = null;
    this.exchanges.clear();
  }
  getCurrentUser(): AuthUser | null {
    return this.currentUser;
  }
  onAuthStateChanged(callback: (user: AuthUser | null) => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }
}
