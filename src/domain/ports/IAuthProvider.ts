import type { AuthUser } from '../entities/User';

/**
 * The whole app talks to this interface, never to the Firebase SDK
 * directly. That's what makes swapping Firebase for a different backend
 * later a matter of writing one new adapter, not a rewrite.
 */
export interface IAuthProvider {
  signUp(email: string, password: string): Promise<AuthUser>;
  signIn(email: string, password: string): Promise<AuthUser>;
  signOut(): Promise<void>;
  getCurrentUser(): AuthUser | null;
  /** Returns an unsubscribe function. */
  onAuthStateChanged(callback: (user: AuthUser | null) => void): () => void;
}
