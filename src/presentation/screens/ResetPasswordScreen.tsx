import { useState } from 'react';
import { Text } from 'react-native';
import { router } from 'expo-router';
import { Body, Button, Card, Screen, shared } from '../components/Kit';
import { AuthField } from '../auth/AuthField';
import { useAuthSession } from '../state/useAuthSession';

export default function ResetPasswordScreen() {
  const auth = useAuthSession();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit() {
    setError(null);
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (await auth.updatePassword(password)) {
      setPassword('');
      setConfirm('');
      setDone(true);
    }
  }
  return (
    <Screen nav={false} title={done ? 'Password updated' : 'Choose a new password'}>
      <Card style={{ width: '100%', maxWidth: 480, alignSelf: 'center' }}>
        {done ? (
          <>
            <Body>Your new password is ready. You are signed in.</Body>
            <Button onPress={() => router.replace('/')}>Back to the game</Button>
          </>
        ) : !auth.user ? (
          <>
            <Body>
              {auth.busy
                ? 'Checking your session...'
                : 'Open your password reset email or verify its code to continue.'}
            </Body>
            <Button disabled={auth.busy} onPress={() => router.replace('/login')}>
              Back to sign in
            </Button>
          </>
        ) : (
          <>
            <Body>Use at least 8 characters. Choose a password you do not use elsewhere.</Body>
            <AuthField
              label="New password"
              password
              value={password}
              onChangeText={setPassword}
              autoComplete="new-password"
              editable={!auth.busy}
            />
            <AuthField
              label="Confirm new password"
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
              {auth.busy ? 'Updating...' : 'Save new password'}
            </Button>
            <Button secondary disabled={auth.busy} onPress={() => router.replace('/login')}>
              Back to account
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
