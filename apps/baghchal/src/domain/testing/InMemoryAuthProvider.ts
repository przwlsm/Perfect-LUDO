import type { AuthUser, Unsubscribe } from '../entities/OnlineMatch';
import type { IAuthProvider } from '../ports/IAuthProvider';

export class InMemoryAuthProvider implements IAuthProvider {
  private readonly listeners = new Set<(user: AuthUser | null) => void>();
  guests = 0;

  constructor(private user: AuthUser | null = null) {}

  async restoreSession(): Promise<AuthUser | null> {
    return this.user;
  }

  async signInAsGuest(): Promise<AuthUser> {
    this.guests += 1;
    this.user = { uid: `guest-${this.guests}`, isGuest: true };
    for (const listener of this.listeners) listener(this.user);
    return this.user;
  }

  getCurrentUser(): AuthUser | null {
    return this.user;
  }

  onChange(listener: (user: AuthUser | null) => void): Unsubscribe {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
