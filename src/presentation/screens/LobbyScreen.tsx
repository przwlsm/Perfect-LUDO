import { useCallback, useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { Text, TextInput } from '../components/AppText';
import { router, useFocusEffect, useIsFocused } from 'expo-router';
import { Trans, useTranslation } from 'react-i18next';
import {
  levelInfo,
  REWARDS,
  SEASON_TIER_XP,
  SEASON_TIERS,
  seatColors,
  SPIN_SLOTS,
  type GameVariant,
} from '@/domain';
import { VariantPicker } from '../components/VariantPicker';
import { matchRepository } from '@/config/container';
import {
  cleanSeatNames,
  SEAT_NAME_MAX,
  type MatchMode,
  type SavedMatch,
} from '@/application/session/MatchRepository';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ProgressBar, RewardChips, timeLeft } from '../components/Progress';
import { useRewards, useTournament } from '../hooks/useRewards';
import { useMotionEnabled } from '../hooks/useMotionEnabled';
import { Bob, LiveDot, Pulse, Shine, Spin } from '../components/Live';
import { UserAvatar } from '../social/UserAvatar';
import { useSocial } from '../state/SocialProvider';
import { ConnectionPill } from '../components/ConnectionPill';
import { GuestAdOffer } from '../components/GuestAdOffer';
import { Body, Button, Card, Label, Screen, Sheet, useShared } from '../components/Kit';
import { useConnectivity } from '../state/ConnectivityProvider';
import { useProfile } from '../state/ProfileProvider';
import { makeStyles, SchemeScope, useUi } from '../theme/AppearanceProvider';
import { DARK, type Palette } from '../theme/palette';
import { iconTile, liftByDay, MARIGOLD, NAVY_HERO, pillColors } from '../theme/surfaces';
import { useCatalogText } from '../i18n/useCatalogText';
import { numberLocale } from '../i18n/format';
import { mirrorInRtl } from '../i18n/rtl';

