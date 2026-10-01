import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { authProvider } from '@/config/container';
import type { AuthCompletion, AuthUser, EmailVerification, SocialProvider } from '@/domain';
import { authRedirect, signInWithSocial } from '../auth/authBrowser';

type ErrorKey =
  | 'invalidCredentials'
  | 'emailNotConfirmed'
  | 'rateLimited'
  | 'guestDisabled'
  | 'emailExists'
  | 'providerUnavailable'
  | 'unavailable'
  | 'restoreFailed';
type NoticeKey = 'confirm' | 'socialCancelled' | 'resetSent' | 'resendSent' | 'passwordUpdated';

/**
 * Held as a key, so a message already on screen follows a language change;
 * `text` is a server's own message, shown as written.
 */
type AuthError = { readonly key: ErrorKey | 'generic' } | { readonly text: string };

/** Signals that this build has no account services, so the message comes from the catalogue. */
class AuthUnavailableError extends Error {}

function errorFor(error: unknown): AuthError {
  if (error instanceof AuthUnavailableError) return { key: 'unavailable' };
  const code = (error as { code?: string })?.code;
  if (code === 'invalid_credentials') return { key: 'invalidCredentials' };
  if (code === 'email_not_confirmed') return { key: 'emailNotConfirmed' };
  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit')
    return { key: 'rateLimited' };
  if (code === 'anonymous_provider_disabled') return { key: 'guestDisabled' };
  if (code === 'email_exists' || code === 'user_already_exists') return { key: 'emailExists' };
  if (code === 'provider_disabled' || code === 'validation_failed')
    return { key: 'providerUnavailable' };
  return error instanceof Error ? { text: error.message } : { key: 'generic' };
}

export function useAuthSession() {
  const { t } = useTranslation(['account', 'common']);
  const [user, setUser] = useState<AuthUser | null>(() => authProvider?.getCurrentUser() ?? null);
  const [busy, setBusy] = useState(false);
  const [restoring, setRestoring] = useState(Boolean(authProvider));
  const [error, setError] = useState<AuthError | null>(null);
  const [notice, setNotice] = useState<NoticeKey | null>(null);
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
        if (mounted.current) setError({ key: 'restoreFailed' });
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
      if (!authProvider) throw new AuthUnavailableError();
      return await action();
    } catch (e) {
      if (mounted.current) setError(errorFor(e));
      return undefined;
    } finally {
      locked.current = false;
      if (mounted.current) setBusy(false);
    }
  }, []);

  return {
    user,
    busy: busy || restoring,
    error: !error
      ? null
      : 'text' in error
        ? error.text
        : error.key === 'generic'
          ? t('common:errors.generic')
          : t(`account:auth.errors.${error.key}`),
    notice: notice ? t(`account:auth.notices.${notice}`) : null,
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
        if (!signedIn) setNotice('confirm');
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
        if (next.isGuest) setNotice('confirm');
        return { user: next, needsConfirmation: next.isGuest };
      }),
    social: (provider: SocialProvider) =>
      run(async () => {
        const result = await signInWithSocial(provider);
        if (!result && mounted.current) setNotice('socialCancelled');
        return result;
      }),
    signOut: () =>
      run(async () => {
        await authProvider!.signOut();
        setUser(null);
        return true;
      }),
    /** Permanently deletes the account. `run` guards against a double tap, and a
     * failure leaves the player signed in with the error surfaced as usual. */
    deleteAccount: () =>
      run(async () => {
        await authProvider!.deleteAccount();
        setUser(null);
        return true;
      }),
    requestReset: (email: string) =>
      run(async () => {
        await authProvider!.requestPasswordReset(email, authRedirect(true));
        setNotice('resetSent');
        return true;
      }),
    resend: (email: string, kind: 'signup' | 'email_change' = 'signup') =>
      run(async () => {
        await authProvider!.resendConfirmation(email, authRedirect(), kind);
        setNotice('resendSent');
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
        setNotice('passwordUpdated');
        return true;
      }),
  };
}
