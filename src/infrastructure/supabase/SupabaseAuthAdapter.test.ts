import type { SupabaseClient } from '@supabase/supabase-js';
import { RESTORE_WAIT_MS, SupabaseAuthAdapter } from './SupabaseAuthAdapter';

const user = { id: 'account-a', email: 'player@example.test' };
const guestUser = { id: 'account-a', email: null, is_anonymous: true };
const session = { user };
const member = { uid: user.id, email: user.email, isGuest: false };
function setup(
  providerEnabled?: () => Promise<boolean>,
  storedUser?: () => Promise<typeof member | null>,
) {
  let listener: (event: string, value: typeof session | null) => void = () => {};
  const auth = {
    onAuthStateChange: jest.fn((fn) => {
      listener = fn;
    }),
    getSession: jest.fn().mockResolvedValue({ data: { session }, error: null }),
    getUser: jest.fn().mockResolvedValue({ data: { user }, error: null }),
    signUp: jest.fn().mockResolvedValue({ data: { user, session: null }, error: null }),
    signInWithPassword: jest.fn().mockResolvedValue({ data: { session }, error: null }),
    signInWithOAuth: jest
      .fn()
      .mockResolvedValue({ data: { url: 'https://accounts.example.test/authorize' }, error: null }),
    exchangeCodeForSession: jest.fn().mockResolvedValue({ data: { session }, error: null }),
    resetPasswordForEmail: jest.fn().mockResolvedValue({ error: null }),
    resend: jest.fn().mockResolvedValue({ error: null }),
    verifyOtp: jest.fn().mockResolvedValue({ data: { session }, error: null }),
    updateUser: jest.fn().mockResolvedValue({ data: { user }, error: null }),
    signInAnonymously: jest
      .fn()
      .mockResolvedValue({ data: { session: { user: guestUser } }, error: null }),
    refreshSession: jest.fn().mockResolvedValue({ data: { session }, error: null }),
    signOut: jest.fn().mockResolvedValue({ error: null }),
  };
  const rpc = jest.fn().mockResolvedValue({ data: null, error: null });
  const adapter = new SupabaseAuthAdapter(
    { auth, rpc } as unknown as SupabaseClient,
    providerEnabled,
    storedUser,
  );
  return {
    adapter,
    auth,
    rpc,
    emit: (event: string, value: typeof session | null) => listener(event, value),
  };
}

