import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { Text } from '../components/AppText';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { parseInviteCode } from '@/domain';
import { challengeRepository } from '@/config/container';
import { Body, Button, Card, Label, Screen, shared } from '../components/Kit';
import { LOGIN_HREF } from '../social/AccountGate';
import { useProfile } from '../state/ProfileProvider';
import { useSocial } from '../state/SocialProvider';
import { useAuthSession } from '../state/useAuthSession';

/**
 * Where an invite link lands (perfectludo://join/CODE). Anyone can follow
 * one: a player with no session is offered guest play first, and the seat
 * is taken as soon as they have one.
 */
export default function JoinByCodeScreen() {
  const params = useLocalSearchParams<{ code?: string }>();
  const code = parseInviteCode(typeof params.code === 'string' ? params.code : '');
  const { theme } = useProfile();
  const { t } = useTranslation(['online', 'common']);
  const { enabled, signedIn } = useSocial();
  const auth = useAuthSession();
  // The server's message as written, or null text for our own (translated) fallback.
  const [error, setError] = useState<{ text: string | null } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const started = useRef(-1);

  useEffect(() => {
    if (!code || !signedIn || !challengeRepository || started.current === attempt) return;
    started.current = attempt;
    setError(null);
    challengeRepository
      .joinLinkRoom(code)
      .then((lobbyId) => router.replace({ pathname: '/lobby/[id]', params: { id: lobbyId } }))
      .catch((e: unknown) => setError({ text: e instanceof Error ? e.message : null }));
  }, [code, signedIn, attempt]);

  if (!enabled || !challengeRepository)
    return (
      <Screen nav={false} back title={t('join.title')} subtitle={t('join.subtitle')}>
        <Card>
          <Body>{t('join.noServer')}</Body>
          <Button onPress={() => router.replace('/')}>{t('backToGame')}</Button>
        </Card>
      </Screen>
    );

  if (!code)
    return (
      <Screen nav={false} back title={t('join.title')} subtitle={t('join.subtitle')}>
        <Card>
          <Text style={shared.sectionTitle}>{t('join.invalidTitle')}</Text>
          <Body>{t('join.invalidBody')}</Body>
          <Button onPress={() => router.replace('/online')}>{t('join.goOnline')}</Button>
        </Card>
      </Screen>
    );

  if (!signedIn)
    return (
      <Screen nav={false} back title={t('join.invited')} subtitle={t('join.subtitle')}>
        <Card style={{ borderColor: `${theme.accent}40` }}>
          <Label color={theme.accent}>{t('join.gameCode', { code })}</Label>
          <Text style={shared.sectionTitle}>{t('join.takeSeat')}</Text>
          <Body>{t('join.invitedBody')}</Body>
          <Button disabled={auth.busy} onPress={() => void auth.continueAsGuest()}>
            {auth.busy ? t('settingUpSeat') : t('continueAsGuest')}
          </Button>
          <Button secondary disabled={auth.busy} onPress={() => router.push(LOGIN_HREF)}>
            {t('loginSignUp')}
          </Button>
          {auth.error && <Text style={shared.error}>{auth.error}</Text>}
        </Card>
      </Screen>
    );

  return (
    <Screen nav={false} back title={t('join.joining')} subtitle={t('join.subtitle')}>
      <Card>
        <Label color={theme.accent}>{t('join.gameCode', { code })}</Label>
        {error ? (
          <>
            <Text accessibilityLiveRegion="polite" style={shared.error}>
              {error.text ?? t('errors.joinFailedPlease')}
            </Text>
            <Button onPress={() => setAttempt((n) => n + 1)}>{t('tryAgain')}</Button>
            <Button secondary onPress={() => router.replace('/online')}>
              {t('backToOnline')}
            </Button>
          </>
        ) : (
          <>
            <ActivityIndicator color={theme.accent} />
            <Body>{t('join.finding')}</Body>
          </>
        )}
      </Card>
    </Screen>
  );
}