export default function LobbyScreen() {
  const { profile, theme, member } = useProfile();
  const s = useStyles();
  const ui = useUi();
  const shared = useShared();
  const night = ui.scheme === 'dark';
  // The computer section's red: as text it needs a deeper red by day.
  const computerRed = night ? '#f87171' : ui.danger;
  const storeViolet = night ? '#ad8efa' : ui.violet;
  const connectivity = useConnectivity();
  const [mode, setMode] = useState<MatchMode | null>(null);
  const [players, setPlayers] = useState<2 | 3 | 4 | 5 | 6 | 7 | 8>(4);
  const [difficulty, setDifficulty] = useState<'easy' | 'smart'>('smart');
  const [teams, setTeams] = useState(false);
  const [variant, setVariant] = useState<GameVariant>('classic');
  // Pass & play names, kept while the sheet is reopened so nobody retypes them.
  const [names, setNames] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<SavedMatch | null>(null);
  const { t } = useTranslation('home');
  const { variantTitle } = useCatalogText();
  // A server message as written, or a key for the hard-coded fallback.
  const [message, setMessage] = useState<{ text: string } | { key: 'restoreFailed' } | null>(null);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      void matchRepository
        .load()
        .then((m) => {
          if (active) setSaved(m);
        })
        .catch((e: unknown) => {
          if (active)
            setMessage(e instanceof Error ? { text: e.message } : { key: 'restoreFailed' });
        });
      return () => {
        active = false;
      };
    }, []),
  );
  const rewards = useRewards();
  const tournament = useTournament();
  const { identity } = useSocial();
  const focused = useIsFocused();
  const motion = useMotionEnabled(profile.reducedMotion, focused);
  const [arenaSeats, setArenaSeats] = useState<2 | 4 | 'teams'>(2);
  const level = levelInfo(profile.xp);
  const freeSpin = member && rewards.data !== null && rewards.data.spinsToday === 0;
  const missions = rewards.data?.missions ?? [];
  const missionsReady = missions.filter((m) => m.progress >= m.target && !m.claimed).length;
  const season = rewards.data?.season ?? null;
  const online = connectivity.available && connectivity.online;
  const topTen = tournament.data?.top[9]?.points ?? tournament.data?.top.at(-1)?.points ?? 0;
  const myPoints = tournament.data?.me.points ?? 0;
  const openAi = (preset: { variant?: GameVariant; teams?: boolean } = {}) => {
    setVariant(preset.variant ?? 'classic');
    setTeams(preset.teams ?? false);
    setPlayers((p) => (preset.teams ? 4 : p));
    setMode('ai');
  };
  const needAccount = () => router.push({ pathname: '/login', params: { intent: 'store' } });

  return (
    <Screen>
      {/* Who you are and how far along */}
      <View style={s.profile}>
        <View>
          <UserAvatar
            id={identity?.id ?? 'me'}
            name={profile.name}
            emoji={identity?.avatar ?? null}
            size={52}
          />
          <View style={[s.onlineDot, { backgroundColor: theme.background }]}>
            <LiveDot color={online ? ui.green : ui.subtle} size={9} active={motion && online} />
          </View>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text numberOfLines={1} style={s.profileName}>
            {profile.name}
          </Text>
          {member ? (
            <>
              <View style={shared.row}>
                <Text style={s.levelTag}>{t('profile.levelTag', { level: level.level })}</Text>
                <Text style={s.levelTitle}>{t(`profile.titles.${levelTitle(level.level)}`)}</Text>
              </View>
              <ProgressBar value={level.into / level.need} height={6} />
            </>
          ) : (
            <Text style={shared.small}>{t('profile.guest')}</Text>
          )}
        </View>
        <ConnectionPill />
      </View>

      {/* Guests learn first thing that ads can fill their coin vault. */}
      {!member && <GuestAdOffer />}

      {/* Daily lucky spin */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={freeSpin ? t('spin.a11yReady') : t('spin.a11y')}
        onPress={() => (member ? router.push('/rewards') : needAccount())}
        android_ripple={{ color: ui.ripple }}
      >
        <LinearGradient
          colors={
            freeSpin ? (night ? SPIN_FREE.dark : SPIN_FREE.light) : night ? SPIN.dark : SPIN.light
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[s.spinCard, freeSpin && { borderColor: `${ui.gold}80` }]}
        >
          <Shine active={motion && Boolean(freeSpin)} width={360} />
          <View style={s.spinWheel}>
            <Spin active={motion} seconds={freeSpin ? 5 : 14}>
              <Text style={{ fontSize: 34 }}>🎡</Text>
            </Spin>
            {freeSpin && <Text style={s.freeBadge}>{t('spin.free')}</Text>}
          </View>
          <View style={{ flex: 1, gap: 5 }}>
            <Text style={s.cardTitle}>{t('spin.title')}</Text>
            <Text style={shared.small}>
              {member
                ? freeSpin
                  ? t('spin.winUpTo', { amount: MAX_SPIN.toLocaleString(numberLocale()) })
                  : t('spin.nextIn', { time: timeLeft(nextUtcMidnight()) })
                : t('spin.signIn')}
            </Text>
            {member && (
              <View style={[shared.row, { gap: 5 }]}>
                {Array.from({ length: 7 }, (_, i) => (
                  <View
                    key={i}
                    style={[
                      s.streakDot,
                      i < Math.min(profile.spinStreak, 7) && { backgroundColor: ui.gold },
                    ]}
                  />
                ))}
                <Text style={s.streakText}>
                  {t('spin.streak', { day: Math.min(profile.spinStreak, 7) })}
                </Text>
              </View>
            )}
          </View>
          <Pulse active={motion && Boolean(freeSpin)}>
            <View style={[s.spinButton, !freeSpin && { backgroundColor: ui.line }]}>
              <Text style={[s.spinButtonText, !freeSpin && { color: ui.muted }]}>
                {freeSpin
                  ? t('spin.spinButton')
                  : member
                    ? t('spin.openButton')
                    : t('spin.signInButton')}
              </Text>
            </View>
          </Pulse>
        </LinearGradient>
      </Pressable>

      {saved &&
        (saved.state.status === 'IN_PROGRESS' || !profile.rewardedMatches.includes(saved.id)) && (
          <Card style={{ borderColor: `${theme.accent}40` }}>
            <View style={shared.between}>
              <View style={{ flex: 1, gap: 5 }}>
                <Text style={shared.sectionTitle}>
                  {saved.state.status === 'FINISHED'
                    ? t('resume.resultReady')
                    : t('resume.tableWaiting')}
                </Text>
                <Text style={shared.small}>
                  {saved.options.mode === 'ai'
                    ? t('resume.ai', { count: saved.options.players })
                    : t('resume.local', { count: saved.options.players })}
                </Text>
              </View>
              <Button compact onPress={() => router.push('/game?resume=1')}>
                {saved.state.status === 'FINISHED' ? t('resume.viewResult') : t('resume.resume')}
              </Button>
            </View>
          </Card>
        )}

      {/* 1. Play online: real players, the biggest rewards */}
      <SectionHeader
        icon="globe"
        color={ui.green}
        title={t('online.title')}
        subtitle={t('online.subtitle')}
        right={
          <View style={[shared.row, { gap: 6, alignItems: 'center' }]}>
            <LiveDot color={online ? ui.green : ui.subtle} active={motion && online} />
            <Text style={[s.liveText, { color: online ? ui.green : ui.subtle }]}>
              {online ? t('online.live') : t('online.offline')}
            </Text>
          </View>
        }
      />
      {connectivity.available && (
        // A navy island on the day page (the 30% of 60-30-10): it renders in
        // the night palette, so its text and controls stay as at night.
        <SchemeScope scheme="dark">
          <QuickMatchHero
            day={!night}
            online={online}
            motion={motion}
            seats={arenaSeats}
            onSeats={setArenaSeats}
          />
        </SchemeScope>
      )}

      {/* Weekly tournament */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('tournament.a11y')}
        onPress={() => router.push('/tournament')}
        android_ripple={{ color: ui.ripple }}
      >
        <LinearGradient
          colors={night ? TOURNEY.dark : TOURNEY.light}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.tourney}
        >
          <Shine active={motion} every={4800} />
          <View style={s.tourneyIcon}>
            <Bob active={motion} distance={3}>
              <Text style={{ fontSize: 28 }}>🏆</Text>
            </Bob>
            <View style={s.liveBadge}>
              <LiveDot color={ui.onColor} size={5} active={motion} />
              <Text style={s.liveBadgeText}>{t('tournament.live')}</Text>
            </View>
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <View style={shared.between}>
              <Text style={s.cardTitle}>{t('tournament.title')}</Text>
              {tournament.data?.me.rank ? (
                <Text style={s.rankChip}>#{tournament.data.me.rank}</Text>
              ) : null}
            </View>
            <Text style={shared.small}>
              {t('tournament.prize', { time: timeLeft(nextWeekStart()) })}
            </Text>
            {member && tournament.data && (
              <>
                <ProgressBar
                  value={topTen > 0 ? myPoints / topTen : 0}
                  height={6}
                  colors={[ui.gold, '#f59e0b']}
                />
                <Text style={[s.tinyText, !night && { color: ui.muted }]}>
                  {topTen > 0
                    ? t('tournament.toTopTen', { points: myPoints, need: topTen })
                    : t('tournament.firstToScore', { points: myPoints })}
                </Text>
              </>
            )}
          </View>
          <Ionicons
            name="chevron-forward"
            style={mirrorInRtl}
            size={20}
            color={night ? ui.gold : ui.text}
          />
        </LinearGradient>
      </Pressable>

      {/* 2. Play with friends: a private room, one phone, or your friends list */}
      <SectionHeader
        icon="people"
        color={ui.gem}
        title={t('friends.title')}
        subtitle={t('friends.subtitle')}
      />
      <View style={s.grid}>
        <ModeCard
          icon="key"
          tones={MODE_TONES.party}
          accent={night ? ui.green : DARK.green}
          title={t('friends.party.title')}
          subtitle={t('friends.party.subtitle')}
          pill={t('friends.party.pill')}
          disabled={!online}
          lockedLabel={t('mode.needsInternet')}
          onPress={() => router.push({ pathname: '/online', params: { private: '1' } })}
        />
        <ModeCard
          icon="phone-portrait"
          tones={MODE_TONES.pass}
          accent={night ? ui.gem : DARK.gem}
          title={t('friends.pass.title')}
          subtitle={t('friends.pass.subtitle')}
          pill={t('friends.pass.pill')}
          onPress={() => setMode('local')}
        />
        <ModeCard
          icon="person-add"
          tones={MODE_TONES.challenge}
          accent={night ? ui.gold : DARK.gold}
          title={t('friends.challenge.title')}
          subtitle={t('friends.challenge.subtitle')}
          pill={member ? t('friends.challenge.pillMember') : t('friends.challenge.pillGuest')}
          disabled={!online}
          lockedLabel={t('mode.needsInternet')}
          onPress={() => router.push('/friends')}
        />
        <ModeCard
          icon="people-circle"
          tones={MODE_TONES.teamup}
          accent={night ? ui.gem : DARK.gem}
          title={t('friends.teamUp.title')}
          subtitle={t('friends.teamUp.subtitle')}
          pill={t('friends.teamUp.pill')}
          disabled={!online}
          lockedLabel={t('mode.needsInternet')}
          onPress={() => router.push({ pathname: '/online', params: { teamup: '1' } })}
        />
      </View>

      {/* 3. Play vs computer: offline, any time */}
      <SectionHeader
        icon="hardware-chip"
        color={computerRed}
        title={t('computer.title')}
        subtitle={t('computer.subtitle')}
      />
      <View style={s.grid}>
        <ModeCard
          icon="grid"
          tones={MODE_TONES.classic}
          accent={night ? computerRed : '#f87171'}
          title={t('computer.classic.title')}
          subtitle={t('computer.classic.subtitle')}
          pill={t('computer.classic.pill', { coins: REWARDS.bot.win.coins })}
          onPress={() => openAi()}
        />
        <ModeCard
          icon="flash"
          tones={MODE_TONES.quick}
          accent={night ? ui.gold : DARK.gold}
          title={variantTitle('quick1')}
          subtitle={t('computer.quick.subtitle')}
          pill={t('computer.quick.pill')}
          onPress={() => openAi({ variant: 'quick1' })}
        />
        <ModeCard
          icon="skull"
          tones={MODE_TONES.kill}
          accent="#f472b6"
          title={variantTitle('kill')}
          subtitle={t('computer.kill.subtitle')}
          pill={t('computer.kill.pill')}
          onPress={() => openAi({ variant: 'kill' })}
        />
        <ModeCard
          icon="people"
          tones={MODE_TONES.teams}
          accent={night ? ui.blueSoft : DARK.blue}
          title={t('computer.teams.title')}
          subtitle={t('computer.teams.subtitle')}
          pill={t('computer.teams.pill')}
          onPress={() => openAi({ teams: true })}
        />
      </View>

      {/* Your progress */}
      <SectionHeader
        icon="trending-up"
        color={ui.blueSoft}
        title={t('progress.title')}
        subtitle={t('progress.subtitle')}
      />
      {/* Season pass */}
      {member && season && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('progress.seasonA11y')}
          onPress={() => router.push('/rewards')}
          android_ripple={{ color: ui.ripple }}
        >
          <Card style={{ gap: 10 }}>
            <View style={[shared.row, { alignItems: 'center', gap: 12 }]}>
              <View style={s.tierBadge}>
                <Text style={s.tierText}>
                  {Math.min(SEASON_TIERS, Math.floor(season.xp / SEASON_TIER_XP))}
                </Text>
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <View style={shared.row}>
                  <Text style={s.cardTitle}>
                    {t('progress.seasonTitle', { number: season.number })}
                  </Text>
                  {season.premium && <Text style={s.proChip}>{t('progress.pro')}</Text>}
                </View>
                <Text style={shared.small}>
                  {t('progress.seasonNext', {
                    xp: SEASON_TIER_XP - (season.xp % SEASON_TIER_XP),
                    time: timeLeft(season.endsAt),
                  })}
                </Text>
              </View>
            </View>
            <ProgressBar value={(season.xp % SEASON_TIER_XP) / SEASON_TIER_XP} height={7} />
          </Card>
        </Pressable>
      )}

      {/* Today's missions, claimable right here */}
      {member && missions.length > 0 && (
        <View style={{ gap: 10 }}>
          <View style={shared.between}>
            <Text style={s.section}>{t('missions.title')}</Text>
            <Text style={[s.liveText, { color: missionsReady ? ui.green : ui.subtle }]}>
              {missionsReady
                ? t('missions.ready', { count: missionsReady })
                : t('missions.resetsIn', { time: timeLeft(nextUtcMidnight()).toUpperCase() })}
            </Text>
          </View>
          {missions.map((m) => {
            const done = m.progress >= m.target;
            return (
              <View
                key={m.id}
                style={[s.mission, done && !m.claimed && { borderColor: `${ui.green}66` }]}
              >
                <View style={[s.missionIcon, done && { backgroundColor: `${ui.green}22` }]}>
                  <Ionicons
                    name={m.claimed ? 'checkmark-done' : done ? 'checkmark-circle' : 'flag'}
                    size={18}
                    color={done ? ui.green : ui.muted}
                  />
                </View>
                <View style={{ flex: 1, gap: 5 }}>
                  <Text numberOfLines={1} style={s.missionTitle}>
                    {m.title}
                  </Text>
                  <ProgressBar
                    value={m.progress / m.target}
                    height={5}
                    colors={done ? [ui.green, '#059669'] : [ui.blueSoft, ui.blue]}
                  />
                  <Text style={s.tinyText}>
                    {Math.min(m.progress, m.target)}/{m.target}
                  </Text>
                </View>
                {m.claimed ? (
                  <Text style={[s.tinyText, { color: ui.green }]}>{t('missions.claimed')}</Text>
                ) : done ? (
                  <Pulse active={motion}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t('missions.claimA11y', { title: m.title })}
                      disabled={rewards.busy !== null}
                      onPress={() => void rewards.claimMission(m.id)}
                      style={s.claim}
                    >
                      <Text style={s.claimText}>{t('missions.claim')}</Text>
                    </Pressable>
                  </Pulse>
                ) : (
                  <RewardChips coins={m.coins} gems={m.gems} size="sm" />
                )}
              </View>
            );
          })}
        </View>
      )}

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/store')}
        android_ripple={{ color: `${storeViolet}30` }}
      >
        <View style={[s.storeRow, { borderColor: `${storeViolet}35` }]}>
          <Text style={{ fontSize: 26 }}>🎨</Text>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={s.cardTitle}>{t('store.title')}</Text>
            <Text style={shared.small}>{t('store.subtitle')}</Text>
          </View>
          <Ionicons
            name="chevron-forward"
            style={mirrorInRtl}
            size={20}
            color={night ? '#c5a5ff' : ui.violet}
          />
        </View>
      </Pressable>
      {message && (
        <Text accessibilityLiveRegion="polite" style={shared.small}>
          {'text' in message ? message.text : t(message.key)}
        </Text>
      )}
      <Sheet
        visible={mode !== null}
        onClose={() => setMode(null)}
        title={mode === 'ai' ? t('setup.aiTitle') : t('setup.localTitle')}
      >
        <Body>{mode === 'ai' ? t('setup.aiBody') : t('setup.localBody')}</Body>
        <Label>{t('setup.players')}</Label>
        <View style={shared.row}>
          {([2, 3, 4, 5, 6, 7, 8] as const).map((n) => (
            <Pressable
              key={n}
              accessibilityLabel={t('setup.playersA11y', { count: n })}
              accessibilityRole="button"
              accessibilityState={{ selected: n === players }}
              onPress={() => setPlayers(n)}
              android_ripple={{ color: `${theme.accent}30` }}
              style={[
                s.choice,
                { backgroundColor: theme.surface },
                n === players && { borderColor: theme.accent },
              ]}
            >
              <Text style={s.choiceText}>{n}</Text>
              <Text style={{ color: ui.muted, fontSize: 9 }}>{t('setup.playersUnit')}</Text>
            </Pressable>
          ))}
        </View>
        <Label>{t('setup.gameMode')}</Label>
        <VariantPicker value={variant} onChange={setVariant} />
        {players === 4 && (
          <>
            <Label>{t('setup.teams')}</Label>
            <View style={shared.row}>
              {([false, true] as const).map((team) => (
                <Pressable
                  key={String(team)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: team === teams }}
                  onPress={() => setTeams(team)}
                  android_ripple={{ color: `${theme.accent}30` }}
                  style={[
                    s.choice,
                    { backgroundColor: theme.surface },
                    team === teams && { borderColor: theme.accent },
                  ]}
                >
                  <Text style={s.choiceText}>{team ? t('teams.on') : t('teams.off')}</Text>
                  <Text style={{ color: ui.muted, fontSize: 9 }}>
                    {team ? t('setup.teamsOnHint') : t('setup.teamsOffHint')}
                  </Text>
                </Pressable>
              ))}
            </View>
            {teams && (
              <Text style={shared.small}>
                {mode === 'ai' ? t('setup.teamsAi') : t('setup.teamsLocal')}
              </Text>
            )}
          </>
        )}
        {mode === 'local' && (
          <>
            <Label>{t('setup.whoIsPlaying')}</Label>
            <Text style={shared.small}>{t('setup.namesHint')}</Text>
            <View style={{ gap: 8 }}>
              {seatColors(players).map((color) => (
                <View key={color} style={[shared.row, { alignItems: 'center' }]}>
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      backgroundColor: theme.colors[color],
                      borderWidth: 2,
                      borderColor: SEAT_RIM,
                    }}
                  />
                  <TextInput
                    accessibilityLabel={t(`setup.seatNameA11y.${color}`)}
                    value={names[color] ?? ''}
                    onChangeText={(text) => setNames((n) => ({ ...n, [color]: text }))}
                    placeholder={t(`setup.seatPlaceholder.${color}`)}
                    placeholderTextColor={ui.muted}
                    maxLength={SEAT_NAME_MAX}
                    autoCorrect={false}
                    returnKeyType="next"
                    style={s.nameInput}
                  />
                </View>
              ))}
            </View>
          </>
        )}
        {mode === 'ai' && (
          <>
            <Label>{t('setup.difficulty')}</Label>
            <View style={shared.row}>
              {(['easy', 'smart'] as const).map((d) => (
                <Pressable
                  key={d}
                  accessibilityRole="button"
                  accessibilityState={{ selected: d === difficulty }}
                  onPress={() => setDifficulty(d)}
                  android_ripple={{ color: `${theme.accent}30` }}
                  style={[
                    s.choice,
                    { backgroundColor: theme.surface },
                    d === difficulty && { borderColor: theme.accent },
                  ]}
                >
                  <Text style={s.choiceText}>
                    {d === 'easy' ? t('setup.easy') : t('setup.smart')}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Body>{difficulty === 'smart' ? t('setup.smartHint') : t('setup.easyHint')}</Body>
          </>
        )}
        {saved?.state.status === 'IN_PROGRESS' && (
          <Text style={shared.small}>{t('setup.replacesSaved')}</Text>
        )}
        <Button
          onPress={() => {
            const selectedMode = mode;
            setMode(null);
            router.push({
              pathname: '/game',
              params: {
                mode: selectedMode ?? 'ai',
                players: String(players),
                difficulty,
                session: String(Date.now()),
                ...(teams && players === 4 ? { teams: '1' } : {}),
                ...(variant !== 'classic' ? { variant } : {}),
                ...(selectedMode === 'local'
                  ? { names: JSON.stringify(cleanSeatNames(names, players)) }
                  : {}),
              },
            });
          }}
        >
          {t('setup.start')}
        </Button>
        <Text style={[shared.small, { textAlign: 'center' }]}>{t('setup.footer')}</Text>
      </Sheet>
    </Screen>
  );
}
const MAX_SPIN = Math.max(
  ...SPIN_SLOTS.filter((slot) => slot.kind === 'coins').map((s) => s.amount),
);

/** The level band shown under the player's name (text: home:profile.titles.<band>). */
function levelTitle(level: number): 'grandmaster' | 'master' | 'proRoller' | 'roller' | 'rookie' {
  if (level >= 30) return 'grandmaster';
  if (level >= 20) return 'master';
  if (level >= 10) return 'proRoller';
  if (level >= 5) return 'roller';
  return 'rookie';
}

/** Monday 00:00 UTC after now: when the weekly tournament closes. */
function nextWeekStart(now = new Date()): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const daysToMonday = (8 - d.getUTCDay()) % 7 || 7;
  d.setUTCDate(d.getUTCDate() + daysToMonday);
  return d.toISOString();
}

