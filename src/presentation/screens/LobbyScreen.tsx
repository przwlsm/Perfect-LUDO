import { useCallback, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Text, TextInput } from '../components/AppText';
import { router, useFocusEffect } from 'expo-router';
import { levelInfo, REWARDS, seatColors } from '@/domain';
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
import { useRewards } from '../hooks/useRewards';
import { ConnectionPill } from '../components/ConnectionPill';
import { Body, Button, Card, Label, Screen, shared, Sheet } from '../components/Kit';
import { useConnectivity } from '../state/ConnectivityProvider';
import { useProfile } from '../state/ProfileProvider';
import { ui } from '../theme/themes';

export default function LobbyScreen() {
  const { profile, theme, member } = useProfile();
  const connectivity = useConnectivity();
  const { width } = useWindowDimensions();
  const wide = width >= 720;
  const [mode, setMode] = useState<MatchMode | null>(null);
  const [players, setPlayers] = useState<2 | 3 | 4 | 5 | 6>(4);
  const [difficulty, setDifficulty] = useState<'easy' | 'smart'>('smart');
  const [teams, setTeams] = useState(false);
  // Pass & play names, kept while the sheet is reopened so nobody retypes them.
  const [names, setNames] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<SavedMatch | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      void matchRepository
        .load()
        .then((m) => {
          if (active) setSaved(m);
        })
        .catch((e: unknown) => {
          if (active) setMessage(e instanceof Error ? e.message : 'Could not restore your match.');
        });
      return () => {
        active = false;
      };
    }, []),
  );
  const rewards = useRewards();
  const level = levelInfo(profile.xp);
  const freeSpin = member && rewards.data !== null && rewards.data.spinsToday === 0;
  const missions = rewards.data?.missions ?? [];
  const missionsDone = missions.filter((m) => m.progress >= m.target).length;
  const online = connectivity.available && connectivity.online;
  const openAi = () => (setPlayers((p) => (p > 4 ? 4 : p)), setMode('ai'));
  return (
    <Screen>
      <View style={[shared.between, { gap: 12 }]}>
        <View style={{ gap: 6, flex: 1 }}>
          <Label color={theme.accent}>LET’S PLAY SOMETHING GOOD</Label>
          <Text numberOfLines={1} style={s.greeting}>
            Hey, {profile.name} <Text style={{ fontSize: 19 }}>✦</Text>
          </Text>
          {member && (
            <View style={s.levelRow}>
              <Text style={s.levelTag}>LVL {level.level}</Text>
              <View style={{ flex: 1 }}>
                <ProgressBar value={level.into / level.need} height={8} />
              </View>
              <Text style={shared.small}>
                {level.into}/{level.need} XP
              </Text>
            </View>
          )}
        </View>
        <ConnectionPill />
      </View>

      {connectivity.available && (
        <LinearGradient
          colors={['#0f3d2e', '#10284a', '#1a1f2f']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.onlineHero}
        >
          <View style={s.heroGlow} />
          <View style={shared.between}>
            <View style={s.livePill}>
              <View style={[s.liveDot, { backgroundColor: online ? ui.green : ui.subtle }]} />
              <Text style={[s.liveText, { color: online ? ui.green : ui.subtle }]}>
                {online ? 'ONLINE ARENA · LIVE' : 'OFFLINE'}
              </Text>
            </View>
            <Ionicons name="globe" size={26} color={`${ui.green}aa`} />
          </View>
          <Text style={s.heroTitle}>
            Play online.{'\n'}
            <Text style={{ color: ui.green }}>Win big.</Text>
          </Text>
          <Text style={s.heroBody}>
            Real players, real rivals. Online wins pay five times more than the computer.
          </Text>
          <View style={s.payRow}>
            <Text style={s.payLabel}>EVERY WIN</Text>
            <RewardChips coins={REWARDS.online.win.coins} xp={REWARDS.online.win.xp} />
            <Text style={[s.payLabel, { color: theme.accent }]}>+3 TOURNEY PTS</Text>
          </View>
          <Button disabled={!online} onPress={() => router.push('/online')}>
            {online ? 'Quick match' : 'Connect to play online'}
          </Button>
          <View style={s.heroLinks}>
            <HeroLink
              icon="key"
              label="Private room"
              disabled={!online}
              onPress={() => router.push('/online')}
            />
            <HeroLink
              icon="trophy"
              label="Tournament"
              disabled={!online}
              onPress={() => router.push('/tournament')}
            />
          </View>
        </LinearGradient>
      )}

      {saved &&
        (saved.state.status === 'IN_PROGRESS' || !profile.rewardedMatches.includes(saved.id)) && (
          <Card style={{ borderColor: `${theme.accent}40` }}>
            <View style={shared.between}>
              <View style={{ flex: 1, gap: 5 }}>
                <Text style={shared.sectionTitle}>
                  {saved.state.status === 'FINISHED'
                    ? 'Your result is ready'
                    : 'Your table is waiting'}
                </Text>
                <Text style={shared.small}>
                  {saved.options.players} players ·{' '}
                  {saved.options.mode === 'ai' ? 'Against the computer' : 'Pass & play'}
                </Text>
              </View>
              <Button compact onPress={() => router.push('/game?resume=1')}>
                {saved.state.status === 'FINISHED' ? 'View result' : 'Resume →'}
              </Button>
            </View>
          </Card>
        )}

      <View style={s.tiles}>
        <Tile
          colors={['#3b2f63', '#221c3d']}
          border={freeSpin ? ui.gold : '#c084fc40'}
          onPress={() =>
            member
              ? router.push('/rewards')
              : router.push({ pathname: '/login', params: { intent: 'store' } })
          }
        >
          <View style={shared.between}>
            <Text style={{ fontSize: 30 }}>🎡</Text>
            {freeSpin && <Text style={s.badge}>FREE</Text>}
          </View>
          <Text style={s.tileTitle}>Daily spin</Text>
          <Text style={shared.small}>
            {!member
              ? 'Sign in to spin every day'
              : freeSpin
                ? 'Your free spin is ready!'
                : rewards.data
                  ? 'Come back tomorrow, or spin with gems'
                  : 'Coins, gems and XP'}
          </Text>
        </Tile>
        <Tile
          colors={['#40300f', '#231c10']}
          border={`${theme.accent}40`}
          onPress={() => router.push('/tournament')}
        >
          <View style={shared.between}>
            <Text style={{ fontSize: 30 }}>🏆</Text>
            <Text style={[s.badge, { backgroundColor: ui.blue, color: '#fff' }]}>WEEKLY</Text>
          </View>
          <Text style={s.tileTitle}>Tournament</Text>
          <Text style={shared.small}>Ends in {timeLeft(nextWeekStart())} · gems to win</Text>
        </Tile>
      </View>

      {member && missions.length > 0 && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Daily missions. Open rewards"
          onPress={() => router.push('/rewards')}
          android_ripple={{ color: '#ffffff14' }}
        >
          <Card style={{ gap: 12 }}>
            <View style={shared.between}>
              <Text style={shared.sectionTitle}>Daily missions</Text>
              <Label color={missionsDone === missions.length ? ui.green : theme.accent}>
                {missionsDone}/{missions.length} DONE
              </Label>
            </View>
            {missions.map((m) => (
              <View key={m.id} style={{ gap: 6 }}>
                <View style={shared.between}>
                  <Text numberOfLines={1} style={s.missionTitle}>
                    {m.claimed ? '✓ ' : ''}
                    {m.title}
                  </Text>
                  <Text style={shared.small}>
                    {Math.min(m.progress, m.target)}/{m.target}
                  </Text>
                </View>
                <ProgressBar
                  value={m.progress / m.target}
                  height={7}
                  colors={m.progress >= m.target ? [ui.green, '#059669'] : [ui.blueSoft, ui.blue]}
                />
              </View>
            ))}
          </Card>
        </Pressable>
      )}

      <View style={shared.section}>
        <View style={shared.between}>
          <Text style={shared.sectionTitle}>Offline fun</Text>
          <Label>NO CONNECTION NEEDED</Label>
        </View>
        <View style={[s.modeRow, wide && { flexDirection: 'row' }]}>
          <Pressable
            accessibilityRole="button"
            onPress={openAi}
            android_ripple={{ color: '#ffc56830' }}
            style={({ pressed }) => [
              s.modeCard,
              {
                backgroundColor: theme.surface,
                borderColor: '#ffc56835',
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <View style={[s.modeIcon, { backgroundColor: '#ffc56815' }]}>
              <Ionicons name="hardware-chip" size={26} color={ui.gold} />
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={s.modeTitle}>Play vs computer</Text>
              <Text style={shared.small}>Your next rival is always ready.</Text>
              <Label color={theme.accent}>
                WIN +{REWARDS.bot.win.coins} COINS · +{REWARDS.bot.win.xp} XP
              </Label>
            </View>
            <Text style={[s.arrow, { color: theme.accent }]}>↗</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => setMode('local')}
            android_ripple={{ color: '#a7beff30' }}
            style={({ pressed }) => [
              s.modeCard,
              { backgroundColor: theme.surface, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <View style={[s.modeIcon, { backgroundColor: '#8fafff18' }]}>
              <Ionicons name="people" size={26} color="#a7beff" />
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={s.modeTitle}>Pass & play</Text>
              <Text style={shared.small}>One device. Your favorite people.</Text>
              <Label color="#a7beff">2–6 PLAYERS · LOCAL</Label>
            </View>
            <Text style={[s.arrow, { color: '#a7beff' }]}>↗</Text>
          </Pressable>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/store')}
        android_ripple={{ color: '#ad8efa30' }}
      >
        <Card style={{ borderColor: '#ad8efa35' }}>
          <Label color="#c5a5ff">A BOARD THAT FEELS LIKE YOU</Label>
          <Text style={shared.sectionTitle}>Make it your own.</Text>
          <Body>Discover boards, dice and table styles with a little more personality.</Body>
          <View style={shared.between}>
            <View style={shared.row}>
              {['#e7be76', '#a88def', '#72cdb9', '#f19cbb'].map((c) => (
                <View
                  key={c}
                  style={{
                    width: 28,
                    height: 28,
                    backgroundColor: c,
                    borderRadius: 9,
                    borderBottomWidth: 3,
                    borderColor: '#00000030',
                  }}
                />
              ))}
            </View>
            <Text style={{ color: '#c5a5ff', fontWeight: '800' }}>Visit store ↗</Text>
          </View>
        </Card>
      </Pressable>
      {message && (
        <Text accessibilityLiveRegion="polite" style={shared.small}>
          {message}
        </Text>
      )}
      <Text style={s.footer}>MADE FOR GAME NIGHTS. AND EVERY NIGHT IN BETWEEN.</Text>
      <Sheet
        visible={mode !== null}
        onClose={() => setMode(null)}
        title={mode === 'ai' ? 'Set your table' : 'Bring your people'}
      >
        <Body>
          {mode === 'ai'
            ? 'You play red. Choose your opponents and make your move.'
            : 'Pass the device when the turn changes. Every seat is controlled by a person.'}
        </Body>
        <Label>PLAYERS</Label>
        <View style={shared.row}>
          {(mode === 'local' ? ([2, 3, 4, 5, 6] as const) : ([2, 3, 4] as const)).map((n) => (
            <Pressable
              key={n}
              accessibilityLabel={`${n} players`}
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
              <Text style={{ color: ui.muted, fontSize: 9 }}>players</Text>
            </Pressable>
          ))}
        </View>
        {players === 4 && (
          <>
            <Label>HOW TO PLAY</Label>
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
                  <Text style={s.choiceText}>{team ? '2 v 2 teams' : 'Every player'}</Text>
                  <Text style={{ color: ui.muted, fontSize: 9 }}>
                    {team ? 'partners sit opposite' : 'for themselves'}
                  </Text>
                </Pressable>
              ))}
            </View>
            {teams && (
              <Text style={shared.small}>
                {mode === 'ai'
                  ? 'You and yellow (a computer partner) against green and blue. Partners never capture each other, and once your coins are home you roll for your partner.'
                  : 'Red and yellow against green and blue. Partners never capture each other, and once your coins are home you roll for your partner.'}
              </Text>
            )}
          </>
        )}
        {mode === 'local' && (
          <>
            <Label>WHO’S PLAYING?</Label>
            <Text style={shared.small}>
              Names appear beside each home on the board. Leave one blank to use the colour.
            </Text>
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
                      borderColor: '#ffffffcc',
                    }}
                  />
                  <TextInput
                    accessibilityLabel={`Name for the ${color.toLowerCase()} player`}
                    value={names[color] ?? ''}
                    onChangeText={(text) => setNames((n) => ({ ...n, [color]: text }))}
                    placeholder={`${color.charAt(0)}${color.slice(1).toLowerCase()} player`}
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
            <Label>COMPUTER DIFFICULTY</Label>
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
                  <Text style={s.choiceText}>{d === 'easy' ? 'Easy going' : 'Play smart'}</Text>
                </Pressable>
              ))}
            </View>
            <Body>
              {difficulty === 'smart'
                ? 'Looks for captures, finishes, and chances to leave the yard.'
                : 'Picks a random legal move. Perfect for a relaxed game.'}
            </Body>
          </>
        )}
        {saved?.state.status === 'IN_PROGRESS' && (
          <Text style={shared.small}>Starting a new game replaces your saved match.</Text>
        )}
        <Button
          onPress={() => {
            const selectedMode = mode;
            setMode(null);
            router.push({
              pathname: '/game',
              params: {
                mode: selectedMode ?? 'ai',
                players: String(selectedMode === 'ai' && players > 4 ? 4 : players),
                difficulty,
                session: String(Date.now()),
                ...(teams && players === 4 ? { teams: '1' } : {}),
                ...(selectedMode === 'local'
                  ? { names: JSON.stringify(cleanSeatNames(names, players)) }
                  : {}),
              },
            });
          }}
        >
          Let’s play →
        </Button>
        <Text style={[shared.small, { textAlign: 'center' }]}>
          Free to play · No connection needed
        </Text>
      </Sheet>
    </Screen>
  );
}
/** Monday 00:00 UTC after now: when the weekly tournament closes. */
function nextWeekStart(now = new Date()): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const daysToMonday = (8 - d.getUTCDay()) % 7 || 7;
  d.setUTCDate(d.getUTCDate() + daysToMonday);
  return d.toISOString();
}

