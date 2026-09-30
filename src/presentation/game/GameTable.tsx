import { Component, Suspense, lazy, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../components/AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { profileService } from '@/config/container';
import {
  REACTION_COOLDOWN_MS,
  REACTIONS,
  VARIANT_INFO,
  variantOf,
  type DieValue,
  type GameState,
  type Move,
  type Player,
  type PlayerColor,
  type Reaction,
} from '@/domain';
import Animated, { FadeOut, ZoomIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import type { ReactionBubble } from '../hooks/useReactions';
import { Board2D } from '../board/Board2D';
import type { Board3DProps } from '../board/Board3D';
import { tableArrangement } from '../board/tableLayout';
import { PlayerPanel } from './PlayerPanel';
import { RoundBoardOverlay } from './RoundBoardOverlay';
import { ZoomableBoard } from '../board/ZoomableBoard';
import { Body, Button, Card, Label, Screen, shared, Sheet } from '../components/Kit';
import { useProfile } from '../state/ProfileProvider';
import { ui } from '../theme/themes';

/**
 * Loaded on demand so the 3D renderer never costs the 2D table anything.
 * `async` so that a module that throws while *loading* (a synchronous
 * throw inside Metro's require, which is what a bad native import does)
 * becomes a rejection this catch can turn into the 2D board, instead of
 * escaping React entirely and tearing the whole app down to a blank screen.
 */
const Board3D = lazy(async () => {
  try {
    const module = await import('../board/Board3D');
    return { default: module.Board3D };
  } catch {
    return { default: Board3DUnavailable };
  }
});

/** Stands in for the 3D board when it cannot load; same props, drawn flat. */
function Board3DUnavailable(props: Board3DProps) {
  return <Board2D {...props} />;
}

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

/**
 * Everything a turn-based board needs, regardless of who is producing the
 * turns. Offline (AI or pass-and-play) and online matches satisfy this the
 * same way, which is what lets one board render both.
 */
/** True (and restarts the clock) when a reaction may be sent again. */
function takeCooldown(last: { current: number }): boolean {
  const now = Date.now();
  if (now - last.current < REACTION_COOLDOWN_MS) return false;
  last.current = now;
  return true;
}

export interface GameSource {
  readonly match: {
    readonly id: string;
    readonly state: GameState;
    readonly lastDie: DieValue | null;
  } | null;
  readonly busy: boolean;
  readonly activity: 'rolling' | 'moving' | null;
  readonly seatRolls: Partial<Record<PlayerColor, DieValue>>;
  readonly error: string | null;
  readonly current: Player | null;
  /** True when this device is allowed to act right now. */
  readonly humanTurn: boolean;
  /**
   * The single seat this device plays, when there is one — null in
   * pass-and-play, where every seat shares the device in turn. Lets a
   * 2-player table put that seat nearest the local player regardless of
   * which colour it happens to be.
   */
  readonly myColor: PlayerColor | null;
  readonly moves: readonly Move[];
  roll(): void;
  move(selected: Move): void;
  retry(): void;
}

export function GameTable({
  game,
  label,
  prize,
  statusLine,
  seatRotation,
  motionEnabled,
  tableArea,
  onTableLayout,
  menu,
  setMenu,
  rules,
  setRules,
  pauseBody,
  exitLabel,
  onExit,
  resultSheet,
  seatLabel,
  reactions,
  turnClock = null,
  livesFor,
}: {
  /** Online only: each seat's lifelines, shown under its name. */
  livesFor?: (color: PlayerColor) => { left: number; total: number; out: boolean } | null;
  /** Seconds left on the current turn (online only); null when untimed. */
  turnClock?: number | null;
  /** Emoji at the table: the bubbles to float, and how to send one (absent: no picker). */
  reactions?: {
    readonly bubbles: readonly ReactionBubble[];
    readonly send?: (emoji: Reaction) => void;
  };
  game: GameSource;
  label: string;
  /** What this table pays, shown under the label, e.g. "1st +100 · 2nd +50". */
  prize?: string;
  /** The name shown on each seat's panel; defaults to the colour. */
  seatLabel?: (color: PlayerColor) => string;
  statusLine: string;
  /** Pass-and-play turns each control to face its seat; nothing else should. */
  seatRotation: boolean;
  motionEnabled: boolean;
  tableArea: { width: number; height: number };
  onTableLayout(area: { width: number; height: number }): void;
  menu: boolean;
  setMenu(open: boolean): void;
  rules: boolean;
  setRules(open: boolean): void;
  pauseBody: string;
  exitLabel: string;
  onExit(): void;
  resultSheet: ReactNode;
}) {
  const { profile, theme, perform } = useProfile();
  const insets = useSafeAreaInsets();
  const [savingView, setSavingView] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const { match, current, humanTurn, busy, error } = game;
  const [picker, setPicker] = useState(false);
  const lastSent = useRef(0);
  function react(emoji: Reaction) {
    setPicker(false);
    if (!reactions?.send || !takeCooldown(lastSent)) return;
    reactions.send(emoji);
  }

  async function toggleView() {
    if (savingView) return;
    setSavingView(true);
    try {
      await perform(() => profileService.update({ board3d: !profile.board3d }));
    } catch {
      setNotice('Could not save board preference. Please try again.');
    } finally {
      setSavingView(false);
    }
  }

  if (!match || !current) {
    return (
      <Screen nav={false} back>
        <Card>
          {error ? (
            <>
              <Body>{error}</Body>
              <Button onPress={game.retry}>Try again</Button>
              <Button onPress={() => router.replace('/')}>Back to lobby</Button>
            </>
          ) : (
            <ActivityIndicator color={theme.accent} />
          )}
        </Card>
      </Screen>
    );
  }

  // Pass & play shares one device between every seat, so "nearest the
  // player" means nothing there. Otherwise this device's seat is turned to
  // the bottom of the screen: the classic board can only rotate 180°, which
  // is exactly what moves a top-corner yard (RED, GREEN) to the bottom.
  const myColor = seatRotation ? null : game.myColor;
  const classic = match.state.players.length <= 4;
  const boardFlip = classic && (myColor === 'RED' || myColor === 'GREEN');
  const table = tableArrangement(
    tableArea.width || 360,
    tableArea.height || 480,
    match.state.players.map((p) => p.color),
    boardFlip,
  );
  const boardSize = table.board;

  const boardProps = {
    state: match.state,
    validMoves: busy || menu || rules ? [] : game.moves,
    size: boardSize,
    theme,
    motionEnabled,
    flip: boardFlip,
    homeStyle: profile.style === 'round-homes' ? ('round' as const) : ('triangle' as const),
    // Coins sharing a square are the same colour at the same progress, so
    // moving any one of them has exactly the same result: move the one tapped.
    onSelectMove: (selected: Move) => game.move(selected),
  };

  const nameOf = (color: PlayerColor) =>
    seatLabel?.(color) ?? color.charAt(0) + color.slice(1).toLowerCase();

  /** One seat's panel, or an empty slot that keeps the others beside their own yard. */
  function panel(color: PlayerColor | null, index: number, side: 'before' | 'after') {
    const size = { width: table.panel.width, height: table.panel.height };
    if (!match || !color) return <View key={`empty-${side}-${index}`} style={size} />;
    const active = current?.color === color && match.state.status !== 'FINISHED';
    const canRoll = Boolean(active && humanTurn && !busy && match.state.lastRoll === null);
    const row = side === 'before' ? table.before : table.after;
    // Panels on the right-hand end of a row, or in the right column, mirror
    // so their dice faces the board centre.
    const mirrored =
      table.orientation === 'landscape' ? side === 'after' : index === row.length - 1 && index > 0;
    return (
      <PlayerPanel
        key={color}
        color={theme.colors[color]}
        label={nameOf(color)}
        width={size.width}
        height={size.height}
        mirrored={mirrored}
        rotated={seatRotation && table.orientation === 'portrait' && side === 'before'}
        active={active}
        canRoll={canRoll}
        rolling={Boolean(active && game.activity === 'rolling')}
        value={game.seatRolls[color] ?? null}
        diceFinish={profile.dice}
        surface={theme.surface}
        accent={theme.accent}
        motionEnabled={motionEnabled}
        onRoll={game.roll}
        secondsLeft={active ? turnClock : null}
        lives={livesFor?.(color) ?? null}
      />
    );
  }

  const board = profile.board3d ? (
    <BoardBoundary key={profile.board} fallback={<Board2D {...boardProps} />}>
      <Suspense
        fallback={
          <View style={{ width: boardSize, height: boardSize, justifyContent: 'center' }}>
            <ActivityIndicator color={theme.accent} />
          </View>
        }
      >
        <Board3D {...boardProps} />
      </Suspense>
    </BoardBoundary>
  ) : (
    <Board2D {...boardProps} />
  );

  return (
    <View
      style={{
        flex: 1,
        overflow: 'hidden',
        backgroundColor: theme.background,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
        paddingLeft: insets.left,
        paddingRight: insets.right,
      }}
    >
      <View style={s.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Pause game"
          onPress={() => setMenu(true)}
          android_ripple={{ color: '#ffffff20' }}
          style={[s.iconButton, { backgroundColor: theme.surface }]}
        >
          <Text style={s.icon}>{'☰'}</Text>
        </Pressable>
        {reactions?.send ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send a reaction"
            accessibilityState={{ expanded: picker }}
            onPress={() => setPicker((open) => !open)}
            android_ripple={{ color: '#ffffff20' }}
            style={[
              s.iconButton,
              { backgroundColor: picker ? `${theme.accent}30` : theme.surface },
            ]}
          >
            <Ionicons name="happy" size={24} color={picker ? theme.accent : ui.muted} />
          </Pressable>
        ) : (
          <View style={{ width: 44 }} />
        )}
        <View style={{ flex: 1, alignItems: 'center', gap: 3 }}>
          <Label color={theme.accent}>{label}</Label>
          {prize ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="trophy" size={11} color={ui.gold} />
              <Text style={{ color: ui.gold, fontSize: 11, fontWeight: '800' }}>{prize}</Text>
            </View>
          ) : (
            <Text style={shared.small}>
              {match.state.players.length} players / {profile.board3d ? '3D' : 'Classic'} table
            </Text>
          )}
        </View>
        <View style={{ width: 44 }} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Switch to ${profile.board3d ? '2D' : '3D'} board`}
          disabled={savingView}
          onPress={() => void toggleView()}
          android_ripple={{ color: `${theme.accent}25` }}
          style={[s.viewButton, { borderColor: theme.accent }]}
        >
          <Text style={{ color: theme.accent, fontWeight: '800' }}>
            {profile.board3d ? '3D' : '2D'}
          </Text>
        </Pressable>
      </View>

      <View
        style={{ flex: 1, minHeight: 0, alignItems: 'center', justifyContent: 'center' }}
        onLayout={({ nativeEvent }) => onTableLayout(nativeEvent.layout)}
      >
        {reactions && reactions.bubbles.length > 0 && (
          <View pointerEvents="none" style={s.bubbles}>
            {reactions.bubbles.map((bubble) => (
              <Animated.View
                key={bubble.id}
                entering={motionEnabled ? ZoomIn.springify().damping(11) : undefined}
                exiting={motionEnabled ? FadeOut.duration(250) : undefined}
                style={[s.bubble, { borderColor: theme.colors[bubble.color] }]}
              >
                <View style={[s.bubbleDot, { backgroundColor: theme.colors[bubble.color] }]} />
                <Text numberOfLines={1} style={s.bubbleName}>
                  {nameOf(bubble.color)}
                </Text>
                <Text style={s.bubbleEmoji}>{bubble.emoji}</Text>
              </Animated.View>
            ))}
          </View>
        )}
        {picker && reactions?.send && (
          <Animated.View
            entering={motionEnabled ? ZoomIn.duration(160) : undefined}
            style={[s.picker, { backgroundColor: theme.surface }]}
          >
            {REACTIONS.map((emoji) => (
              <Pressable
                key={emoji}
                accessibilityRole="button"
                accessibilityLabel={`React ${emoji}`}
                onPress={() => react(emoji)}
                android_ripple={{ color: '#ffffff25', borderless: true }}
                style={s.pickerItem}
              >
                <Text style={{ fontSize: 26 }}>{emoji}</Text>
              </Pressable>
            ))}
          </Animated.View>
        )}
        {!classic ? (
          <View testID="game-table" style={{ width: boardSize, height: boardSize }}>
            <ZoomableBoard size={boardSize}>
              {board}
              <RoundBoardOverlay
                size={boardSize}
                colors={match.state.players.map((p) => p.color)}
                palette={theme.colors}
                nameOf={nameOf}
                current={match.state.status === 'FINISHED' ? null : current.color}
                canRoll={Boolean(
                  humanTurn &&
                  !busy &&
                  match.state.lastRoll === null &&
                  match.state.status !== 'FINISHED',
                )}
                rolling={game.activity === 'rolling'}
                value={game.seatRolls[current.color] ?? null}
                diceFinish={profile.dice}
                surface={theme.surface}
                faceSeats={seatRotation}
                tilted={profile.board3d}
                motionEnabled={motionEnabled}
                onRoll={game.roll}
              />
            </ZoomableBoard>
          </View>
        ) : (
          <View
            testID="game-table"
            style={{
              flexDirection: table.orientation === 'portrait' ? 'column' : 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: table.gap,
            }}
          >
            <View
              style={{
                flexDirection: table.orientation === 'portrait' ? 'row' : 'column',
                justifyContent: 'space-between',
                width: table.orientation === 'portrait' ? boardSize : table.panel.width,
                height: table.orientation === 'portrait' ? table.panel.height : boardSize,
              }}
            >
              {table.before.map((color, i) => panel(color, i, 'before'))}
            </View>
            <View style={{ width: boardSize, height: boardSize }}>{board}</View>
            <View
              style={{
                flexDirection: table.orientation === 'portrait' ? 'row' : 'column',
                justifyContent: 'space-between',
                width: table.orientation === 'portrait' ? boardSize : table.panel.width,
                height: table.orientation === 'portrait' ? table.panel.height : boardSize,
              }}
            >
              {table.after.map((color, i) => panel(color, i, 'after'))}
            </View>
          </View>
        )}
      </View>

      <View style={{ paddingHorizontal: 16, paddingVertical: 8, alignItems: 'center', gap: 4 }}>
        <Text
          accessibilityLiveRegion="polite"
          style={[shared.small, { textAlign: 'center', color: ui.text }]}
        >
          {statusLine}
        </Text>
        {(notice || error) && <Text style={shared.error}>{error ?? notice}</Text>}
        {error && (
          <Button compact secondary onPress={game.retry}>
            Retry turn
          </Button>
        )}
      </View>

      <Sheet visible={menu} onClose={() => setMenu(false)} title="Take your time.">
        <Body>{pauseBody}</Body>
        <Button onPress={() => setMenu(false)}>Back to the game</Button>
        <Button secondary disabled={busy} onPress={onExit}>
          {exitLabel}
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
        {variantOf(match.state) !== 'classic' && (
          <Card style={{ borderColor: `${theme.accent}55` }}>
            <Label color={theme.accent}>THIS TABLE</Label>
            <Text style={[shared.sectionTitle, { fontSize: 15 }]}>
              {VARIANT_INFO[variantOf(match.state)].title}
            </Text>
            <Body>{VARIANT_INFO[variantOf(match.state)].description}</Body>
          </Card>
        )}
        {RULES.map(([n, title, description]) => (
          <View key={n} style={shared.row}>
            <Text style={{ color: theme.accent, fontWeight: '900', fontSize: 18 }}>{n}</Text>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={[shared.sectionTitle, { fontSize: 15 }]}>{title}</Text>
              <Body>{description}</Body>
            </View>
          </View>
        ))}
      </Sheet>

      {resultSheet}
    </View>
  );
}

const RULES: readonly (readonly [string, string, string])[] = [
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
    'Three consecutive sixes forfeit the third roll. Earlier moves remain. Two coins of the same color block an opponent from landing on that square.',
  ],
  [
    '05',
    'Bring everyone home',
    'The first player to finish all four pieces wins. Signed-in players earn coins and XP: online wins pay the most, and every online game scores tournament points.',
  ],
];

export const gameTableStyles = StyleSheet.create({
  winTitle: { fontSize: 30, fontWeight: '900', textAlign: 'center' },
});

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  iconButton: {
    width: 44,
    height: 44,
    minWidth: 44,
    minHeight: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { color: ui.muted, fontSize: 23 },
  bubbles: {
    position: 'absolute',
    top: 6,
    left: 12,
    right: 12,
    zIndex: 20,
    alignItems: 'center',
    gap: 6,
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 10,
    paddingRight: 6,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 2,
    backgroundColor: '#0e1322ee',
    boxShadow: '0 6px 18px #00000080',
    maxWidth: '90%',
  },
  bubbleDot: { width: 10, height: 10, borderRadius: 5 },
  bubbleName: { color: ui.text, fontWeight: '800', fontSize: 13, flexShrink: 1 },
  bubbleEmoji: { fontSize: 28 },
  picker: {
    position: 'absolute',
    top: 4,
    left: 12,
    right: 12,
    zIndex: 30,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ffffff20',
    boxShadow: '0 10px 28px #00000090',
  },
  pickerItem: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  viewButton: {
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 44,
    minWidth: 44,
    minHeight: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