/** The next 00:00 UTC: when the free spin and the missions come back. */
function nextUtcMidnight(now = new Date()): string {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
  ).toISOString();
}

function SectionHeader({
  icon,
  color,
  title,
  subtitle,
  right,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  title: string;
  subtitle: string;
  right?: ReactNode;
}) {
  const s = useStyles();
  return (
    <View style={s.sectionHead}>
      <View style={[s.sectionIcon, { backgroundColor: `${color}22` }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <View style={{ flex: 1, gap: 1 }}>
        <Text style={s.sectionTitle}>{title}</Text>
        <Text style={s.sectionSub}>{subtitle}</Text>
      </View>
      {right}
    </View>
  );
}

/** A mode card's gradient, night and day. */
interface Tones {
  readonly dark: readonly [string, string];
  readonly light: readonly [string, string];
}

/**
 * The Quick Match hero. Always drawn in the night palette (see SchemeScope at
 * its call site): by night it blends in as before, by day it is the page's
 * navy anchor with a royal-blue glow.
 */
function QuickMatchHero({
  day,
  online,
  motion,
  seats,
  onSeats,
}: {
  day: boolean;
  online: boolean;
  motion: boolean;
  seats: 2 | 4 | 'teams';
  onSeats(seats: 2 | 4 | 'teams'): void;
}) {
  const { t } = useTranslation('home');
  const s = useStyles();
  const ui = useUi();
  const shared = useShared();
  return (
    <LinearGradient
      colors={day ? HERO.day : HERO.dark}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={s.hero}
    >
      <Shine active={motion && online} />
      <View style={shared.between}>
        <View style={s.heroBadge}>
          <Ionicons name="flash" size={12} color={ui.gold} />
          <Text style={s.heroBadgeText}>{t('online.mostPlayed')}</Text>
        </View>
        <Bob active={motion}>
          <Text style={{ fontSize: 34 }}>🎲</Text>
        </Bob>
      </View>
      <Text style={s.heroTitle}>{t('online.quickMatch')}</Text>
      <Text style={s.heroBody}>
        <Trans
          t={t}
          i18nKey="online.body"
          values={{ coins: REWARDS.online.win.coins, xp: REWARDS.online.win.xp }}
          components={{
            coins: <Text style={{ color: ui.gold, fontWeight: '800' }} />,
            xp: <Text style={{ color: ui.green, fontWeight: '800' }} />,
          }}
        />
      </Text>
      <View style={s.heroActions}>
        <View style={s.segment}>
          {([2, 4, 'teams'] as const).map((n) => (
            <Pressable
              key={n}
              accessibilityRole="button"
              accessibilityLabel={
                n === 'teams' ? t('online.teamsA11y') : t('online.seatsA11y', { seats: n })
              }
              accessibilityState={{ selected: seats === n }}
              onPress={() => onSeats(n)}
              style={[s.segmentItem, seats === n && s.segmentOn]}
            >
              <Text style={[s.segmentText, seats === n && { color: ON_GOLD }]}>
                {n === 'teams' ? t('online.teamsShort') : t('online.seatsShort', { seats: n })}
              </Text>
            </Pressable>
          ))}
        </View>
        <Pulse active={motion && online} style={{ flex: 1 }}>
          <Button
            fit
            disabled={!online}
            onPress={() =>
              router.push({
                pathname: '/online',
                params: seats === 'teams' ? { seats: '4', teams: '1' } : { seats: String(seats) },
              })
            }
          >
            {online ? t('online.playNow') : t('online.offlineButton')}
          </Button>
        </Pulse>
      </View>
    </LinearGradient>
  );
}

function ModeCard({
  icon,
  tones,
  accent,
  title,
  subtitle,
  pill,
  disabled = false,
  lockedLabel,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  tones: Tones;
  accent: string;
  title: string;
  subtitle: string;
  pill: string;
  disabled?: boolean;
  /** Shown as a lock chip while disabled, so the card says why instead of fading out. */
  lockedLabel?: string;
  onPress(): void;
}) {
  const s = useStyles();
  const ui = useUi();
  const shared = useShared();
  const day = ui.scheme === 'light';
  const locked = disabled && Boolean(lockedLabel);
  // By day: a white card with a solid tile in the mode's Ludo colour (the
  // playful 10% of 60-30-10); by night the tinted glass card as before.
  const colors = day ? (['#ffffff', '#ffffff'] as const) : tones.dark;
  const tile = iconTile(accent, ui);
  const pillTone = pillColors(accent, ui);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={locked ? lockedLabel : subtitle}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      android_ripple={{ color: `${accent}30` }}
      style={({ pressed }) => [
        s.modeWrap,
        { opacity: disabled && !locked ? 0.5 : pressed ? 0.85 : 1 },
      ]}
    >
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[s.mode, { borderColor: day ? ui.line : `${accent}40` }, day && s.modeDay]}
      >
        <View style={shared.between}>
          <View style={[s.modeIcon, { backgroundColor: locked ? ui.fillStrong : tile.background }]}>
            <Ionicons name={icon} size={20} color={locked ? ui.subtle : tile.icon} />
          </View>
          {locked ? (
            <View style={s.lockChip}>
              <Ionicons name="lock-closed" size={11} color={ui.muted} />
              <Text style={s.lockChipText}>{lockedLabel}</Text>
            </View>
          ) : (
            <Text
              style={[
                s.modePill,
                { color: pillTone.color, borderColor: `${accent}55` },
                day && { backgroundColor: pillTone.background, borderColor: 'transparent' },
              ]}
            >
              {pill}
            </Text>
          )}
        </View>
        <Text style={[s.modeTitle, locked && { color: ui.muted }]}>{title}</Text>
        <Text numberOfLines={2} style={s.modeSub}>
          {subtitle}
        </Text>
      </LinearGradient>
    </Pressable>
  );
}

