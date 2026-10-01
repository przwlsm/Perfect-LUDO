import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text } from '../components/AppText';
import { router } from 'expo-router';
import { Body, Button, Card, Screen, shared } from '../components/Kit';
import { AuthField } from '../auth/AuthField';
import { useAuthSession } from '../state/useAuthSession';

export default function ResetPasswordScreen() {
  const { t } = useTranslation('account');
  const auth = useAuthSession();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [done, setDone] = useState(false);
  const [mismatch, setMismatch] = useState(false);
  async function submit() {
    setMismatch(false);
    if (password !== confirm) {
      setMismatch(true);
      return;
    }
    if (await auth.updatePassword(password)) {
      setPassword('');
      setConfirm('');
      setDone(true);
    }
  }
  const error = mismatch ? t('shared.passwordMismatch') : null;
  return (
    <Screen nav={false} title={done ? t('reset.titleDone') : t('reset.title')}>
      <Card style={{ width: '100%', maxWidth: 480, alignSelf: 'center' }}>
        {done ? (
          <>
            <Body>{t('reset.doneBody')}</Body>
            <Button onPress={() => router.replace('/')}>{t('shared.backToGame')}</Button>
          </>
        ) : !auth.user ? (
          <>
            <Body>{auth.busy ? t('reset.checking') : t('reset.openEmail')}</Body>
            <Button disabled={auth.busy} onPress={() => router.replace('/login')}>
              {t('shared.backToSignIn')}
            </Button>
          </>
        ) : (
          <>
            <Body>{t('reset.rules')}</Body>
            <AuthField
              label={t('reset.newPassword')}
              password
              value={password}
              onChangeText={setPassword}
              autoComplete="new-password"
              editable={!auth.busy}
            />
            <AuthField
              label={t('reset.confirmNew')}
              password
              value={confirm}
              onChangeText={setConfirm}
              autoComplete="new-password"
              editable={!auth.busy}
            />
            <Button
              disabled={auth.busy || password.length < 8 || confirm.length < 8}
              onPress={() => void submit()}
            >
              {auth.busy ? t('reset.updating') : t('reset.save')}
            </Button>
            <Button secondary disabled={auth.busy} onPress={() => router.replace('/login')}>
              {t('reset.backToAccount')}
            </Button>
          </>
        )}
        {(error || auth.error) && (
          <Text accessibilityLiveRegion="polite" style={shared.error}>
            {error ?? auth.error}
          </Text>
        )}
      </Card>
    </Screen>
  );
}
