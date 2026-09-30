import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { levelInfo } from '@/domain';
import { getCosmetic } from '@/domain/cosmetics/catalog';
import { useAuthSession } from '../state/useAuthSession';
import { Text } from '../components/AppText';
import { Body, Button, Card, Label, Screen, shared } from '../components/Kit';
import { CoinIcon, GemIcon } from '../components/Currency';
import { Dice } from '../components/Dice';
import { ProgressBar } from '../components/Progress';
import { useProfile } from '../state/ProfileProvider';
import { SocialIdentityCard } from '../social/SocialIdentityCard';
import { ui } from '../theme/themes';

export default function ProfileScreen() {
  const { profile, theme, syncWarning, reload, member, wallet, refreshWallet } = useProfile();
  const auth = useAuthSession();
  const level = levelInfo(profile.xp);
  const winRate = profile.games ? Math.round((profile.wins / profile.games) * 100) : 0;
  return (
    <Screen title="Your corner of the club." subtitle="PLAYER PROFILE">
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
                {profile.name}
              </Text>
              <Label color={theme.accent}>
                {profile.wins >= 25
                  ? 'CLUB CHAMPION'
                  : profile.wins >= 5
                    ? 'TABLE REGULAR'
                    : 'WELCOME TO THE CLUB'}
              </Label>
            </View>
          </View>
          {member && (
            <View style={{ gap: 6 }}>
              <ProgressBar value={level.into / level.need} height={9} />
              <View style={shared.between}>
                <Text style={shared.small}>Level {level.level}</Text>
                <Text style={shared.small}>
                  {level.into} / {level.need} XP to level {level.level + 1}
                </Text>
              </View>
            </View>
          )}
          <Button secondary compact onPress={() => router.push('/settings')}>
            Edit profile
          </Button>
        </LinearGradient>
      </View>

      <SocialIdentityCard />

      {/* ---- The record ---- */}
      <View style={shared.row}>
        <Stat icon="game-controller" label="Played" value={profile.games} accent={theme.accent} />
        <Stat icon="trophy" label="Wins" value={profile.wins} accent={ui.gold} />
        <Stat icon="stats-chart" label="Win rate" value={`${winRate}%`} accent={ui.green} />
      </View>
      <View style={shared.row}>
        <Stat icon="flame" label="Win streak" value={profile.streak} accent="#ff8c5a" />
        <Stat icon="star" label="Best streak" value={profile.bestStreak} accent={ui.blueSoft} />
      </View>
      <Text style={shared.small}>
        {member
          ? 'Completed matches on your account. In pass & play, wins track the red seat.'
          : 'Completed matches on this device. In pass & play, wins track the red seat.'}
      </Text>

      {/* ---- The wallet ---- */}
      {member && (
        <Card>
          <View style={shared.between}>
            <Label color={theme.accent}>YOUR BALANCE</Label>
            <Button secondary compact onPress={() => router.push('/store')}>
              Open store
            </Button>
          </View>
          <View style={[shared.row, { gap: 18 }]}>
            <View style={s.balance}>
              <CoinIcon size={24} />
              <Text style={s.balanceText}>
                {wallet === 'ready' ? profile.coins.toLocaleString() : '—'}
              </Text>
            </View>
            <View style={s.balance}>
              <GemIcon size={22} />
              <Text style={s.balanceText}>
                {wallet === 'ready' ? profile.gems.toLocaleString() : '—'}
              </Text>
            </View>
          </View>
          {wallet !== 'ready' ? (
            <>
              <Text accessibilityLiveRegion="polite" style={shared.error}>
                Your coins could not be loaded from your account. Spending is paused until they are.
              </Text>
              <Button secondary compact onPress={() => void refreshWallet()}>
                Reload coins
              </Button>
            </>
          ) : profile.pendingRewards.length > 0 ? (
            <Text style={shared.small}>
              {profile.pendingRewards.length} finished game
              {profile.pendingRewards.length === 1 ? '' : 's'} still waiting to be paid. They will
              be added the next time your account answers.
            </Text>
          ) : (
            <Text style={shared.small}>
              Kept on your account, so they follow you to any device.
            </Text>
          )}
        </Card>
      )}

      {/* Guests get their offer in the identity card above; this one is for accounts. */}
      {!auth.user?.isGuest && (
        <Card>
          <Label color={theme.accent}>ACCOUNT</Label>
          {syncWarning && (
            <>
              <Text accessibilityLiveRegion="polite" style={shared.error}>
                {syncWarning}
              </Text>
              <Button secondary compact onPress={() => void reload()}>
                Retry cloud sync
              </Button>
            </>
          )}
          <Body>
            {auth.user
              ? 'Your coins, collection and statistics are kept on your account.'
              : 'Sign in to play with friends and to earn, keep and spend coins. Coins and unlocked looks live on your account, not on this device.'}
          </Body>
          <Button secondary compact onPress={() => router.push('/login')}>
            {auth.user ? 'Manage account' : 'Sign in or create an account'}
          </Button>
        </Card>
      )}

      {/* ---- The look ---- */}
      <Card>
        <Label color={theme.accent}>YOUR SIGNATURE LOOK</Label>
        <View style={shared.between}>
          <View style={{ gap: 9, flex: 1 }}>
            <Text style={shared.sectionTitle}>{getCosmetic(profile.board).name}</Text>
            <Text style={shared.small}>
              {getCosmetic(profile.dice).name} · {profile.board3d ? '3D' : '2D'} view
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
          Explore your collection · {profile.owned.length} items
        </Button>
      </Card>

      <Card>
        <Label color={theme.accent}>SMALL WINS ADD UP</Label>
        <Text style={shared.sectionTitle}>Play. Collect. Make it yours.</Text>
        <Body>
          Claim the daily calendar, spin the wheel, finish missions, and win online for the big
          payouts. Coins buy the looks; gems unlock the legendary ones.
        </Body>
      </Card>
      <Card>
        <Label color={theme.accent}>WE’RE LISTENING</Label>
        <Text style={shared.sectionTitle}>Found a bug? Have an idea?</Text>
        <Body>Tell us what’s working, what isn’t, and what you’d like to see next.</Body>
        <Button secondary compact onPress={() => router.push('/feedback')}>
          Send feedback
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