describe('account authentication', () => {
  it('keeps a disabled social provider inside the app with a useful message', async () => {
    const { adapter, auth } = setup(async () => false);
    await expect(adapter.getOAuthUrl('google', 'perfectludo://auth/callback')).rejects.toThrow(
      'Please use email',
    );
    expect(auth.signInWithOAuth).not.toHaveBeenCalled();
  });
  it('does not authenticate an unconfirmed signup', async () => {
    const { adapter } = setup();
    expect(
      await adapter.register(user.email, 'long-password', 'perfectludo://auth/callback'),
    ).toBeNull();
    expect(adapter.getCurrentUser()).toBeNull();
    await expect(adapter.signUp(user.email, 'long-password')).rejects.toThrow('confirm');
  });
  it('accepts signup only with an authenticated session', async () => {
    const { adapter, auth } = setup();
    auth.signUp.mockResolvedValueOnce({ data: { session }, error: null });
    expect(
      await adapter.register(user.email, 'long-password', 'https://game.test/auth/callback'),
    ).toEqual(member);
  });
  it('passes a chosen username to the server as sign-up metadata', async () => {
    const { adapter, auth } = setup();
    await adapter.register(user.email, 'long-password', 'https://game.test/auth/callback', {
      username: 'alexgaming',
    });
    expect(auth.signUp).toHaveBeenCalledWith({
      email: user.email,
      password: 'long-password',
      options: {
        emailRedirectTo: 'https://game.test/auth/callback',
        data: { username: 'alexgaming' },
      },
    });
  });
  it('marks anonymous sessions as guests', async () => {
    const { adapter } = setup();
    expect(await adapter.signInAsGuest()).toEqual({ uid: user.id, email: null, isGuest: true });
    expect(adapter.getCurrentUser()?.isGuest).toBe(true);
  });
  it('upgrades a guest in place and refreshes the token so the claims change', async () => {
    const { adapter, auth } = setup();
    await adapter.signInAsGuest();
    const upgraded = await adapter.upgradeGuest(
      user.email,
      'long-password',
      'https://game.test/auth/callback',
      { username: 'alexgaming' },
    );
    expect(auth.updateUser).toHaveBeenCalledWith(
      { email: user.email, password: 'long-password', data: { username: 'alexgaming' } },
      { emailRedirectTo: 'https://game.test/auth/callback' },
    );
    expect(auth.refreshSession).toHaveBeenCalled();
    // Same uid before and after: nothing played as a guest is orphaned.
    expect(upgraded).toEqual(member);
  });
  it('refuses to upgrade a session that is not a guest', async () => {
    const { adapter, auth } = setup();
    await adapter.signIn(user.email, 'long-password');
    await expect(
      adapter.upgradeGuest(user.email, 'long-password', 'https://game.test/auth/callback'),
    ).rejects.toThrow('guest');
    expect(auth.updateUser).not.toHaveBeenCalled();
  });
  it('resends a guest email change under its own verification type', async () => {
    const { adapter, auth } = setup();
    await adapter.resendConfirmation(user.email, 'perfectludo://auth/callback', 'email_change');
    expect(auth.resend).toHaveBeenCalledWith({
      type: 'email_change',
      email: user.email,
      options: { emailRedirectTo: 'perfectludo://auth/callback' },
    });
  });
  it.each(['google', 'facebook'] as const)(
    'starts %s with PKCE-compatible manual redirects',
    async (provider) => {
      const { adapter, auth } = setup();
      await adapter.getOAuthUrl(provider, 'perfectludo://auth/callback');
      expect(auth.signInWithOAuth).toHaveBeenCalledWith({
        provider,
        options: { redirectTo: 'perfectludo://auth/callback', skipBrowserRedirect: true },
      });
    },
  );
  it('exchanges a duplicated callback exactly once', async () => {
    const { adapter, auth } = setup();
    const url = 'perfectludo://auth/callback?code=single-use-code&sb_flow_id=flow-one';
    const [first, second] = await Promise.all([
      adapter.completeRedirect(url),
      adapter.completeRedirect(url),
    ]);
    expect(first).toEqual(second);
    expect(auth.exchangeCodeForSession).toHaveBeenCalledTimes(1);
    expect(auth.exchangeCodeForSession).toHaveBeenCalledWith('single-use-code', {
      flowId: 'flow-one',
    });
  });
  it('does not accept arbitrary access tokens or provider cancellation as a login', () => {
    const { adapter, auth } = setup();
    expect(() =>
      adapter.completeRedirect('perfectludo://auth/callback#access_token=bad&refresh_token=bad'),
    ).toThrow('invalid');
    expect(() =>
      adapter.completeRedirect('perfectludo://auth/callback?error=access_denied&code=bad'),
    ).toThrow('cancelled');
    expect(auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });
  it('reports expired callbacks without leaking the authorization code', async () => {
    const { adapter, auth } = setup();
    auth.exchangeCodeForSession.mockResolvedValueOnce({
      data: { session: null },
      error: new Error('secret-code'),
    });
    await expect(
      adapter.completeRedirect('perfectludo://auth/callback?code=secret-code'),
    ).rejects.toThrow('expired');
  });
  it('routes password recovery to the password form', async () => {
    const { adapter } = setup();
    expect(
      (await adapter.completeRedirect('perfectludo://auth/callback?code=reset-code&flow=recovery'))
        .recovery,
    ).toBe(true);
  });
  it('also recognizes recovery events from Supabase', async () => {
    const { adapter, emit } = setup();
    emit('PASSWORD_RECOVERY', session);
    expect(
      (await adapter.completeRedirect('perfectludo://auth/callback?code=reset-code')).recovery,
    ).toBe(true);
  });
  it('restores sessions and clears the current account on logout', async () => {
    const { adapter, auth } = setup();
    expect(await adapter.restoreSession()).toEqual(member);
    await adapter.signOut();
    expect(adapter.getCurrentUser()).toBeNull();
    expect(auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });
  it('deletes the account on the server, then clears the local session', async () => {
    const { adapter, auth, rpc } = setup();
    await adapter.restoreSession();
    await adapter.deleteAccount();
    expect(rpc).toHaveBeenCalledWith('delete_own_account');
    expect(auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(adapter.getCurrentUser()).toBeNull();
  });
  it('keeps the player signed in when the server refuses to delete the account', async () => {
    const { adapter, auth, rpc } = setup();
    await adapter.restoreSession();
    rpc.mockResolvedValueOnce({
      data: null,
      error: new Error('Please sign in again to continue.'),
    });
    await expect(adapter.deleteAccount()).rejects.toThrow('sign in again');
    expect(auth.signOut).not.toHaveBeenCalled();
    expect(adapter.getCurrentUser()).toEqual(member);
  });
  it('verifies recovery codes through the server', async () => {
    const { adapter, auth } = setup();
    expect((await adapter.verifyEmailCode(user.email, '123456', 'recovery')).recovery).toBe(true);
    expect(auth.verifyOtp).toHaveBeenCalledWith({
      email: user.email,
      token: '123456',
      type: 'recovery',
    });
  });
  it('refuses password updates without a verified session', async () => {
    const { adapter, auth } = setup();
    auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: new Error('Expired') });
    await expect(adapter.updatePassword('new-password')).rejects.toThrow('reset link');
    expect(auth.updateUser).not.toHaveBeenCalled();
  });
  it('sends reset and resend emails to the configured callback', async () => {
    const { adapter, auth } = setup();
    await adapter.requestPasswordReset(user.email, 'perfectludo://auth/callback?flow=recovery');
    await adapter.resendConfirmation(user.email, 'perfectludo://auth/callback');
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith(user.email, {
      redirectTo: 'perfectludo://auth/callback?flow=recovery',
    });
    expect(auth.resend).toHaveBeenCalledWith({
      type: 'signup',
      email: user.email,
      options: { emailRedirectTo: 'perfectludo://auth/callback' },
    });
  });
});

describe('restoring the login offline', () => {
  const offline = { name: 'AuthRetryableFetchError', status: 0, message: 'Network request failed' };

  it('continues as the saved login when the server is unreachable', async () => {
    const { adapter, auth } = setup(undefined, async () => member);
    auth.getSession.mockResolvedValueOnce({ data: { session: null }, error: offline });
    expect(await adapter.restoreSession()).toEqual(member);
    expect(adapter.getCurrentUser()).toEqual(member);
  });

  it('does not wait on a slow server for more than a few seconds', async () => {
    jest.useFakeTimers();
    try {
      const { adapter, auth } = setup(undefined, async () => member);
      auth.getSession.mockReturnValueOnce(new Promise(() => undefined));
      const restoring = adapter.restoreSession();
      await jest.advanceTimersByTimeAsync(RESTORE_WAIT_MS + 10);
      await expect(restoring).resolves.toEqual(member);
    } finally {
      jest.useRealTimers();
    }
  });

  it('still signs out a login the server rejects', async () => {
    const { adapter, auth } = setup(undefined, async () => member);
    auth.getSession.mockResolvedValueOnce({
      data: { session: null },
      error: { name: 'AuthApiError', status: 400, message: 'Invalid Refresh Token' },
    });
    await expect(adapter.restoreSession()).rejects.toThrow('sign in again');
  });

  it('reports the failure when nothing is saved on the device', async () => {
    const { adapter, auth } = setup(undefined, async () => null);
    auth.getSession.mockResolvedValueOnce({ data: { session: null }, error: offline });
    await expect(adapter.restoreSession()).rejects.toThrow('sign in again');
  });
});
