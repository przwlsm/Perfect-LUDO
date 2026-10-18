import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { CUPS, getCup, type CupHall } from '@/domain';
import { Text, TextInput } from '../components/AppText';
import { Body, Button, Card, Label, Screen, useShared } from '../components/Kit';
import { LudoLoader } from '../components/LudoLoader';
import { HallCard } from '../collection/HallCard';
import { RoyalRoadScene } from '../collection/RoyalRoadCard';
import { useCupGameLength } from '../hooks/useCupGameLength';
import { useCups } from '../hooks/useCups';
import { useMotionEnabled } from '../hooks/useMotionEnabled';
import { useProfile } from '../state/ProfileProvider';
import { makeStyles, useUi } from '../theme/AppearanceProvider';
import { liftByDay } from '../theme/surfaces';

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
  const cupTime = useCupGameLength(member);

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
      {/* The Royal Road banner: the same night scene as the card that led here. */}
      <View style={s.banner}>
        <RoyalRoadScene motion={motion} />
        <View style={s.bannerLabel}>
          <Ionicons name="ribbon" size={12} color="#ffd76a" />
          <Text style={s.bannerLabelText}>{t('card.label', { n: CUPS.length })}</Text>
        </View>
        <Text style={s.bannerText}>{t('intro')}</Text>
        <View style={s.chips}>
          <View style={[s.chip, s.chipGold]}>
            <Ionicons name="flash" size={13} color="#2b1600" />
            <Text style={[s.chipText, { color: '#2b1600' }]}>{t('card.mode')}</Text>
          </View>
          <View style={s.chip}>
            <Ionicons name="time-outline" size={13} color="#fff" />
            <Text style={s.chipText}>{t('card.gameTime', { minutes: cupTime.game })}</Text>
          </View>
          <View style={s.chip}>
            <Ionicons name="trophy-outline" size={13} color="#fff" />
            <Text style={s.chipText}>{t('card.cupTime', { minutes: cupTime.cup })}</Text>
          </View>
        </View>
      </View>
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
            return (
              <HallCard
                key={hall.id}
                cup={def}
                hall={hall}
                coins={profile.coins}
                busy={cups.busy}
                locked={data.activeBracket !== null}
                motion={motion}
                onEnter={() => void enter(hall)}
                onFriends={() => void withFriends(hall)}
              />
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
  banner: {
    borderRadius: 22,
    overflow: 'hidden',
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: '#ffd76a55',
    backgroundColor: '#160b3d',
    boxShadow: liftByDay(ui),
  },
  bannerLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#ffd76a66',
    backgroundColor: '#00000033',
  },
  bannerLabelText: { color: '#ffd76a', fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  bannerText: {
    color: '#f3e8ff',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    maxWidth: '78%',
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#ffffff1f',
    borderWidth: 1,
    borderColor: '#ffffff2e',
  },
  chipGold: { backgroundColor: '#ffd76a', borderColor: '#ffd76a' },
  chipText: { color: '#fff', fontSize: 12, fontWeight: '800' },
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