function HeroLink({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: 'key' | 'trophy';
  label: string;
  disabled: boolean;
  onPress(): void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      android_ripple={{ color: '#ffffff1f' }}
      style={[s.heroLink, disabled && { opacity: 0.5 }]}
    >
      <Ionicons name={icon} size={16} color={ui.text} />
      <Text style={s.heroLinkText}>{label}</Text>
    </Pressable>
  );
}

function Tile({
  colors,
  border,
  onPress,
  children,
}: {
  colors: readonly [string, string];
  border: string;
  onPress(): void;
  children: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      android_ripple={{ color: '#ffffff1a' }}
      style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.85 : 1 }]}
    >
      <LinearGradient colors={colors} style={[s.tile, { borderColor: border }]}>
        {children}
      </LinearGradient>
    </Pressable>
  );
}
const s = StyleSheet.create({
  greeting: { color: ui.text, fontSize: 27, fontWeight: '800', letterSpacing: -0.6 },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  levelTag: {
    color: '#fff',
    backgroundColor: ui.blue,
    fontSize: 10,
    fontWeight: '900',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  onlineHero: {
    borderRadius: 26,
    padding: 22,
    gap: 14,
    borderWidth: 1,
    borderColor: `${ui.green}45`,
    overflow: 'hidden',
  },
  heroGlow: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    right: -110,
    top: -120,
    backgroundColor: ui.green,
    opacity: 0.08,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#00000035',
  },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  liveText: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  heroTitle: {
    color: ui.text,
    fontSize: 36,
    lineHeight: 40,
    fontWeight: '900',
    letterSpacing: -1.2,
  },
  heroBody: { color: ui.muted, fontSize: 14, lineHeight: 20 },
  payRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    padding: 10,
    borderRadius: 14,
    backgroundColor: '#00000030',
  },
  payLabel: { color: ui.subtle, fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  heroLinks: { flexDirection: 'row', gap: 10 },
  heroLink: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 42,
    borderRadius: 12,
    backgroundColor: '#ffffff12',
    borderWidth: 1,
    borderColor: '#ffffff18',
  },
  heroLinkText: { color: ui.text, fontWeight: '700', fontSize: 13 },
  tiles: { flexDirection: 'row', gap: 12 },
  tile: { flex: 1, borderRadius: 20, borderWidth: 1, padding: 16, gap: 6, minHeight: 138 },
  tileTitle: { color: ui.text, fontSize: 17, fontWeight: '800' },
  badge: {
    color: '#1f1500',
    backgroundColor: ui.gold,
    fontSize: 10,
    fontWeight: '900',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
  },
  missionTitle: { color: ui.text, fontWeight: '700', fontSize: 14, flex: 1, marginRight: 8 },
  modeRow: { gap: 12 },
  nameInput: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderColor: '#ffffff28',
    borderRadius: 12,
    backgroundColor: '#00000020',
    color: ui.text,
    fontSize: 15,
    paddingHorizontal: 12,
  },
  modeCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#a7beff25',
    borderRadius: 19,
    padding: 18,
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
  },
  modeIcon: {
    width: 48,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeSymbol: { color: ui.gold, fontSize: 28 },
  modeTitle: { color: ui.text, fontSize: 17, fontWeight: '800' },
  arrow: { fontSize: 25 },
  footer: {
    color: ui.subtle,
    fontSize: 8,
    letterSpacing: 1.2,
    textAlign: 'center',
    marginBottom: 4,
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
});
