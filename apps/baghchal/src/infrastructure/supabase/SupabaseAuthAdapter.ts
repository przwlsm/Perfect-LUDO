import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { AuthUser, Unsubscribe } from '@/domain/entities/OnlineMatch';
import type { IAuthProvider } from '@/domain/ports/IAuthProvider';

/** How long start-up waits for the server before trusting the saved login. */
const RESTORE_WAIT_MS = 3500;

function toAuthUser(user: User | null | undefined): AuthUser | null {
  return user ? { uid: user.id, isGuest: user.is_anonymous === true } : null;
}

export class SupabaseAuthAdapter implements IAuthProvider {
  private user: AuthUser | null = null;
  private readonly listeners = new Set<(user: AuthUser | null) => void>();

  constructor(
    private readonly client: SupabaseClient,
    /** The login saved on this device, read without the network. */
    private readonly storedUser: () => Promise<AuthUser | null>,
  ) {
    this.client.auth.onAuthStateChange((_event, session) => {
      this.user = toAuthUser(session?.user);
      // No awaited Supabase calls in here: the SDK holds an auth lock.
      for (const listener of this.listeners) listener(this.user);
    });
  }

  /**
   * Restoring an expired login refreshes it over the network, which offline
   * can take a long time. So this waits briefly; if the server is slow, the
   * saved login is trusted and the SDK keeps refreshing in the background.
   * Only when nothing at all is saved does the caller make a new guest.
   */
  async restoreSession(): Promise<AuthUser | null> {
    const pending = this.client.auth.getSession();
    const result = await Promise.race([
      pending,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), RESTORE_WAIT_MS)),
    ]);
    if (result && !result.error) {
      this.user = toAuthUser(result.data.session?.user);
      return this.user;
    }
    const saved = await this.storedUser().catch(() => null);
    if (saved) {
      this.user = saved;
      return saved;
    }
    const late = await pending;
    if (late.error) return null;
    this.user = toAuthUser(late.data.session?.user);
    return this.user;
  }

  async signInAsGuest(): Promise<AuthUser> {
    const { data, error } = await this.client.auth.signInAnonymously();
    if (error) throw new Error('Could not start a guest session. Check your connection.');
    const user = toAuthUser(data.session?.user);
    if (!user) throw new Error('Could not start a guest session. Please try again.');
    this.user = user;
    return user;
  }

  getCurrentUser(): AuthUser | null {
    return this.user;
  }

  onChange(listener: (user: AuthUser | null) => void): Unsubscribe {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}
