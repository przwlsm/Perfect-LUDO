import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { levelInfo } from '@/domain';
import { getCosmetic } from '@/domain/cosmetics/catalog';
import { INITIAL_PROFILE } from '@/application/store/ProfileService';
import { useCatalogText } from '../i18n/useCatalogText';
import { useAuthSession } from '../state/useAuthSession';
import { Text } from '../components/AppText';
import { Body, Button, Card, Label, Screen, shared } from '../components/Kit';
import { CoinIcon, GemIcon } from '../components/Currency';
import { Dice } from '../components/Dice';
import { ProgressBar } from '../components/Progress';
import { useProfile } from '../state/ProfileProvider';
import { SocialIdentityCard } from '../social/SocialIdentityCard';
import { ui } from '../theme/themes';
import { numberLocale } from '../i18n/format';

export default function ProfileScreen() {
  const { profile, theme, syncWarning, reload, member, wallet, refreshWallet } = useProfile();
  const { t } = useTranslation(['account', 'common']);
  const { cosmeticName } = useCatalogText();
  const auth = useAuthSession();
  const level = levelInfo(profile.xp);
  const winRate = profile.games ? Math.round((profile.wins / profile.games) * 100) : 0;
  return (
    <Screen title={t('profile.title')} subtitle={t('profile.subtitle')}>
      {/* ---- Who you are ---- */}
      <View style={[s.hero, { borderColor: `${theme.accent}55` }]}>
        <LinearGradient
          colors={[`${theme.accent}26`, `${theme.accent}0d`, '#00000000']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.heroInner}
        >
          <View style={shared.row}>
            <View
              style={[
                s.avatar,
                { backgroundColor: `${theme.accent}22`, borderColor: `${theme.accent}66` },
              ]}
            >
              <Text style={{ fontSize: 44, color: theme.accent }}>♙</Text>
              {member && (
                <View style={[s.levelBadge, { backgroundColor: theme.accent }]}>
                  <Text style={s.levelBadgeText}>{level.level}</Text>
                </View>
              )}
            </View>
            <View style={{ gap: 6, flex: 1 }}>
              <Text style={{ fontSize: 26, fontWeight: '900', color: ui.text }}>
                {profile.name === INITIAL_PROFILE.name
                  ? t('common:defaultPlayerName')
                  : profile.name}
              </Text>
              <Label color={theme.accent}>
                {profile.wins >= 25
                  ? t('profile.rank.champion')
                  : profile.wins >= 5
                    ? t('profile.rank.regular')
                    : t('profile.rank.welcome')}
              </Label>
            </View>
          </View>
          {member && (
            <View style={{ gap: 6 }}>
              <ProgressBar value={level.into / level.need} height={9} />
              <View style={shared.between}>
                <Text style={shared.small}>{t('profile.level', { level: level.level })}</Text>
                <Text style={shared.small}>
                  {t('profile.xpToNext', {
                    into: level.into,
                    need: level.need,
                    next: level.level + 1,
                  })}
                </Text>
              </View>
            </View>
          )}
          <Button secondary compact onPress={() => router.push('/settings')}>
            {t('profile.edit')}
          </Button>
        </LinearGradient>
      </View>

      <SocialIdentityCard />

      {/* ---- The record ---- */}
      <View style={shared.row}>
        <Stat
          icon="game-controller"
          label={t('profile.stats.played')}
          value={profile.games}
          accent={theme.accent}
        />
        <Stat icon="trophy" label={t('profile.stats.wins')} value={profile.wins} accent={ui.gold} />
        <Stat
          icon="stats-chart"
          label={t('profile.stats.winRate')}
          value={`${winRate}%`}
          accent={ui.green}
        />
      </View>
      <View style={shared.row}>
        <Stat
          icon="flame"
          label={t('profile.stats.winStreak')}
          value={profile.streak}
          accent="#ff8c5a"
        />
        <Stat
          icon="star"
          label={t('profile.stats.bestStreak')}
          value={profile.bestStreak}
          accent={ui.blueSoft}
        />
      </View>
      <Text style={shared.small}>
        {member ? t('profile.recordMember') : t('profile.recordDevice')}
      </Text>

      {/* ---- The wallet ---- */}
      {member && (
        <Card>
          <View style={shared.between}>
            <Label color={theme.accent}>{t('profile.balance.label')}</Label>
            <Button secondary compact onPress={() => router.push('/store')}>
              {t('profile.balance.openStore')}
            </Button>
          </View>
          <View style={[shared.row, { gap: 18 }]}>
            <View style={s.balance}>
              <CoinIcon size={24} />
              <Text style={s.balanceText}>
                {wallet === 'ready' ? profile.coins.toLocaleString(numberLocale()) : '—'}
              </Text>
            </View>
            <View style={s.balance}>
              <GemIcon size={22} />
              <Text style={s.balanceText}>
                {wallet === 'ready' ? profile.gems.toLocaleString(numberLocale()) : '—'}
              </Text>
            </View>
          </View>
          {wallet !== 'ready' ? (
            <>
              <Text accessibilityLiveRegion="polite" style={shared.error}>
                {t('profile.balance.loadFailed')}
              </Text>
              <Button secondary compact onPress={() => void refreshWallet()}>
                {t('profile.balance.reload')}
              </Button>
            </>
          ) : profile.pendingRewards.length > 0 ? (
            <Text style={shared.small}>
              {t('profile.balance.pending', { count: profile.pendingRewards.length })}
            </Text>
          ) : (
            <Text style={shared.small}>{t('profile.balance.kept')}</Text>
          )}
        </Card>
      )}

      {/* Guests get their offer in the identity card above; this one is for accounts. */}
      {!auth.user?.isGuest && (
        <Card>
          <Label color={theme.accent}>{t('profile.account.label')}</Label>
          {syncWarning && (
            <>
              <Text accessibilityLiveRegion="polite" style={shared.error}>
                {syncWarning}
              </Text>
              <Button secondary compact onPress={() => void reload()}>
                {t('shared.retrySync')}
              </Button>
            </>
          )}
          <Body>
            {auth.user ? t('profile.account.memberBody') : t('profile.account.signedOutBody')}
          </Body>
          <Button secondary compact onPress={() => router.push('/login')}>
            {auth.user ? t('profile.account.manage') : t('profile.account.signIn')}
          </Button>
        </Card>
      )}

      {/* ---- The look ---- */}
      <Card>
        <Label color={theme.accent}>{t('profile.look.label')}</Label>
        <View style={shared.between}>
          <View style={{ gap: 9, flex: 1 }}>
            <Text style={shared.sectionTitle}>{cosmeticName(getCosmetic(profile.board))}</Text>
            <Text style={shared.small}>
              {t(profile.board3d ? 'profile.look.view3d' : 'profile.look.view2d', {
                dice: cosmeticName(getCosmetic(profile.dice)),
              })}
            </Text>
            <View style={[shared.row, { flexWrap: 'wrap' }]}>
              {Object.values(theme.colors).map((color) => (
                <View
                  key={color}
                  style={{ width: 22, height: 22, borderRadius: 7, backgroundColor: color }}
                />
              ))}
            </View>
          </View>
          <Dice value={5} finish={profile.dice} />
        </View>
        <Button secondary compact onPress={() => router.push('/store')}>
          {t('profile.look.explore', { items: profile.owned.length })}
        </Button>
      </Card>

      <Card>
        <Label color={theme.accent}>{t('profile.tips.label')}</Label>
        <Text style={shared.sectionTitle}>{t('profile.tips.title')}</Text>
        <Body>{t('profile.tips.body')}</Body>
      </Card>
      <Card>
        <Label color={theme.accent}>{t('profile.feedback.label')}</Label>
        <Text style={shared.sectionTitle}>{t('profile.feedback.title')}</Text>
        <Body>{t('profile.feedback.body')}</Body>
        <Button secondary compact onPress={() => router.push('/feedback')}>
          {t('profile.feedback.button')}
        </Button>
      </Card>
    </Screen>
  );
}

function Stat({
  icon,
  label,
  value,
  accent,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number | string;
  accent: string;
}) {
  return (
    <Card style={s.stat}>
      <View style={[s.statIcon, { backgroundColor: `${accent}1f` }]}>
        <Ionicons name={icon} size={16} color={accent} />
      </View>
      <Text style={{ color: ui.text, fontSize: 24, fontWeight: '900' }}>{value}</Text>
      <Text style={shared.small}>{label}</Text>
    </Card>
  );
}

const s = StyleSheet.create({
  hero: { borderRadius: 22, overflow: 'hidden', borderWidth: 1.5 },
  heroInner: { padding: 16, gap: 14 },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  levelBadge: {
    position: 'absolute',
    right: -7,
    bottom: -7,
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0e1322',
  },
  levelBadgeText: { color: '#1d2030', fontWeight: '900', fontSize: 12 },
  stat: { flex: 1, padding: 12, alignItems: 'center', gap: 4 },
  statIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balance: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  balanceText: { color: ui.text, fontSize: 26, fontWeight: '900' },
});
