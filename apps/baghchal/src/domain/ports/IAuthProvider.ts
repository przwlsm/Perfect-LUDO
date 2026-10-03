import type { AuthUser, Unsubscribe } from '../entities/OnlineMatch';

/** Who this device is signed in as. Guests need no form; an account can be added later. */
export interface IAuthProvider {
  /** The login saved on this device, or null when there is none. */
  restoreSession(): Promise<AuthUser | null>;
  signInAsGuest(): Promise<AuthUser>;
  getCurrentUser(): AuthUser | null;
  onChange(listener: (user: AuthUser | null) => void): Unsubscribe;
}
