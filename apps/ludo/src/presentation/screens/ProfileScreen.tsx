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
import { Body, Button, Card, Label, Screen, useShared } from '../components/Kit';
import { CoinIcon, GemIcon } from '../components/Currency';
import { Dice } from '../components/Dice';
import { ProgressBar } from '../components/Progress';
import { useProfile } from '../state/ProfileProvider';
import { SocialIdentityCard } from '../social/SocialIdentityCard';
import { makeStyles, SchemeScope, useUi } from '../theme/AppearanceProvider';
import { DARK } from '../theme/palette';
import { readableOn } from '../theme/color';
import { iconTile, liftByDay, MARIGOLD, NAVY_HERO } from '../theme/surfaces';
import { numberLocale } from '../i18n/format';

/**
 * The win-streak flame, game art in both modes: a soft tint by night, a solid
 * coral tile with a navy icon on the marigold card by day.
 */
const FLAME = '#ff8c5a';

export default function ProfileScreen() {
  const { profile, theme, syncWarning, reload, member, wallet, refreshWallet } = useProfile();
  const { t } = useTranslation(['account', 'common']);
  const { cosmeticName } = useCatalogText();
  const auth = useAuthSession();
  const s = useStyles();
  const ui = useUi();
  const shared = useShared();
  const night = ui.scheme === 'dark';
  const winRate = profile.games ? Math.round((profile.wins / profile.games) * 100) : 0;
  return (
    <Screen title={t('profile.title')} subtitle={t('profile.subtitle')}>
      {/* ---- Who you are ---- */}
      {/* By day a navy island (the 30% of 60-30-10): its content renders in the
          night palette. By night it is the accent-tinted card as before. */}
      <View style={[s.hero, { borderColor: `${theme.accent}55` }]}>
        <LinearGradient
          colors={
            night ? [`${theme.accent}26`, `${theme.accent}0d`, `${theme.accent}00`] : NAVY_HERO
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.heroInner}
        >
          <SchemeScope scheme="dark">
            <ProfileHero day={!night} />
          </SchemeScope>
        </LinearGradient>
      </View>

      <SocialIdentityCard />

      {/* ---- The record ---- */}
      <View style={shared.row}>
        <Stat
          icon="game-controller"
          label={t('profile.stats.played')}
          value={profile.games}
          accent={night ? theme.accentText : DARK.blue}
        />
        <Stat
          icon="trophy"
          label={t('profile.stats.wins')}
          value={profile.wins}
          accent={night ? ui.gold : DARK.gold}
        />
        <Stat
          icon="stats-chart"
          label={t('profile.stats.winRate')}
          value={`${winRate}%`}
          accent={night ? ui.green : DARK.green}
        />
      </View>
      <View style={shared.row}>
        {/* The win streak is the screen's one marigold highlight by day (the 10%). */}
        <Stat
          icon="flame"
          label={t('profile.stats.winStreak')}
          value={profile.streak}
          accent={FLAME}
          highlight={!night}
        />
        <Stat
          icon="star"
          label={t('profile.stats.bestStreak')}
          value={profile.bestStreak}
          accent={night ? ui.blueSoft : DARK.gem}
        />
      </View>
      <Text style={shared.small}>
        {member ? t('profile.recordMember') : t('profile.recordDevice')}
      </Text>

      {/* ---- The wallet ---- */}
      {member && (
        <Card>
          <View style={shared.between}>
            <Label color={theme.accentText}>{t('profile.balance.label')}</Label>
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
          <Label color={theme.accentText}>{t('profile.account.label')}</Label>
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
        <Label color={theme.accentText}>{t('profile.look.label')}</Label>
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
        <Label color={theme.accentText}>{t('profile.tips.label')}</Label>
        <Text style={shared.sectionTitle}>{t('profile.tips.title')}</Text>
        <Body>{t('profile.tips.body')}</Body>
      </Card>
      <Card>
        <Label color={theme.accentText}>{t('profile.feedback.label')}</Label>
        <Text style={shared.sectionTitle}>{t('profile.feedback.title')}</Text>
        <Body>{t('profile.feedback.body')}</Body>
        <Button secondary compact onPress={() => router.push('/feedback')}>
          {t('profile.feedback.button')}
        </Button>
      </Card>
    </Screen>
  );
}

/**
 * Avatar, name, rank, level and the edit button. Rendered inside
 * `<SchemeScope scheme="dark">`, so its hooks read the night tokens: by night
 * that is the app's own palette, by day it is the navy hero's.
 */
function ProfileHero({ day }: { day: boolean }) {
  const { profile, theme, member } = useProfile();
  const { t } = useTranslation(['account', 'common']);
  const s = useStyles();
  const ui = useUi();
  const shared = useShared();
  const level = levelInfo(profile.xp);
  // The day theme's accentText is tuned for white; on the navy hero the accent
  // is lifted to 4.5:1 against every stop of the gradient instead.
  const accentText = day ? readableOn(theme.accent, NAVY_HERO) : theme.accentText;
  return (
    <>
      <View style={shared.row}>
        <View
          style={[
            s.avatar,
            { backgroundColor: `${theme.accent}22`, borderColor: `${theme.accent}66` },
          ]}
        >
          <Text style={{ fontSize: 44, color: accentText }}>♙</Text>
          {member && (
            <View
              style={[
                s.levelBadge,
                {
                  backgroundColor: theme.accent,
                  borderColor: day ? NAVY_HERO[0] : theme.background,
                },
              ]}
            >
              <Text style={s.levelBadgeText}>{level.level}</Text>
            </View>
          )}
        </View>
        <View style={{ gap: 6, flex: 1 }}>
          <Text style={{ fontSize: 26, fontWeight: '900', color: ui.text }}>
            {profile.name === INITIAL_PROFILE.name ? t('common:defaultPlayerName') : profile.name}
          </Text>
          <Label color={accentText}>
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
    </>
  );
}

function Stat({
  icon,
  label,
  value,
  accent,
  highlight = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number | string;
  accent: string;
  /** Day only: the marigold celebratory card. */
  highlight?: boolean;
}) {
  const s = useStyles();
  const ui = useUi();
  const shared = useShared();
  // Night keeps its soft tint; day gets a solid tile in the vivid game hue.
  const tile =
    ui.scheme === 'dark' ? { background: `${accent}1f`, icon: accent } : iconTile(accent, ui);
  return (
    <Card style={highlight ? StyleSheet.flatten([s.stat, s.statHot]) : s.stat}>
      {highlight && (
        <LinearGradient
          colors={MARIGOLD}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      <View style={[s.statIcon, { backgroundColor: tile.background }]}>
        <Ionicons name={icon} size={16} color={tile.icon} />
      </View>
      <Text style={{ color: ui.text, fontSize: 24, fontWeight: '900' }}>{value}</Text>
      <Text style={shared.small}>{label}</Text>
    </Card>
  );
}

const useStyles = makeStyles((ui) => ({
  hero: { borderRadius: 22, overflow: 'hidden', borderWidth: 1.5, boxShadow: liftByDay(ui) },
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
  },
  levelBadgeText: { color: '#1d2030', fontWeight: '900', fontSize: 12 },
  stat: { flex: 1, padding: 12, alignItems: 'center', gap: 4 },
  // Marigold by day: navy text reads on it at 10:1, muted at 5.7:1.
  statHot: { overflow: 'hidden', borderColor: `${ui.gold}55`, boxShadow: liftByDay(ui) },
  statIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balance: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  balanceText: { color: ui.text, fontSize: 26, fontWeight: '900' },
}));
