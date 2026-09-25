import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { authProvider } from '@/config/container';
import { Body, Button, Card, Label, Screen, shared } from '../components/Kit';
import { useProfile } from '../state/ProfileProvider';
import { useAuthSession } from '../state/useAuthSession';
import { AuthField } from '../auth/AuthField';
import { SocialButton } from '../auth/SocialButton';
import { useUsernameAvailability } from '../hooks/useUsernameAvailability';
import { ui } from '../theme/themes';
import type { EmailVerification } from '@/domain';

type Mode = 'signIn' | 'signUp' | 'forgot' | 'confirm';

export default function LoginScreen() {
  const params = useLocalSearchParams<{ intent?: string; mode?: string }>();
  // Arriving from "Play online" means going back there once signed in.
  const intentOnline = params.intent === 'online';
  const intentStore = params.intent === 'store';
  const destination = intentOnline ? '/online' : intentStore ? '/store' : '/';
  const { theme, profile, perform, syncWarning, reload } = useProfile();
  const auth = useAuthSession();
  const guest = auth.user?.isGuest === true;
  // A guest is here to create an account, so that form comes first for them.
  const [mode, setMode] = useState<Mode>(() =>
    params.mode === 'signUp' || authProvider?.getCurrentUser()?.isGuest ? 'signUp' : 'signIn',
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [username, setUsername] = useState('');
  const [name, setName] = useState(profile.name === 'Player' ? '' : profile.name);
  const [verification, setVerification] = useState<EmailVerification>('signup');
  const [cooldown, setCooldown] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);
  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(() => setCooldown((n) => n - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);
  const validEmail = /^\S+@\S+\.\S+$/.test(email.trim());
  const signingUp = mode === 'signUp';
  const availability = useUsernameAvailability(signingUp ? username : '');
  function changeMode(next: Mode) {
    setMode(next);
    setPassword('');
    setRepeatPassword('');
    setFormError(null);
    auth.clearError();
  }
  async function submit() {
    setFormError(null);
    if (signingUp) {
      if (password !== repeatPassword) {
        setFormError('Passwords do not match.');
        return;
      }
      try {
        const { profileService } = await import('@/config/container');
        await perform(() => profileService.update({ name: name.trim() }));
      } catch {
        setFormError('Could not save your player name. Please try again.');
        return;
      }
      const handle = username.trim() || undefined;
      const result = guest
        ? await auth.upgradeGuest(email.trim(), password, handle)
        : await auth.signUp(email.trim(), password, handle);
      setPassword('');
      setRepeatPassword('');
      if (result?.user && !result.needsConfirmation) router.replace(destination);
      else if (result?.needsConfirmation) {
        setVerification(guest ? 'email_change' : 'signup');
        setMode('confirm');
        setCooldown(60);
      }
    } else if (mode === 'forgot') {
      if (await auth.requestReset(email.trim())) {
        setVerification('recovery');
        setMode('confirm');
        setCooldown(60);
      }
    } else if (await auth.signIn(email.trim(), password)) {
      setPassword('');
      router.replace(destination);
    }
  }
  async function resend() {
    const ok =
      verification === 'recovery'
        ? await auth.requestReset(email.trim())
        : await auth.resend(
            email.trim(),
            verification === 'email_change' ? 'email_change' : 'signup',
          );
    if (ok) setCooldown(60);
  }
  async function continueAsGuest() {
    if (await auth.continueAsGuest()) router.replace('/online');
  }
  const usernameOk = username.trim().length === 0 || availability.status !== 'unavailable';
  const canSubmit =
    validEmail &&
    !auth.busy &&
    (mode === 'forgot' ||
      (signingUp
        ? password.length >= 8 &&
          repeatPassword.length >= 8 &&
          name.trim().length > 0 &&
          usernameOk &&
          availability.status !== 'checking'
        : password.length > 0));
  const cardStyle = { width: '100%' as const, maxWidth: 480, alignSelf: 'center' as const };
  const member = Boolean(auth.user) && !guest;
  return (
    <Screen
      nav={false}
      back
      title={
        member
          ? 'Your account'
          : mode === 'signUp'
            ? guest
              ? 'Keep your progress'
              : 'Join the club'
            : mode === 'forgot'
              ? 'Reset your password'
              : mode === 'confirm'
                ? 'Check your email'
                : 'Welcome back'
      }
    >
      <Card style={cardStyle}>
        {!auth.cloudEnabled ? (
          <>
            <Body>
              Account services are not configured for this build. You can still play offline.
            </Body>
            <Button onPress={() => router.replace('/')}>Play offline</Button>
          </>
        ) : member ? (
          <>
            <Label color={theme.accent}>SIGNED IN</Label>
            <Body>{auth.user?.email ?? 'Connected account'}</Body>
            <Body>
              {profile.name} / {profile.coins.toLocaleString()} coins / {profile.wins} wins
            </Body>
            {syncWarning && (
              <>
                <Body>{syncWarning}</Body>
                <Button secondary disabled={auth.busy} onPress={() => void reload()}>
                  Retry cloud sync
                </Button>
              </>
            )}
            <Button secondary onPress={() => router.push('/auth/reset')}>
              Change password
            </Button>
            <Button secondary disabled={auth.busy} onPress={() => void auth.signOut()}>
              Sign out
            </Button>
            <Button onPress={() => router.replace(destination)}>
              {intentOnline
                ? 'Back to online play'
                : intentStore
                  ? 'Back to the store'
                  : 'Back to the game'}
            </Button>
          </>
        ) : (
          <>
            {guest && mode !== 'confirm' && (
              <View style={[shared.row, { alignItems: 'flex-start' }]}>
                <Text style={{ fontSize: 26 }}>🎟</Text>
                <View style={{ flex: 1, gap: 3 }}>
                  <Label color={theme.accent}>PLAYING AS A GUEST</Label>
                  <Text style={shared.small}>
                    {signingUp
                      ? 'Your games, coins and seat at the table stay exactly as they are.'
                      : 'Signing in to another account ends this guest session.'}
                  </Text>
                </View>
              </View>
            )}
            {(mode === 'signIn' || signingUp) && !guest && (
              <>
                <Body>Save your progress and pick up where you left off.</Body>
                <SocialButton
                  provider="google"
                  disabled={auth.busy}
                  onPress={() =>
                    void auth.social('google').then((result) => {
                      if (result) router.replace(destination);
                    })
                  }
                />
                <View style={{ alignItems: 'center', paddingVertical: 4 }}>
                  <Label>OR USE EMAIL</Label>
                </View>
              </>
            )}
            {mode === 'confirm' && (
              <Body>
                {verification === 'recovery'
                  ? 'Open the password reset link we emailed you to continue.'
                  : 'Open the confirmation link we emailed you. Your account is ready as soon as you do.'}
              </Body>
            )}
            {signingUp && (
              <>
                <AuthField
                  label="Player name"
                  value={name}
                  onChangeText={setName}
                  maxLength={20}
                  editable={!auth.busy}
                  placeholder="Your name at the table"
                  autoComplete="nickname"
                />
                <AuthField
                  label="Username"
                  value={username}
                  onChangeText={(text) =>
                    setUsername(text.toLowerCase().replace(/[^a-z0-9_]/g, ''))
                  }
                  maxLength={16}
                  editable={!auth.busy}
                  placeholder="3–16 letters, numbers or _ (optional)"
                  autoComplete="username"
                />
                {availability.status !== 'idle' && (
                  <Text
                    accessibilityLiveRegion="polite"
                    style={[
                      shared.small,
                      availability.status === 'available' && { color: ui.green },
                      availability.status === 'unavailable' && { color: ui.danger },
                    ]}
                  >
                    {availability.status === 'checking'
                      ? 'Checking…'
                      : availability.status === 'available'
                        ? '✓ Username available'
                        : `✕ ${availability.reason}`}
                  </Text>
                )}
              </>
            )}
            <AuthField
              label="Email address"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              editable={!auth.busy && mode !== 'confirm'}
            />
            {(mode === 'signIn' || signingUp) && (
              <AuthField
                label="Password"
                password
                value={password}
                onChangeText={setPassword}
                autoComplete={signingUp ? 'new-password' : 'current-password'}
                placeholder={signingUp ? 'At least 8 characters' : 'Your password'}
                editable={!auth.busy}
              />
            )}
            {signingUp && (
              <AuthField
                label="Confirm password"
                password
                value={repeatPassword}
                onChangeText={setRepeatPassword}
                autoComplete="new-password"
                editable={!auth.busy}
              />
            )}
            {mode !== 'confirm' && (
              <Button disabled={!canSubmit} onPress={() => void submit()}>
                {auth.busy
                  ? 'Please wait...'
                  : signingUp
                    ? 'Create account'
                    : mode === 'forgot'
                      ? 'Send reset email'
                      : 'Sign in'}
              </Button>
            )}
            {mode === 'signIn' && (
              <>
                <Button compact secondary disabled={auth.busy} onPress={() => changeMode('forgot')}>
                  Forgot password?
                </Button>
                <Button
                  compact
                  secondary
                  disabled={auth.busy || !validEmail || cooldown > 0}
                  onPress={() =>
                    void auth.resend(email.trim()).then((ok) => {
                      if (ok) {
                        setVerification('signup');
                        setMode('confirm');
                        setCooldown(60);
                      }
                    })
                  }
                >
                  Resend verification email
                </Button>
              </>
            )}
            {mode === 'confirm' && (
              <Button
                compact
                secondary
                disabled={auth.busy || cooldown > 0}
                onPress={() => void resend()}
              >
                {cooldown > 0 ? `Resend available in ${cooldown}s` : 'Resend email'}
              </Button>
            )}
            <Button
              compact
              secondary
              disabled={auth.busy}
              onPress={() => changeMode(mode === 'signIn' ? 'signUp' : 'signIn')}
            >
              {mode === 'signIn'
                ? 'Create an account'
                : guest
                  ? 'Sign in to an existing account'
                  : 'Back to sign in'}
            </Button>
            {guest ? (
              <Button
                compact
                secondary
                disabled={auth.busy}
                onPress={() => router.replace('/online')}
              >
                Continue as guest
              </Button>
            ) : intentOnline ? (
              <Button compact secondary disabled={auth.busy} onPress={() => void continueAsGuest()}>
                Continue as guest
              </Button>
            ) : (
              <Button compact secondary disabled={auth.busy} onPress={() => router.replace('/')}>
                Play offline instead
              </Button>
            )}
          </>
        )}
        {(formError || auth.error) && (
          <Text accessibilityLiveRegion="polite" style={shared.error}>
            {formError ?? auth.error}
          </Text>
        )}
        {auth.notice && (
          <Text accessibilityLiveRegion="polite" style={shared.small}>
            {auth.notice}
          </Text>
        )}
      </Card>
    </Screen>
  );
}
