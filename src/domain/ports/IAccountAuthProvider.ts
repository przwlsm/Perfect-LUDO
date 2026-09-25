import type { AuthUser } from '../entities/User';
import type { IAuthProvider } from './IAuthProvider';

export type SocialProvider = 'google' | 'facebook';
/** Which email the code or link confirms: a new account, a reset, or a guest's new address. */
export type EmailVerification = 'signup' | 'recovery' | 'email_change';
export interface AuthCompletion {
  user: AuthUser;
  recovery: boolean;
}

/** What a new account asks for beyond credentials. */
export interface RegistrationDetails {
  /** Preferred public handle; the server falls back to the email if taken or invalid. */
  readonly username?: string;
}

/** Account lifecycle capabilities kept separate from the basic login port. */
export interface IAccountAuthProvider extends IAuthProvider {
  restoreSession(): Promise<AuthUser | null>;
  register(
    email: string,
    password: string,
    redirectTo: string,
    details?: RegistrationDetails,
  ): Promise<AuthUser | null>;
  /** Starts a temporary session with no credentials. */
  signInAsGuest(): Promise<AuthUser>;
  /**
   * Attaches credentials to the current guest session, keeping its uid.
   * Returns a user that is still a guest when the email must be confirmed first.
   */
  upgradeGuest(
    email: string,
    password: string,
    redirectTo: string,
    details?: RegistrationDetails,
  ): Promise<AuthUser>;
  getOAuthUrl(provider: SocialProvider, redirectTo: string): Promise<string>;
  completeRedirect(url: string): Promise<AuthCompletion>;
  requestPasswordReset(email: string, redirectTo: string): Promise<void>;
  resendConfirmation(
    email: string,
    redirectTo: string,
    kind?: Extract<EmailVerification, 'signup' | 'email_change'>,
  ): Promise<void>;
  verifyEmailCode(email: string, token: string, type: EmailVerification): Promise<AuthCompletion>;
  updatePassword(password: string): Promise<void>;
}
