import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { getCup, type CupHall } from '@/domain';
import { Text, TextInput } from '../components/AppText';
import { CoinIcon } from '../components/Currency';
import { Body, Button, Card, Label, Screen, useShared } from '../components/Kit';
import { LudoLoader } from '../components/LudoLoader';
import { ThroneArt } from '../collection/ThroneArt';
import { useCups } from '../hooks/useCups';
import { useMotionEnabled } from '../hooks/useMotionEnabled';
import { useProfile } from '../state/ProfileProvider';
import { makeStyles, useUi } from '../theme/AppearanceProvider';
import { liftByDay } from '../theme/surfaces';
import { numberLocale } from '../i18n/format';

/**
 * The Royal Road: eight halls, each a four-player knockout for coins and a
 * throne. Entering pays the hall's entry and opens the bracket.
 */
export default function CupsScreen() {
  const { member, profile, theme } = useProfile();
  const { t } = useTranslation(['cups', 'collection', 'common']);
  const cups = useCups();
  const s = useStyles();
  const ui = useUi();
  const shared = useShared();
  const motion = useMotionEnabled(profile.reducedMotion, true);
  const [code, setCode] = useState('');

  if (!member)
    return (
      <Screen back title={t('title')} subtitle={t('subtitle')}>
        <Card>
          <Text style={shared.sectionTitle}>{t('signIn.title')}</Text>
          <Body>{t('signIn.body')}</Body>
          <Button onPress={() => router.push('/login')}>{t('signIn.button')}</Button>
        </Card>
      </Screen>
    );

  const data = cups.data;
  const openBracket = (id: string) => router.push({ pathname: '/cups/[id]', params: { id } });
  const fmt = (n: number) => n.toLocaleString(numberLocale());

  async function enter(hall: CupHall) {
    const bracket = await cups.join(hall.id);
    if (bracket) openBracket(bracket.id);
  }
  async function withFriends(hall: CupHall) {
    const bracket = await cups.createPrivate(hall.id);
    if (bracket) openBracket(bracket.id);
  }
  async function joinByCode() {
    const bracket = await cups.joinByCode(code);
    if (bracket) {
      setCode('');
      openBracket(bracket.id);
    }
  }

  return (
    <Screen back title={t('title')} subtitle={t('subtitle')}>
      <Body>{t('intro')}</Body>
      {!data ? (
        cups.error ? (
          <Card>
            <Text accessibilityLiveRegion="polite" style={shared.error}>
              {cups.error}
            </Text>
            <Button secondary compact onPress={() => void cups.reload()}>
              {t('common:actions.retry')}
            </Button>
          </Card>
        ) : (
          <LudoLoader motionEnabled={motion} />
        )
      ) : (
        <>
          {data.activeBracket && (
            <Card style={{ borderColor: `${theme.accent}66` }}>
              <Button onPress={() => openBracket(data.activeBracket!)}>{t('hall.continue')}</Button>
            </Card>
          )}
          {cups.error && (
            <Text accessibilityLiveRegion="polite" style={shared.error}>
              {cups.error}
            </Text>
          )}
          {!data.activeBracket && (
            <Card>
              <Label color={theme.accentText}>{t('private.codeTitle')}</Label>
              <View style={shared.row}>
                <TextInput
                  accessibilityLabel={t('private.codePlaceholder')}
                  placeholder={t('private.codePlaceholder')}
                  placeholderTextColor={ui.subtle}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={6}
                  value={code}
                  onChangeText={(v) => setCode(v.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  style={[s.codeInput, { color: ui.text, borderColor: ui.border }]}
                />
                <Button
                  compact
                  disabled={code.length !== 6 || cups.busy !== null}
                  onPress={() => void joinByCode()}
                >
                  {cups.busy === 'code' ? t('hall.entering') : t('private.codeButton')}
                </Button>
              </View>
            </Card>
          )}
          {data.cups.map((hall) => {
            const def = getCup(hall.id);
            if (!def) return null;
            const short = profile.coins < hall.entry;
            const busy = cups.busy === hall.id;
            return (
              <Card key={hall.id} style={s.hall}>
                <View style={shared.row}>
                  <ThroneArt
                    cup={def}
                    won={hall.won > 0}
                    size={64}
                    shine={motion && hall.won > 0}
                  />
                  <View style={{ flex: 1, gap: 4 }}>
                    <Label color={theme.accentText}>{t(`collection:halls.${def.id}`)}</Label>
                    <Text style={shared.sectionTitle}>{t(`collection:throneNames.${def.id}`)}</Text>
                    <Text style={shared.small}>{t(`hall.mode.${def.variant}`)}</Text>
                    {hall.won > 0 && (
                      <Text style={[shared.small, { color: ui.gold, fontWeight: '800' }]}>
                        {t('hall.won', { count: hall.won })}
                      </Text>
                    )}
                  </View>
                </View>
                <View style={s.pills}>
                  <View style={s.pill}>
                    <Ionicons name="enter" size={13} color={ui.muted} />
                    <Text style={s.pillText}>
                      {hall.entry === 0
                        ? t('hall.free')
                        : t('hall.entry', { coins: fmt(hall.entry) })}
                    </Text>
                  </View>
                  <View style={[s.pill, { borderColor: `${ui.gold}66` }]}>
                    <CoinIcon size={13} />
                    <Text style={[s.pillText, { color: ui.gold }]}>
                      {t('hall.prize', { coins: fmt(hall.prize) })}
                    </Text>
                  </View>
                  <View style={s.pill}>
                    <Text style={s.pillText}>
                      {t('hall.runnerUp', { coins: fmt(hall.runnerUp) })}
                    </Text>
                  </View>
                  {hall.waiting > 0 && (
                    <View style={s.pill}>
                      <Ionicons name="people" size={13} color={ui.green} />
                      <Text style={[s.pillText, { color: ui.green }]}>
                        {t('hall.waiting', { count: hall.waiting })}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={shared.row}>
                  <View style={{ flex: 1 }}>
                    <Button
                      disabled={short || busy || cups.busy !== null || data.activeBracket !== null}
                      onPress={() => void enter(hall)}
                    >
                      {busy
                        ? t('hall.entering')
                        : short
                          ? t('hall.short', { coins: fmt(hall.entry - profile.coins) })
                          : t('hall.enter')}
                    </Button>
                  </View>
                  <Button
                    secondary
                    fit
                    disabled={short || cups.busy !== null || data.activeBracket !== null}
                    onPress={() => void withFriends(hall)}
                  >
                    {cups.busy === `private:${hall.id}` ? t('hall.entering') : t('private.button')}
                  </Button>
                </View>
              </Card>
            );
          })}
          <Text style={shared.small}>
            {t('botCap', { cap: data.botPrizeCap, used: data.botPaidToday })}
          </Text>
          <Text style={shared.small}>{t('private.potRule')}</Text>
        </>
      )}
    </Screen>
  );
}

const useStyles = makeStyles((ui) => ({
  hall: { gap: 12, boxShadow: liftByDay(ui) },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: ui.border,
    backgroundColor: ui.fill,
  },
  pillText: { color: ui.muted, fontSize: 12, fontWeight: '700' },
  codeInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 3,
    backgroundColor: ui.fill,
  },
}));
