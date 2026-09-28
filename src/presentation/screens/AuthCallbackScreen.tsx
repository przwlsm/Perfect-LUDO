import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform } from 'react-native';
import { Text } from '../components/AppText';
import { router, useLocalSearchParams } from 'expo-router';
import { authProvider } from '@/config/container';
import { Body, Button, Card, Screen, shared } from '../components/Kit';
import { authRedirect } from '../auth/authBrowser';

export default function AuthCallbackScreen() {
  const params = useLocalSearchParams<{
    code?: string;
    flow?: string;
    sb_flow_id?: string;
    error?: string;
  }>();
  const [error, setError] = useState<string | null>(null);
  const code = typeof params.code === 'string' ? params.code : '';
  const recovery = params.flow === 'recovery';
  const flowId = typeof params.sb_flow_id === 'string' ? params.sb_flow_id : undefined;
  const providerError = Boolean(params.error);
  useEffect(() => {
    let cancelled = false;
    async function finish() {
      try {
        if (!authProvider) throw new Error('Account services are unavailable in this build.');
        const url = new URL(authRedirect(recovery));
        if (code) url.searchParams.set('code', code);
        if (flowId) url.searchParams.set('sb_flow_id', flowId);
        if (providerError) url.searchParams.set('error', 'access_denied');
        const result = await authProvider.completeRedirect(url.toString());
        if (!cancelled) router.replace(result.recovery ? '/auth/reset' : '/');
      } catch (e) {
        if (!cancelled)
          setError(
            e instanceof Error ? e.message : 'Could not complete sign-in. Please try again.',
          );
      } finally {
        if (
          Platform.OS === 'web' &&
          typeof window !== 'undefined' &&
          window.location.pathname === '/auth/callback'
        ) {
          window.history.replaceState(window.history.state, '', '/auth/callback');
        }
      }
    }
    void finish();
    return () => {
      cancelled = true;
    };
  }, [code, recovery, providerError, flowId]);
  return (
    <Screen nav={false} title="Connecting your account">
      <Card style={{ width: '100%', maxWidth: 480, alignSelf: 'center' }}>
        {error ? (
          <>
            <Text accessibilityLiveRegion="polite" style={shared.error}>
              {error}
            </Text>
            <Button onPress={() => router.replace('/login')}>Back to sign in</Button>
          </>
        ) : (
          <>
            <ActivityIndicator />
            <Body>Finishing your secure sign-in...</Body>
          </>
        )}
      </Card>
    </Screen>
  );
}
