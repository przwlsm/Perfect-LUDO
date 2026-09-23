import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { createGame } from '@/domain';
import { COSMETICS } from '@/domain/cosmetics/catalog';
import { matchRepository, profileService } from '@/config/container';
import type { MatchMode, SavedMatch } from '@/application/session/MatchRepository';
import { Board2D } from '../board/Board2D';
import { Body, Button, Card, Label, Screen, shared, Sheet } from '../components/Kit';
import { useProfile } from '../state/ProfileProvider';
import { ui } from '../theme/themes';

const preview = createGame(['RED', 'GREEN', 'YELLOW', 'BLUE']);
export default function LobbyScreen() {
  const { profile, theme, perform } = useProfile();
  const { width } = useWindowDimensions();
  const wide = width >= 720;
  const [mode, setMode] = useState<MatchMode | null>(null);
  const [players, setPlayers] = useState<2 | 3 | 4>(4);
  const [difficulty, setDifficulty] = useState<'easy' | 'smart'>('smart');
  const [saved, setSaved] = useState<SavedMatch | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
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
  const giftClaimed = profile.lastGift === new Date().toISOString().slice(0, 10);
  async function gift() {
    setBusy(true);
    try {
      await perform(() => profileService.claimGift());
      setMessage('A little gift for your next adventure. +250 coins!');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen>
      <View style={shared.between}>
        <View style={{ gap: 6 }}>
          <Label color={theme.accent}>LET’S PLAY SOMETHING GOOD</Label>
          <Text style={s.greeting}>
            Hey, {profile.name} <Text style={{ fontSize: 19 }}>✦</Text>
          </Text>
        </View>
        <View style={s.offline}>
          <View style={s.dot} />
          <Text style={s.offlineText}>OFFLINE & READY</Text>
        </View>
      </View>
      <View
        style={[
          s.hero,
          {
            backgroundColor: theme.surface,
            borderColor: `${theme.accent}28`,
            flexDirection: wide ? 'row' : 'column',
          },
        ]}
      >
        <View style={[s.heroText, wide && { flex: 1 }]}>
          <View style={s.tag}>
            <Label color={theme.accent}>THE CLASSIC, REIMAGINED</Label>
          </View>
          <Text style={[s.heroTitle, wide && { fontSize: 48 }]}>
            Your table.{'\n'}
            <Text style={{ color: theme.accent }}>Your rules.</Text>
          </Text>
          <Body>Four colors. A little luck.{'\n'}A whole lot of “one more game”.</Body>
          <View style={shared.row}>
            <View style={s.microPill}>
              <Text style={s.microText}>2D + 3D BOARDS</Text>
            </View>
            <Text style={s.microText}>
              {COSMETICS.filter((item) => item.kind === 'board').length} SIGNATURE THEMES
            </Text>
          </View>
          <Button compact onPress={() => setMode('ai')}>
            Play now →
          </Button>
        </View>
        <View pointerEvents="none" style={[s.heroBoard, !wide && { marginTop: -6 }]}>
          <View
            style={[
              s.previewFrame,
              {
                backgroundColor: theme.frame,
                transform: [{ perspective: 800 }, { rotateX: '22deg' }, { rotateZ: '-12deg' }],
              },
            ]}
          >
            <Board2D
              state={preview}
              validMoves={null}
              size={wide ? 240 : Math.min(width - 110, 245)}
              theme={theme}
              onSelectMove={() => undefined}
            />
          </View>
          <View style={s.boardShadow} />
        </View>
        <View style={[s.heroCorner, { backgroundColor: theme.accent }]} />
      </View>
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
      <View style={shared.section}>
        <View style={shared.between}>
          <Text style={shared.sectionTitle}>Find your kind of fun</Text>
          <Label>NO ENTRY FEE</Label>
        </View>
        <View style={[s.modeRow, wide && { flexDirection: 'row' }]}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setMode('ai')}
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
              <Text style={s.modeSymbol}>♟</Text>
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={s.modeTitle}>Play vs computer</Text>
              <Text style={shared.small}>Your next rival is always ready.</Text>
              <Label color={theme.accent}>SOLO PLAY · EARN COINS</Label>
            </View>
            <Text style={[s.arrow, { color: theme.accent }]}>↗</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => setMode('local')}
            style={({ pressed }) => [
              s.modeCard,
              { backgroundColor: theme.surface, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <View style={[s.modeIcon, { backgroundColor: '#8fafff18' }]}>
              <Text style={[s.modeSymbol, { color: '#a7beff' }]}>♙♙</Text>
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={s.modeTitle}>Pass & play</Text>
              <Text style={shared.small}>One device. Your favorite people.</Text>
              <Label color="#a7beff">2–4 PLAYERS · LOCAL</Label>
            </View>
            <Text style={[s.arrow, { color: '#a7beff' }]}>↗</Text>
          </Pressable>
        </View>
      </View>
      <View style={[s.extras, wide && { flexDirection: 'row' }]}>
        <Card style={{ flex: 1 }}>
          <View style={shared.between}>
            <View style={{ flex: 1, gap: 8 }}>
              <Label color={theme.accent}>A LITTLE SOMETHING FOR YOU</Label>
              <Text style={shared.sectionTitle}>Your daily good luck</Text>
              <Text style={shared.small}>250 coins. On the house. Every day.</Text>
            </View>
            <Text style={{ fontSize: 38 }}>🎁</Text>
          </View>
          <Button secondary compact disabled={giftClaimed || busy} onPress={() => void gift()}>
            {giftClaimed ? '✓ Gift claimed · see you tomorrow' : 'Claim 250 coins'}
          </Button>
        </Card>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/store')}
          style={{ flex: 1 }}
        >
          <Card style={{ flex: 1, borderColor: '#ad8efa35' }}>
            <Label color="#c5a5ff">A BOARD THAT FEELS LIKE YOU</Label>
            <Text style={shared.sectionTitle}>Make it your own.</Text>
            <Body>Discover boards and dice with a little more personality.</Body>
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
      </View>
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
          {([2, 3, 4] as const).map((n) => (
            <Pressable
              key={n}
              accessibilityRole="button"
              accessibilityState={{ selected: n === players }}
              onPress={() => setPlayers(n)}
              style={[
                s.choice,
                { backgroundColor: theme.surface },
                n === players && { borderColor: theme.accent },
              ]}
            >
              <Text style={s.choiceText}>{n} players</Text>
            </Pressable>
          ))}
        </View>
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
                players: String(players),
                difficulty,
                session: String(Date.now()),
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
const s = StyleSheet.create({
  greeting: { color: ui.text, fontSize: 27, fontWeight: '800', letterSpacing: -0.6 },
  offline: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 5, height: 5, backgroundColor: ui.green, borderRadius: 4 },
  offlineText: { color: ui.green, fontSize: 8, fontWeight: '800', letterSpacing: 0.5 },
  hero: { borderWidth: 1, borderRadius: 26, overflow: 'hidden', position: 'relative' },
  heroText: { padding: 26, gap: 18, zIndex: 1 },
  tag: { alignSelf: 'flex-start', padding: 8, borderRadius: 6, backgroundColor: '#ffc5680c' },
  heroTitle: {
    color: ui.text,
    fontSize: 40,
    lineHeight: 44,
    fontWeight: '900',
    letterSpacing: -1.8,
  },
  heroBoard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    paddingTop: 14,
    paddingBottom: 32,
  },
  previewFrame: {
    padding: 7,
    borderRadius: 14,
    borderBottomWidth: 7,
    borderBottomColor: '#51351f',
    zIndex: 2,
    boxShadow: '0 18px 35px #00000055',
  },
  boardShadow: {
    position: 'absolute',
    bottom: 12,
    height: 30,
    width: 210,
    borderRadius: 100,
    backgroundColor: '#00000015',
  },
  heroCorner: {
    width: 240,
    height: 240,
    borderRadius: 120,
    position: 'absolute',
    right: -120,
    top: -150,
    opacity: 0.04,
  },
  microPill: { borderWidth: 1, borderColor: '#ffffff18', padding: 6, borderRadius: 5 },
  microText: { fontSize: 8, color: ui.muted, fontWeight: '700', letterSpacing: 0.7 },
  modeRow: { gap: 12 },
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
  extras: { gap: 14 },
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
