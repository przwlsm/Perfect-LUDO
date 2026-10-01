import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import { authProvider } from '@/config/container';
import type { AuthCompletion, SocialProvider } from '@/domain';
import { i18n } from '../i18n';

export function authRedirect(recovery = false): string {
  const base =
    Platform.OS === 'web' && typeof window !== 'undefined'
      ? `${window.location.origin}/auth/callback`
      : 'perfectludo://auth/callback';
  return recovery ? `${base}?flow=recovery` : base;
}

export async function signInWithSocial(provider: SocialProvider): Promise<AuthCompletion | null> {
  if (!authProvider) throw new Error(i18n.t('account:auth.errors.unavailable'));
  if (Platform.OS !== 'web' && Constants.executionEnvironment === 'storeClient') {
    throw new Error(i18n.t('account:auth.errors.socialExpoGo'));
  }
  const redirect = authRedirect();
  const url = await authProvider.getOAuthUrl(provider, redirect);
  if (Platform.OS === 'web') {
    // A same-tab redirect avoids popup blockers and keeps the PKCE verifier on this origin.
    window.location.assign(url);
    return null;
  }
  const result = await WebBrowser.openAuthSessionAsync(url, redirect);
  if (result.type !== 'success') return null;
  return authProvider.completeRedirect(result.url);
}
