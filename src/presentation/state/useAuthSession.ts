import { useCallback, useEffect, useRef, useState } from 'react';
import { authProvider } from '@/config/container';
import type { AuthCompletion, AuthUser, EmailVerification, SocialProvider } from '@/domain';
import { authRedirect, signInWithSocial } from '../auth/authBrowser';

function messageFor(error: unknown): string {
  const code = (error as { code?: string })?.code;
  if (code === 'invalid_credentials') return 'Email or password is incorrect.';
  if (code === 'email_not_confirmed')
    return 'Confirm your email first. You can resend the confirmation below.';
  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit')
    return 'Too many attempts. Please wait a minute and try again.';
  if (code === 'anonymous_provider_disabled')
    return 'Guest play is not switched on for this server yet. Please sign in or create an account.';
  if (code === 'email_exists' || code === 'user_already_exists')
    return 'An account with this email already exists. Sign in to it instead.';
  if (code === 'provider_disabled' || code === 'validation_failed')
    return 'This sign-in option is unavailable. Please use email or try again later.';
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

const CONFIRM_NOTICE =
  'Check your email and open the confirmation link to finish creating your account.';

export function useAuthSession() {
  const [user, setUser] = useState<AuthUser | null>(() => authProvider?.getCurrentUser() ?? null);
  const [busy, setBusy] = useState(false);
  const [restoring, setRestoring] = useState(Boolean(authProvider));
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const locked = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    const unsub = authProvider?.onAuthStateChanged(setUser);
    void authProvider
      ?.restoreSession()
      .then((next) => {
        if (mounted.current) setUser(next);
      })
      .catch(() => {
        if (mounted.current) setError('Please sign in again. Your session could not be restored.');
      })
      .finally(() => {
        if (mounted.current) setRestoring(false);
      });
    return () => {
      mounted.current = false;
      unsub?.();
    };
  }, []);

  const run = useCallback(async <T>(action: () => Promise<T>): Promise<T | undefined> => {
    if (locked.current) return undefined;
    locked.current = true;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (!authProvider) throw new Error('Account services are unavailable in this build.');
      return await action();
    } catch (e) {
      if (mounted.current) setError(messageFor(e));
      return undefined;
    } finally {
      locked.current = false;
      if (mounted.current) setBusy(false);
    }
  }, []);

  return {
    user,
    busy: busy || restoring,
    error,
    notice,
    cloudEnabled: Boolean(authProvider),
    clearError: () => {
      setError(null);
      setNotice(null);
    },
    signIn: (email: string, password: string) => run(() => authProvider!.signIn(email, password)),
    signUp: (email: string, password: string, username?: string) =>
      run(async () => {
        const signedIn = await authProvider!.register(email, password, authRedirect(), {
          username,
        });
        if (!signedIn) setNotice(CONFIRM_NOTICE);
        return { user: signedIn, needsConfirmation: !signedIn };
      }),
    /** A temporary online identity with no credentials behind it. */
    continueAsGuest: () => run(() => authProvider!.signInAsGuest()),
    /** Turns the current guest session into an account, keeping everything played so far. */
    upgradeGuest: (email: string, password: string, username?: string) =>
      run(async () => {
        const next = await authProvider!.upgradeGuest(email, password, authRedirect(), {
          username,
        });
        if (next.isGuest) setNotice(CONFIRM_NOTICE);
        return { user: next, needsConfirmation: next.isGuest };
      }),
    social: (provider: SocialProvider) =>
      run(async () => {
        const result = await signInWithSocial(provider);
        if (!result && mounted.current)
          setNotice('Sign-in was cancelled or is continuing in your browser.');
        return result;
      }),
    signOut: () =>
      run(async () => {
        await authProvider!.signOut();
        setUser(null);
        return true;
      }),
    requestReset: (email: string) =>
      run(async () => {
        await authProvider!.requestPasswordReset(email, authRedirect(true));
        setNotice('If an account exists for this email, a password reset email is on its way.');
        return true;
      }),
    resend: (email: string, kind: 'signup' | 'email_change' = 'signup') =>
      run(async () => {
        await authProvider!.resendConfirmation(email, authRedirect(), kind);
        setNotice(
          'If confirmation is needed, a new email is on its way. Check your spam folder too.',
        );
        return true;
      }),
    verifyCode: (
      email: string,
      code: string,
      type: EmailVerification,
    ): Promise<AuthCompletion | undefined> =>
      run(() => authProvider!.verifyEmailCode(email, code, type)),
    updatePassword: (password: string) =>
      run(async () => {
        await authProvider!.updatePassword(password);
        setNotice('Your password has been updated.');
        return true;
      }),
  };
}