/**
 * Gold and green buttons and chips stay bright in both modes, like the
 * accent buttons, with dark text on them.
 */
const GOLD_FILL = DARK.gold;
const GREEN_FILL = DARK.green;
const ON_GOLD = '#1f1500';
/** The white rim of a seat's colour swatch, part of the coin look. */
const SEAT_RIM = '#ffffffcc';

/** By day, cards lift off the page with a soft navy shadow; night is unchanged. */

/** A recessed well on a card: dark glass by night, frosted paper by day. */
function well(ui: Palette, nightAlpha: string): string {
  return ui.scheme === 'dark' ? `#000000${nightAlpha}` : `${ui.background}b3`;
}

/** Decorative card gradients: the night originals and soft day versions of the same hues. */
const SPIN_FREE = {
  dark: ['#3a2a0c', '#1d1b2e'],
  light: ['#fdebc6', '#efeaf8'],
} as const;
const SPIN = { dark: ['#262a3d', '#1a1f2f'], light: ['#ffffff', '#ffffff'] } as const;
const HERO = {
  dark: ['#123f31', '#11284d', '#1a1f2f'],
  // Day: royal blue into the brand navy.
  day: NAVY_HERO,
} as const;
/** Day: marigold, the 10% pop; navy text on it reads at 10:1. */
const TOURNEY = { dark: ['#3b2a0e', '#1f1a14'], light: MARIGOLD } as const;
const MODE_TONES = {
  party: { dark: ['#123b2c', '#16222a'], light: ['#d8f2e6', '#eef4f2'] },
  pass: { dark: ['#3a2a4f', '#1f1b2e'], light: ['#ebe1fa', '#f4f1fa'] },
  challenge: { dark: ['#3b2a10', '#221c16'], light: ['#fbe9c8', '#f8f3ea'] },
  teamup: { dark: ['#2a1f4a', '#1c1a2e'], light: ['#e4ddfa', '#f2f1f9'] },
  classic: { dark: ['#4a1d1d', '#221a26'], light: ['#fadbdb', '#f7eff2'] },
  quick: { dark: ['#4a3510', '#241d14'], light: ['#fae5bf', '#f9f3e8'] },
  kill: { dark: ['#3d1530', '#211726'], light: ['#f8dbeb', '#f6eff4'] },
  teams: { dark: ['#1d2b52', '#191f33'], light: ['#dce4f9', '#eff1f8'] },
} as const satisfies Record<string, Tones>;

