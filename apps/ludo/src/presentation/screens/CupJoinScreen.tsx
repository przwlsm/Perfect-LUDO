import { useEffect, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { parseInviteCode } from '@/domain';
import { cupsRepository } from '@/config/container';
import { Text } from '../components/AppText';
import { Body, Button, Card, Label, Screen, useShared } from '../components/Kit';
import { LudoSpinner } from '../components/LoaderArt';
import { useProfile } from '../state/ProfileProvider';

/**
 * Where a cup invite lands (perfectludo://cups/join/CODE). Cups need an
 * account, so a guest is sent to sign in first and the seat is taken once
 * they are back as a member.
 */
export default function CupJoinScreen() {
  const params = useLocalSearchParams<{ code?: string }>();
  const code = parseInviteCode(typeof params.code === 'string' ? params.code : '');
  const { member, theme } = useProfile();
  const { t } = useTranslation(['cups', 'common']);
  const shared = useShared();
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const started = useRef(-1);

  useEffect(() => {
    if (!code || !member || !cupsRepository || started.current === attempt) return;
    started.current = attempt;
    setError(null);
    cupsRepository
      .joinByCode(code)
      .then((bracket) => router.replace({ pathname: '/cups/[id]', params: { id: bracket.id } }))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : t('private.joinFailed')));
  }, [code, member, attempt, t]);

  return (
    <Screen nav={false} back title={t('title')} subtitle={t('subtitle')}>
      <Card>
        {!code ? (
          <>
            <Text style={shared.sectionTitle}>{t('private.invalid')}</Text>
            <Button onPress={() => router.replace('/cups')}>{t('bracket.backToCups')}</Button>
          </>
        ) : !member ? (
          <>
            <Label color={theme.accentText}>{t('private.code', { code })}</Label>
            <Text style={shared.sectionTitle}>{t('signIn.title')}</Text>
            <Body>{t('signIn.body')}</Body>
            <Button onPress={() => router.push('/login')}>{t('signIn.button')}</Button>
          </>
        ) : error ? (
          <>
            <Label color={theme.accentText}>{t('private.code', { code })}</Label>
            <Text accessibilityLiveRegion="polite" style={shared.error}>
              {error}
            </Text>
            <Button onPress={() => setAttempt((n) => n + 1)}>{t('common:actions.retry')}</Button>
            <Button secondary onPress={() => router.replace('/cups')}>
              {t('bracket.backToCups')}
            </Button>
          </>
        ) : (
          <>
            <Label color={theme.accentText}>{t('private.code', { code })}</Label>
            <LudoSpinner />
            <Body>{t('private.joining')}</Body>
          </>
        )}
      </Card>
    </Screen>
  );
}
