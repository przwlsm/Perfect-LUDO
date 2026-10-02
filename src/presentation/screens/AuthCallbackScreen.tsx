import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '../components/AppText';
import { router, useLocalSearchParams } from 'expo-router';
import { authProvider } from '@/config/container';
import { Body, Button, Card, Screen, useShared } from '../components/Kit';
import { authRedirect } from '../auth/authBrowser';
import { i18n } from '../i18n';
import { LudoSpinner } from '../components/LoaderArt';

export default function AuthCallbackScreen() {
  const params = useLocalSearchParams<{
    code?: string;
    flow?: string;
    sb_flow_id?: string;
    error?: string;
  }>();
  const { t } = useTranslation('account');
  const shared = useShared();
  // A server's own message, or `null` with `failed` for the catalogue's fallback.
  const [error, setError] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const code = typeof params.code === 'string' ? params.code : '';
  const recovery = params.flow === 'recovery';
  const flowId = typeof params.sb_flow_id === 'string' ? params.sb_flow_id : undefined;
  const providerError = Boolean(params.error);
  useEffect(() => {
    let cancelled = false;
    async function finish() {
      try {
        if (!authProvider) throw new Error(i18n.t('account:auth.errors.unavailable'));
        const url = new URL(authRedirect(recovery));
        if (code) url.searchParams.set('code', code);
        if (flowId) url.searchParams.set('sb_flow_id', flowId);
        if (providerError) url.searchParams.set('error', 'access_denied');
        const result = await authProvider.completeRedirect(url.toString());
        if (!cancelled) router.replace(result.recovery ? '/auth/reset' : '/');
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : null);
          setFailed(true);
        }
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
    <Screen nav={false} title={t('callback.title')}>
      <Card style={{ width: '100%', maxWidth: 480, alignSelf: 'center' }}>
        {failed ? (
          <>
            <Text accessibilityLiveRegion="polite" style={shared.error}>
              {error ?? t('callback.failed')}
            </Text>
            <Button onPress={() => router.replace('/login')}>{t('shared.backToSignIn')}</Button>
          </>
        ) : (
          <>
            <LudoSpinner />
            <Body>{t('callback.finishing')}</Body>
          </>
        )}
      </Card>
    </Screen>
  );
}