const useStyles = makeStyles((ui) => ({
  profile: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  onlineDot: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    padding: 3,
    borderRadius: 10,
  },
  profileName: { color: ui.text, fontSize: 20, fontWeight: '900', letterSpacing: -0.4 },
  levelTag: {
    color: ui.onColor,
    backgroundColor: ui.blue,
    fontSize: 10,
    fontWeight: '900',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  levelTitle: { color: ui.blueSoft, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  spinCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: ui.line,
    boxShadow: liftByDay(ui),
    overflow: 'hidden',
  },
  spinWheel: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: well(ui, '35'),
    alignItems: 'center',
    justifyContent: 'center',
  },
  freeBadge: {
    position: 'absolute',
    bottom: -6,
    color: ui.onColor,
    backgroundColor: ui.green,
    fontSize: 9,
    fontWeight: '900',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    overflow: 'hidden',
  },
  cardTitle: { color: ui.text, fontSize: 16, fontWeight: '800' },
  streakDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: ui.ripple },
  streakText: { color: ui.gold, fontSize: 9, fontWeight: '900', letterSpacing: 0.6, marginLeft: 4 },
  spinButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: GOLD_FILL,
    boxShadow: `0 4px 14px ${GOLD_FILL}55`,
  },
  spinButtonText: { color: ON_GOLD, fontWeight: '900', fontSize: 13, letterSpacing: 1 },
  section: { color: ui.muted, fontSize: 12, fontWeight: '900', letterSpacing: 1.6 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  sectionIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: { color: ui.text, fontSize: 18, fontWeight: '900', letterSpacing: -0.2 },
  sectionSub: { color: ui.subtle, fontSize: 12, fontWeight: '600' },
  liveText: { fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  hero: {
    borderRadius: 24,
    padding: 18,
    gap: 10,
    borderWidth: 1,
    borderColor: `${ui.green}45`,
    overflow: 'hidden',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: well(ui, '40'),
  },
  heroBadgeText: { color: ui.gold, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  heroTitle: { color: ui.text, fontSize: 30, fontWeight: '900', letterSpacing: -0.6 },
  heroBody: { color: ui.muted, fontSize: 13, lineHeight: 19 },
  heroActions: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  segment: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 14,
    backgroundColor: well(ui, '45'),
  },
  segmentItem: {
    minWidth: 48,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentOn: { backgroundColor: GOLD_FILL },
  segmentText: { color: ui.muted, fontWeight: '900', fontSize: 13 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  modeWrap: { flexBasis: '47%', flexGrow: 1 },
  mode: { borderRadius: 20, borderWidth: 1, padding: 14, gap: 6, minHeight: 138 },
  modeDay: { boxShadow: liftByDay(ui) },
  lockChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: ui.fillStrong,
  },
  lockChipText: { color: ui.muted, fontSize: 10, fontWeight: '900' },
  modeIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modePill: {
    fontSize: 10,
    fontWeight: '900',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  modeTitle: { color: ui.text, fontSize: 15, fontWeight: '800', marginTop: 4 },
  modeSub: { color: ui.muted, fontSize: 12, lineHeight: 16 },
  tourney: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: `${ui.gold}55`,
    boxShadow: liftByDay(ui),
    overflow: 'hidden',
  },
  tourneyIcon: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: well(ui, '35'),
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveBadge: {
    position: 'absolute',
    top: -6,
    left: -6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: ui.danger,
  },
  liveBadgeText: { color: ui.onColor, fontSize: 8, fontWeight: '900' },
  rankChip: {
    color: ui.gold,
    fontWeight: '900',
    fontSize: 12,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 7,
    backgroundColor: well(ui, '40'),
    overflow: 'hidden',
  },
  tinyText: { color: ui.subtle, fontSize: 11, fontWeight: '700' },
  tierBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: ui.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierText: { color: ui.onColor, fontSize: 18, fontWeight: '900' },
  proChip: {
    color: ON_GOLD,
    backgroundColor: GOLD_FILL,
    fontSize: 9,
    fontWeight: '900',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 5,
    overflow: 'hidden',
  },
  mission: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: ui.line,
    backgroundColor: ui.surfaceLow,
  },
  missionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: ui.fill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  missionTitle: { color: ui.text, fontWeight: '700', fontSize: 14 },
  claim: {
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 11,
    backgroundColor: GREEN_FILL,
    justifyContent: 'center',
  },
  claimText: { color: '#04261a', fontWeight: '900', fontSize: 12 },
  storeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    backgroundColor: ui.surfaceLow,
  },
  nameInput: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderColor: ui.border,
    borderRadius: 12,
    backgroundColor: well(ui, '20'),
    color: ui.text,
    fontSize: 15,
    paddingHorizontal: 12,
  },
  choice: {
    flex: 1,
    borderWidth: 1,
    borderColor: ui.line,
    borderRadius: 13,
    paddingVertical: 16,
    alignItems: 'center',
  },
  choiceText: { color: ui.text, fontSize: 13, fontWeight: '700' },
}));
