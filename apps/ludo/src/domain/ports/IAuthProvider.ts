import type { AuthUser } from '../entities/User';

/** Backend-independent sign-in operations. Account lifecycle features extend this port. */
export interface IAuthProvider {
  signUp(email: string, password: string): Promise<AuthUser>;
  signIn(email: string, password: string): Promise<AuthUser>;
  signOut(): Promise<void>;
  getCurrentUser(): AuthUser | null;
  /** Returns an unsubscribe function. */
  onAuthStateChanged(callback: (user: AuthUser | null) => void): () => void;
}
