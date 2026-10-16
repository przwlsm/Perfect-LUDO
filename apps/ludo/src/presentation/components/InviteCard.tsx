import { useCallback, useEffect, useRef, useState } from 'react';
import { Share, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { referralRepository } from '@/config/container';
import type { ReferralView } from '@/domain';
import { Text, TextInput } from './AppText';
import { Body, Button, Card, Label, useShared } from './Kit';
import { i18n } from '../i18n';
import { numberLocale } from '../i18n/format';
import { useProfile } from '../state/ProfileProvider';
import { useSocial } from '../state/SocialProvider';
import { makeStyles, useUi } from '../theme/AppearanceProvider';

const STORE_URL = 'https://play.google.com/store/apps/details?id=com.devmindslabs.ludoRumble';
const message = (e: unknown) => (e instanceof Error ? e.message : i18n.t('common:errors.generic'));

/**
 * Invite a friend: share your User ID, and (while you are new) name the
 * friend who invited you. The bonus is paid by the server after the invited
 * friend's first online game.
 */
export function InviteCard() {
  const { theme, member, refreshWallet } = useProfile();
  const { identity } = useSocial();
  const { t } = useTranslation('invite');
  const s = useStyles();
  const ui = useUi();
  const shared = useShared();
  const [data, setData] = useState<ReferralView | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const alive = useRef(true);
  useEffect(() => () => void (alive.current = false), []);

  const load = useCallback(async () => {
    if (!member || !referralRepository) return;
    try {
      const next = await referralRepository.get();
      if (alive.current) setData(next);
    } catch {
      // The card simply shows no numbers until the next visit.
    }
  }, [member]);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (!member || !referralRepository || !identity?.publicId) return null;
  const reward = data?.reward ?? 2000;
  const coins = (n: number) => n.toLocaleString(numberLocale());

  async function share() {
    try {
      await Share.share({
        message: t('shareMessage', {
          id: identity!.publicId,
          coins: coins(reward),
          url: STORE_URL,
        }),
      });
    } catch {
      // Sharing is a convenience; the ID is on screen.
    }
  }

  async function link() {
    if (busy || !referralRepository) return;
    setBusy(true);
    setError(null);
    try {
      const next = await referralRepository.setReferrer(code.trim());
      if (alive.current) {
        setData(next);
        setCode('');
      }
      await refreshWallet();
    } catch (e) {
      if (alive.current) setError(message(e));
    } finally {
      if (alive.current) setBusy(false);
    }
  }

  return (
    <Card>
      <Label color={theme.accentText}>{t('label')}</Label>
      <Text style={shared.sectionTitle}>{t('title', { coins: coins(reward) })}</Text>
      <Body>{t('body', { coins: coins(reward) })}</Body>
      <Text style={[shared.small, { color: ui.text, fontWeight: '800' }]}>
        {t('yourId', { id: identity.publicId })}
      </Text>
      {data && data.invited > 0 && (
        <Text style={shared.small}>
          {t('stats', { count: data.invited, coins: coins(data.invited * reward) })}
        </Text>
      )}
      <Button onPress={() => void share()}>{t('share')}</Button>

      {data?.inviter && (
        <Text style={[shared.small, { color: data.inviter.paid ? ui.green : ui.muted }]}>
          {data.inviter.paid
            ? t('enter.paid', { coins: coins(reward), username: data.inviter.username ?? '' })
            : t('enter.linked', { coins: coins(reward), username: data.inviter.username ?? '' })}
        </Text>
      )}
      {data?.canEnter && (
        <View style={s.enter}>
          <Text style={[shared.sectionTitle, { fontSize: 16 }]}>{t('enter.title')}</Text>
          <Text style={shared.small}>{t('enter.hint')}</Text>
          <View style={shared.row}>
            <TextInput
              accessibilityLabel={t('enter.a11y')}
              placeholder={t('enter.placeholder')}
              placeholderTextColor={ui.subtle}
              keyboardType="number-pad"
              maxLength={8}
              value={code}
              onChangeText={(v) => setCode(v.replace(/\D/g, ''))}
              style={[s.input, { color: ui.text, borderColor: ui.border }]}
            />
            <Button compact disabled={busy || code.length !== 8} onPress={() => void link()}>
              {busy ? t('enter.linking') : t('enter.button')}
            </Button>
          </View>
          {error && (
            <Text accessibilityLiveRegion="polite" style={shared.error}>
              {error}
            </Text>
          )}
        </View>
      )}
    </Card>
  );
}

const useStyles = makeStyles((ui) => ({
  enter: { gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: ui.line },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 2,
    backgroundColor: ui.fill,
  },
}));
