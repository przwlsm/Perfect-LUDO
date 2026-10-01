import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '../components/AppText';
import { router, useLocalSearchParams } from 'expo-router';
import { authProvider } from '@/config/container';
import { Body, Button, Card, Label, Screen, Sheet, shared } from '../components/Kit';
import { INITIAL_PROFILE } from '@/application/store/ProfileService';
import { useProfile } from '../state/ProfileProvider';
import { useAuthSession } from '../state/useAuthSession';
import { AuthField } from '../auth/AuthField';
import { SocialButton } from '../auth/SocialButton';
import { useUsernameAvailability } from '../hooks/useUsernameAvailability';
import { ui } from '../theme/themes';
import type { EmailVerification } from '@/domain';
import { numberLocale } from '../i18n/format';

type Mode = 'signIn' | 'signUp' | 'forgot' | 'confirm';
type FormError = 'passwordMismatch' | 'nameSaveFailed';

export default function LoginScreen() {
  const params = useLocalSearchParams<{ intent?: string; mode?: string }>();
  // Arriving from "Play online" means going back there once signed in.
  const intentOnline = params.intent === 'online';
  const intentStore = params.intent === 'store';
  const destination = intentOnline ? '/online' : intentStore ? '/store' : '/';
  const { theme, profile, perform, syncWarning, reload } = useProfile();
  const { t } = useTranslation(['account', 'common']);
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
  const [name, setName] = useState(profile.name === INITIAL_PROFILE.name ? '' : profile.name);
  const [verification, setVerification] = useState<EmailVerification>('signup');
  const [cooldown, setCooldown] = useState(0);
  const [formError, setFormError] = useState<FormError | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
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
        setFormError('passwordMismatch');
        return;
      }
      try {
        const { profileService } = await import('@/config/container');
        await perform(() => profileService.update({ name: name.trim() }));
      } catch {
        setFormError('nameSaveFailed');
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
          ? t('login.title.account')
          : mode === 'signUp'
            ? guest
              ? t('login.title.keepProgress')
              : t('login.title.join')
            : mode === 'forgot'
              ? t('login.title.forgot')
              : mode === 'confirm'
                ? t('login.title.confirm')
                : t('login.title.welcome')
      }
    >
      <Card style={cardStyle}>
        {!auth.cloudEnabled ? (
          <>
            <Body>{t('login.notConfigured')}</Body>
            <Button onPress={() => router.replace('/')}>{t('login.playOffline')}</Button>
          </>
        ) : member ? (
          <>
            <Label color={theme.accent}>{t('login.signedIn')}</Label>
            <Body>{auth.user?.email ?? t('login.connectedAccount')}</Body>
            <Body>
              {t('login.summary', {
                name:
                  profile.name === INITIAL_PROFILE.name
                    ? t('common:defaultPlayerName')
                    : profile.name,
                coins: profile.coins.toLocaleString(numberLocale()),
                wins: profile.wins,
              })}
            </Body>
            {syncWarning && (
              <>
                <Body>{syncWarning}</Body>
                <Button secondary disabled={auth.busy} onPress={() => void reload()}>
                  {t('shared.retrySync')}
                </Button>
              </>
            )}
            <Button secondary onPress={() => router.push('/auth/reset')}>
              {t('login.changePassword')}
            </Button>
            <Button secondary disabled={auth.busy} onPress={() => void auth.signOut()}>
              {t('login.signOut')}
            </Button>
            <Button onPress={() => router.replace(destination)}>
              {intentOnline
                ? t('login.backOnline')
                : intentStore
                  ? t('login.backStore')
                  : t('shared.backToGame')}
            </Button>
            {/* Tucked away on purpose: this is a permanent, hard-to-undo
                action, so it should never be the thing a thumb lands on by
                accident among the ordinary account buttons above. */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('login.deleteAccount')}
              disabled={auth.busy}
              onPress={() => {
                auth.clearError();
                setConfirmingDelete(true);
              }}
              style={{
                alignSelf: 'center',
                minHeight: 48,
                justifyContent: 'center',
                paddingVertical: 10,
                paddingHorizontal: 8,
              }}
            >
              <Text style={{ fontSize: 12, color: ui.muted, textDecorationLine: 'underline' }}>
                {t('login.deleteAccount')}
              </Text>
            </Pressable>
          </>
        ) : (
          <>
            {guest && mode !== 'confirm' && (
              <View style={[shared.row, { alignItems: 'flex-start' }]}>
                <Text style={{ fontSize: 26 }}>🎟</Text>
                <View style={{ flex: 1, gap: 3 }}>
                  <Label color={theme.accent}>{t('shared.guestLabel')}</Label>
                  <Text style={shared.small}>
                    {signingUp ? t('login.guestSignUp') : t('login.guestSignIn')}
                  </Text>
                </View>
              </View>
            )}
            {(mode === 'signIn' || signingUp) && (
              <>
                {!guest && <Body>{t('login.pitch')}</Body>}
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
                  <Label>{t('login.orEmail')}</Label>
                </View>
              </>
            )}
            {mode === 'confirm' && (
              <Body>
                {verification === 'recovery'
                  ? t('login.confirmRecovery')
                  : t('login.confirmSignup')}
              </Body>
            )}
            {signingUp && (
              <>
                <AuthField
                  label={t('login.name.label')}
                  value={name}
                  onChangeText={setName}
                  maxLength={20}
                  editable={!auth.busy}
                  placeholder={t('login.name.placeholder')}
                  autoComplete="nickname"
                />
                <AuthField
                  label={t('login.username.label')}
                  value={username}
                  onChangeText={(text) =>
                    setUsername(text.toLowerCase().replace(/[^a-z0-9_]/g, ''))
                  }
                  maxLength={16}
                  editable={!auth.busy}
                  placeholder={t('login.username.placeholder')}
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
                      ? t('username.checking')
                      : availability.status === 'available'
                        ? t('username.available')
                        : t('username.unavailable', {
                            reason: availability.reason ?? t('username.fallback'),
                          })}
                  </Text>
                )}
              </>
            )}
            <AuthField
              label={t('login.email.label')}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              inputMode="email"
              autoComplete="email"
              placeholder={t('login.email.placeholder')}
              editable={!auth.busy && mode !== 'confirm'}
            />
            {(mode === 'signIn' || signingUp) && (
              <AuthField
                label={t('login.password.label')}
                password
                value={password}
                onChangeText={setPassword}
                autoComplete={signingUp ? 'new-password' : 'current-password'}
                placeholder={
                  signingUp ? t('login.password.newPlaceholder') : t('login.password.placeholder')
                }
                editable={!auth.busy}
              />
            )}
            {signingUp && (
              <AuthField
                label={t('login.password.confirm')}
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
                  ? t('login.submit.wait')
                  : signingUp
                    ? t('login.submit.create')
                    : mode === 'forgot'
                      ? t('login.submit.sendReset')
                      : t('login.submit.signIn')}
              </Button>
            )}
            {mode === 'signIn' && (
              <>
                <Button compact secondary disabled={auth.busy} onPress={() => changeMode('forgot')}>
                  {t('login.forgotPassword')}
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
                  {t('login.resendVerification')}
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
                {cooldown > 0 ? t('login.resendIn', { seconds: cooldown }) : t('login.resendEmail')}
              </Button>
            )}
            <Button
              compact
              secondary
              disabled={auth.busy}
              onPress={() => changeMode(mode === 'signIn' ? 'signUp' : 'signIn')}
            >
              {mode === 'signIn'
                ? t('login.createAccount')
                : guest
                  ? t('login.signInExisting')
                  : t('shared.backToSignIn')}
            </Button>
            {guest ? (
              <Button
                compact
                secondary
                disabled={auth.busy}
                onPress={() => router.replace('/online')}
              >
                {t('shared.continueGuest')}
              </Button>
            ) : intentOnline ? (
              <Button compact secondary disabled={auth.busy} onPress={() => void continueAsGuest()}>
                {t('shared.continueGuest')}
              </Button>
            ) : (
              <Button compact secondary disabled={auth.busy} onPress={() => router.replace('/')}>
                {t('login.playOfflineInstead')}
              </Button>
            )}
          </>
        )}
        {(formError || auth.error) && (
          <Text accessibilityLiveRegion="polite" style={shared.error}>
            {formError
              ? t(
                  formError === 'passwordMismatch'
                    ? 'shared.passwordMismatch'
                    : 'login.nameSaveFailed',
                )
              : auth.error}
          </Text>
        )}
        {auth.notice && (
          <Text accessibilityLiveRegion="polite" style={shared.small}>
            {auth.notice}
          </Text>
        )}
      </Card>
      <Sheet
        visible={confirmingDelete}
        onClose={() => {
          if (!auth.busy) setConfirmingDelete(false);
        }}
        title={t('login.delete.title')}
      >
        <Body>{t('login.delete.body')}</Body>
        <Body>{t('login.delete.noRestore')}</Body>
        {auth.error && (
          <Text accessibilityLiveRegion="polite" style={shared.error}>
            {auth.error}
          </Text>
        )}
        <Button secondary disabled={auth.busy} onPress={() => setConfirmingDelete(false)}>
          {t('common:actions.cancel')}
        </Button>
        <Button
          danger
          disabled={auth.busy}
          onPress={() =>
            void auth.deleteAccount().then((ok) => {
              if (ok) {
                setConfirmingDelete(false);
                router.replace('/');
              }
            })
          }
        >
          {auth.busy ? t('login.delete.deleting') : t('login.delete.confirm')}
        </Button>
      </Sheet>
    </Screen>
  );
}
