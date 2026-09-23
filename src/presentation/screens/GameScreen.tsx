import { Component, Suspense, lazy, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { router, useLocalSearchParams, useIsFocused } from 'expo-router';
import { profileService } from '@/config/container';
import type { PlayerColor } from '@/domain';
import { Board2D } from '../board/Board2D';
import { AnimatedDice } from '../components/AnimatedDice';
import { useMotionEnabled } from '../hooks/useMotionEnabled';
import { Body, Button, Card, Label, Screen, shared, Sheet } from '../components/Kit';
import { useMatch } from '../hooks/useMatch';
import { useProfile } from '../state/ProfileProvider';
import { ui } from '../theme/themes';

const Board3D = lazy(() =>
  import('../board/Board3D').then((module) => ({ default: module.Board3D })),
);
class BoardBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
export default function GameScreen() {
  const params = useLocalSearchParams<{
    mode?: string;
    players?: string;
    difficulty?: string;
    resume?: string;
    session?: string;
  }>();
  return (
    <MatchScreen
      key={params.session ?? params.resume ?? 'match'}
      mode={params.mode}
      players={params.players}
      difficulty={params.difficulty}
      resume={params.resume === '1'}
    />
  );
}
function MatchScreen({
  mode,
  players,
  difficulty,
  resume,
}: {
  mode?: string;
  players?: string;
  difficulty?: string;
  resume: boolean;
}) {
  const { profile, theme, perform, ready } = useProfile();
  const { width, height } = useWindowDimensions();
  const [menu, setMenu] = useState(false);
  const [rules, setRules] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const focused = useIsFocused();
  const options = {
    mode: mode === 'local' ? ('local' as const) : ('ai' as const),
    players: players === '2' ? (2 as const) : players === '3' ? (3 as const) : (4 as const),
    difficulty: difficulty === 'easy' ? ('easy' as const) : ('smart' as const),
  };
  const motionEnabled = useMotionEnabled(
    profile.reducedMotion,
    focused && !menu && !rules && ready,
  );
  const game = useMatch(options, resume, menu || rules || !focused || !ready, motionEnabled);
  const { match, current, humanTurn, busy, error } = game;
  const boardSize = Math.max(220, Math.min(width - 56, 440, height - 360));
  async function toggleView() {
    if (saving) return;
    setSaving(true);
    try {
      await perform(() => profileService.update({ board3d: !profile.board3d }));
    } catch {
      setNotice('Could not save board preference. Please try again.');
    } finally {
      setSaving(false);
    }
  }
  async function finish() {
    if (!match || saving) return;
    setSaving(true);
    try {
      await perform(() =>
        profileService.recordMatch(
          match.id,
          match.state.winnerColor === 'RED',
          match.options.mode === 'ai',
        ),
      );
      router.replace('/');
    } catch {
      setNotice('Could not save your result. Tap again to retry.');
    } finally {
      setSaving(false);
    }
  }
  function player(color: PlayerColor) {
    if (!match) return null;
    const seat = match.state.players.find((p) => p.color === color);
    const active = seat && current?.color === color && match.state.status !== 'FINISHED';
    const name =
      color === 'RED'
        ? `${profile.name}${match.options.mode === 'ai' ? ' (you)' : ''}`
        : match.options.mode === 'ai'
          ? ({ GREEN: 'Milo', YELLOW: 'Sunny', BLUE: 'Nova' } as const)[color]
          : `${color.charAt(0)}${color.slice(1).toLowerCase()} player`;
    return (
      <View
        style={[
          s.player,
          {
            borderColor: active ? theme.colors[color] : `${theme.colors[color]}35`,
            backgroundColor: active ? `${theme.colors[color]}15` : theme.surface,
            opacity: seat ? 1 : 0.35,
          },
        ]}
      >
        <View
          style={[
            s.avatar,
            { backgroundColor: `${theme.colors[color]}25`, borderColor: theme.colors[color] },
          ]}
        >
          <Text style={{ color: theme.colors[color], fontSize: 23 }}>
            {color === 'RED' ? '♙' : '♟'}
          </Text>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text numberOfLines={1} style={s.playerName}>
            {seat ? name : 'Empty seat'}
          </Text>
          <Text style={[s.playerHint, { color: active ? theme.colors[color] : ui.muted }]}>
            {seat
              ? active
                ? match.options.mode === 'ai' && color !== 'RED'
                  ? '●  THINKING'
                  : '●  YOUR TURN'
                : `${seat.pieces.filter((p) => p.progress === 57).length}/4 home${match.options.mode === 'ai' && color !== 'RED' ? ' · CPU' : ''}`
              : 'Not playing'}
          </Text>
        </View>
      </View>
    );
  }
  if (!match || !current)
    return (
      <Screen nav={false} back>
        <Card>
          {error ? (
            <>
              <Body>{error}</Body>
              <Button onPress={() => router.replace('/')}>Back to lobby</Button>
            </>
          ) : (
            <ActivityIndicator color={theme.accent} />
          )}
        </Card>
      </Screen>
    );
  const status =
    match.state.status === 'FINISHED'
      ? 'A good game, well played.'
      : busy
        ? 'Rolling & saving…'
        : match.state.lastRoll !== null
          ? game.moves.length > 0
            ? `${game.moves.length} playable ${game.moves.length === 1 ? 'coin' : 'coins'} ? tap one on the board`
            : humanTurn
              ? match.state.consecutiveSixes === 3
                ? 'Three sixes! Your turn passes.'
                : 'No moves this time. Passing the dice…'
              : 'Computer is choosing a move…'
          : humanTurn
            ? `${match.options.mode === 'local' ? current.color.toLowerCase() + ' player, ' : ''}tap the dice to roll`
            : 'Computer is getting ready…';
  const boardProps = {
    state: match.state,
    validMoves: busy || menu || rules ? [] : game.moves,
    size: boardSize,
    theme,
    motionEnabled,
    onSelectMove: game.move,
  };
  return (
    <Screen nav={false}>
      <View style={[s.arena, { maxWidth: boardSize + 16 }]}>
        <View style={shared.between}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Pause game"
            onPress={() => setMenu(true)}
            style={[s.iconButton, { backgroundColor: theme.surface }]}
          >
            <Text style={s.icon}>☰</Text>
          </Pressable>
          <View style={{ alignItems: 'center', gap: 5 }}>
            <Label color={theme.accent}>
              {match.options.mode === 'ai' ? 'SOLO TABLE' : 'FRIENDS AT THE TABLE'}
            </Label>
            <Text style={shared.small}>
              {match.options.players} players ·{' '}
              {match.options.mode === 'ai' ? 'Win +150 coins' : 'Pass & play'}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Switch to ${profile.board3d ? '2D' : '3D'} board`}
            disabled={saving}
            onPress={() => void toggleView()}
            style={[s.viewButton, { borderColor: `${theme.accent}60` }]}
          >
            <Text style={{ color: theme.accent, fontWeight: '800', fontSize: 12 }}>
              {profile.board3d ? '3D' : '2D'} ⇄
            </Text>
          </Pressable>
        </View>
        <View style={s.players}>
          {player('RED')}
          {player('GREEN')}
        </View>
        <View style={{ alignItems: 'center', gap: 10 }}>
          {profile.board3d ? (
            <BoardBoundary
              key={profile.board}
              fallback={
                <View style={{ gap: 8 }}>
                  <Text style={shared.small}>
                    3D is unavailable on this device. You can keep playing in 2D.
                  </Text>
                  <Board2D {...boardProps} />
                </View>
              }
            >
              <Suspense
                fallback={
                  <View
                    style={{
                      width: boardSize,
                      height: boardSize,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ActivityIndicator color={theme.accent} />
                  </View>
                }
              >
                <Board3D {...boardProps} rotation={rotation} />
              </Suspense>
            </BoardBoundary>
          ) : (
            <View
              style={[
                s.boardFrame,
                { backgroundColor: theme.frame, borderBottomColor: `${theme.frame}99` },
              ]}
            >
              <Board2D {...boardProps} />
            </View>
          )}
          {profile.board3d && (
            <View style={shared.row}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Rotate board left"
                onPress={() => setRotation(rotation - Math.PI / 4)}
                style={s.rotate}
              >
                <Text style={s.icon}>↶</Text>
              </Pressable>
              <Text style={shared.small}>Explore your table</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Rotate board right"
                onPress={() => setRotation(rotation + Math.PI / 4)}
                style={s.rotate}
              >
                <Text style={s.icon}>↷</Text>
              </Pressable>
            </View>
          )}
        </View>
        <View style={s.players}>
          {player('BLUE')}
          {player('YELLOW')}
        </View>
        <View style={[s.console, { backgroundColor: theme.surface }]}>
          <View style={{ flex: 1, gap: 9 }}>
            <Label color={theme.accent}>
              {match.state.consecutiveSixes > 0 && match.state.lastRoll === null
                ? 'BONUS ROLL'
                : 'MAKE YOUR MOVE'}
            </Label>
            <Text style={s.consoleTitle}>
              {humanTurn ? 'Your lucky moment.' : 'A little patience…'}
            </Text>
            <Text accessibilityLiveRegion="polite" style={shared.small}>
              {status}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Roll dice"
            accessibilityState={{ disabled: !humanTurn || busy || match.state.lastRoll !== null }}
            disabled={
              !humanTurn ||
              busy ||
              match.state.lastRoll !== null ||
              match.state.status === 'FINISHED'
            }
            onPress={game.roll}
            style={({ pressed }) => [
              s.diceTray,
              { borderColor: humanTurn ? theme.accent : '#ffffff15', opacity: pressed ? 0.75 : 1 },
            ]}
          >
            <AnimatedDice
              value={match.lastDie}
              finish={profile.dice}
              rolling={game.activity === 'rolling'}
              ready={humanTurn && !busy && match.state.lastRoll === null}
              motionEnabled={motionEnabled}
            />
            <Text style={[s.rollLabel, { color: theme.accent }]}>
              {busy
                ? 'ROLLING…'
                : humanTurn && match.state.lastRoll === null
                  ? 'TAP TO ROLL'
                  : 'LAST ROLL'}
            </Text>
          </Pressable>
        </View>
        {(notice || error) && (
          <View style={{ gap: 8 }}>
            <Text accessibilityLiveRegion="polite" style={shared.error}>
              {error ?? notice}
            </Text>
            {error && (
              <Button compact secondary onPress={game.retry}>
                Retry turn
              </Button>
            )}
          </View>
        )}
        <Pressable
          accessibilityRole="button"
          onPress={() => setRules(true)}
          style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={shared.small}>ⓘ How to play · Club rules</Text>
        </Pressable>
      </View>
      <Sheet visible={menu} onClose={() => setMenu(false)} title="Take your time.">
        <Body>
          Your game is paused and saved on this device. Your table will be here when you get back.
        </Body>
        <Button onPress={() => setMenu(false)}>Back to the game</Button>
        <Button secondary disabled={busy} onPress={() => router.replace('/')}>
          Save & return to lobby
        </Button>
        <Button
          secondary
          onPress={() => {
            setMenu(false);
            setRules(true);
          }}
        >
          How to play
        </Button>
      </Sheet>
      <Sheet visible={rules} onClose={() => setRules(false)} title="A classic for a reason.">
        {[
          [
            '01',
            'Make an entrance',
            'Roll a six to move a piece out of your yard. A six gives you another roll.',
          ],
          [
            '02',
            'Make your way home',
            'Move clockwise around the track, then up your colored lane. You need an exact roll to finish.',
          ],
          [
            '03',
            'A friendly little rivalry',
            'Land on an opponent to send their piece back. Star and entry squares are safe. Captures and finishes earn a bonus turn.',
          ],
          [
            '04',
            'Keep it fair',
            'Three consecutive sixes forfeit the third roll. Earlier moves remain. Pieces may share squares; this edition has no blocking rule.',
          ],
          [
            '05',
            'Bring everyone home',
            'The first player to finish all four pieces wins. Solo wins earn 150 coins; other completed solo games earn 40.',
          ],
        ].map(([n, title, description]) => (
          <View key={n} style={shared.row}>
            <Text style={{ color: theme.accent, fontWeight: '900', fontSize: 18 }}>{n}</Text>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={[shared.sectionTitle, { fontSize: 15 }]}>{title}</Text>
              <Body>{description}</Body>
            </View>
          </View>
        ))}
      </Sheet>
      <Sheet
        visible={match.state.status === 'FINISHED' && !busy}
        onClose={() => undefined}
        title={
          match.state.winnerColor === 'RED' ? 'A winning kind of day.' : 'That was a good game.'
        }
      >
        <Text style={{ fontSize: 64, textAlign: 'center' }}>🏆</Text>
        <Text style={[s.winTitle, { color: theme.colors[match.state.winnerColor ?? 'RED'] }]}>
          {match.state.winnerColor} WINS
        </Text>
        <Body>All four pieces home. Time to enjoy the moment.</Body>
        {match.options.mode === 'ai' && (
          <Card>
            <Text
              style={{ color: theme.accent, fontSize: 30, fontWeight: '900', textAlign: 'center' }}
            >
              +{match.state.winnerColor === 'RED' ? 150 : 40} coins
            </Text>
            <Text style={[shared.small, { textAlign: 'center' }]}>For a game well played.</Text>
          </Card>
        )}
        {notice && <Text style={shared.error}>{notice}</Text>}
        <Button disabled={saving} onPress={() => void finish()}>
          {saving ? 'Saving result…' : 'Save result & back to club'}
        </Button>
      </Sheet>
    </Screen>
  );
}
const s = StyleSheet.create({
  arena: { width: '100%', alignSelf: 'center', gap: 16 },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { color: ui.muted, fontSize: 23 },
  viewButton: {
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  players: { flexDirection: 'row', gap: 14, justifyContent: 'space-between' },
  player: {
    flex: 1,
    borderWidth: 1,
    padding: 8,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    width: 34,
    height: 36,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerName: { fontSize: 11, color: ui.text, fontWeight: '800' },
  playerHint: { fontSize: 8, fontWeight: '700', letterSpacing: 0.3 },
  boardFrame: {
    padding: 7,
    borderRadius: 15,
    borderBottomWidth: 5,
    boxShadow: '0 8px 24px #00000050',
  },
  rotate: {
    width: 44,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff06',
    borderRadius: 10,
  },
  console: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: ui.line,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  consoleTitle: { color: ui.text, fontSize: 18, fontWeight: '800' },
  diceTray: {
    padding: 12,
    gap: 10,
    alignItems: 'center',
    borderRadius: 17,
    backgroundColor: '#00000020',
    borderWidth: 1,
  },
  rollLabel: { fontWeight: '900', fontSize: 8, letterSpacing: 1 },
  winTitle: { fontSize: 30, fontWeight: '900', textAlign: 'center' },
});
