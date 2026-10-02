import type { AuthUser } from '../entities/User';
import type { IAuthProvider } from '../ports/IAuthProvider';

/**
 * In-memory IAuthProvider test double — no network, no persistence.
 * Deliberately simple (no real password hashing/validation): this stands
 * in for Firebase in tests, it never runs in production.
 */
export class InMemoryAuthProvider implements IAuthProvider {
  private readonly usersByEmail = new Map<string, { readonly user: AuthUser; password: string }>();
  private currentUser: AuthUser | null = null;
  private nextUid = 1;
  private readonly listeners = new Set<(user: AuthUser | null) => void>();

  async signUp(email: string, password: string): Promise<AuthUser> {
    if (this.usersByEmail.has(email)) {
      throw new Error(`Email already registered: ${email}`);
    }
    const user: AuthUser = { uid: `uid-${this.nextUid++}`, email, isGuest: false };
    this.usersByEmail.set(email, { user, password });
    this.setCurrentUser(user);
    return user;
  }

  async signIn(email: string, password: string): Promise<AuthUser> {
    const record = this.usersByEmail.get(email);
    if (!record || record.password !== password) {
      throw new Error('Invalid email or password');
    }
    this.setCurrentUser(record.user);
    return record.user;
  }

  async signOut(): Promise<void> {
    this.setCurrentUser(null);
  }

  getCurrentUser(): AuthUser | null {
    return this.currentUser;
  }

  onAuthStateChanged(callback: (user: AuthUser | null) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private setCurrentUser(user: AuthUser | null): void {
    this.currentUser = user;
    for (const listener of this.listeners) listener(user);
  }
}
