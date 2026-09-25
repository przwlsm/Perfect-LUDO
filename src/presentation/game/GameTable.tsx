import { Component, Suspense, lazy, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { profileService } from '@/config/container';
import type { DieValue, GameState, Move, Player, PlayerColor } from '@/domain';
import { Board2D } from '../board/Board2D';
import type { Board3DProps } from '../board/Board3D';
import { getCellForPiece } from '../board/getCellForPiece';
import { seatPlacement, tableLayout, twoPlayerLayout } from '../board/tableLayout';
import { AnimatedDice } from '../components/AnimatedDice';
import { Body, Button, Card, Label, Screen, shared, Sheet } from '../components/Kit';
import { useProfile } from '../state/ProfileProvider';
import { getCardDesign, ui } from '../theme/themes';

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
}: {
  game: GameSource;
  label: string;
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
  const [stackMoves, setStackMoves] = useState<Move[]>([]);
  const [savingView, setSavingView] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const { match, current, humanTurn, busy, error } = game;

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

  const layout = tableLayout(
    tableArea.width || 360,
    tableArea.height || 480,
    match.state.players.length,
  );
  const stacked = twoPlayerLayout(tableArea.width || 360, tableArea.height || 480);
  // Pass & play shares one device between every seat, so "closest to the
  // player" is meaningless there; it only applies when exactly one seat is
  // this device's own, in a 2-player game.
  const myColor = seatRotation ? null : game.myColor;
  const twoPlayerLocalView = myColor !== null && match.state.players.length === 2;
  const opponentColor = twoPlayerLocalView
    ? (match.state.players.find((p) => p.color !== myColor)?.color ?? null)
    : null;
  // A 2-player table always seats RED and YELLOW (see seatColors); YELLOW's
  // default corner is already bottom-right, so only RED needs flipping there.
  const boardFlip = twoPlayerLocalView && myColor === 'RED';
  const boardSize = twoPlayerLocalView ? stacked.board : layout.board;

  const boardProps = {
    state: match.state,
    validMoves: busy || menu || rules ? [] : game.moves,
    size: boardSize,
    theme,
    motionEnabled,
    flip: boardFlip,
    onSelectMove: (selected: Move) => {
      const pieces = match.state.players.flatMap((p) =>
        p.pieces.map((piece, slot) => ({ piece, slot })),
      );
      const target = pieces.find((p) => p.piece.id === selected.pieceId)!;
      const cell = getCellForPiece(target.piece, target.slot, match.state.players.length).join(',');
      const choices = game.moves.filter((move) => {
        const p = pieces.find((entry) => entry.piece.id === move.pieceId)!;
        return getCellForPiece(p.piece, p.slot, match.state.players.length).join(',') === cell;
      });
      if (choices.length > 1) setStackMoves(choices);
      else game.move(selected);
    },
  };

  /** The dice icon and label shared by both ways a seat's control can sit on screen. */
  function diceFace(color: PlayerColor, size: number, active: boolean, canRoll: boolean) {
    return (
      <>
        <AnimatedDice
          size={size - 13}
          value={game.seatRolls[color] ?? null}
          finish={profile.dice}
          rolling={Boolean(active && game.activity === 'rolling')}
          ready={canRoll}
          motionEnabled={motionEnabled}
        />
        <Text
          numberOfLines={1}
          style={{ fontSize: 7, fontWeight: '900', color: active ? theme.colors[color] : ui.muted }}
        >
          {canRoll ? 'ROLL' : color}
        </Text>
      </>
    );
  }

  /** Floats a seat's control over the board, rotated to face that seat (pass & play, 3+ players). */
  function seatControl(color: PlayerColor) {
    if (!match) return null;
    const seat = match.state.players.find((p) => p.color === color);
    if (!seat) return null;
    const active = current?.color === color && match.state.status !== 'FINISHED';
    const placement = seatPlacement(color, match.state.players.length, layout);
    const canRoll = Boolean(active && humanTurn && !busy && match.state.lastRoll === null);
    return (
      <Pressable
        key={color}
        accessibilityRole="button"
        accessibilityLabel={`Roll dice for ${color}`}
        accessibilityHint={canRoll ? 'Your turn. Tap to roll.' : 'Wait for your turn.'}
        disabled={!canRoll}
        onPress={game.roll}
        style={[
          profile.pack && getCardDesign(profile.pack),
          {
            position: 'absolute',
            left: placement.x - layout.control / 2,
            top: placement.y - layout.control / 2,
            width: layout.control,
            height: layout.control,
            borderRadius: 14,
            borderWidth: active ? 2 : 1,
            borderColor: active ? theme.colors[color] : `${theme.colors[color]}60`,
            backgroundColor: theme.surface,
            alignItems: 'center',
            justifyContent: 'center',
            transform: [{ rotate: `${seatRotation ? placement.rotation : 0}deg` }],
          },
        ]}
      >
        {diceFace(color, layout.control, active, canRoll)}
      </Pressable>
    );
  }

  /**
   * A seat's control as its own row above or below the board, rather than an
   * overlay on top of it — the 2-player layout, where the board has grown to
   * use the width the old side margins spent on dice.
   */
  function stackedDiceControl(color: PlayerColor) {
    if (!match) return null;
    const active = current?.color === color && match.state.status !== 'FINISHED';
    const canRoll = Boolean(active && humanTurn && !busy && match.state.lastRoll === null);
    return (
      <Pressable
        key={color}
        accessibilityRole="button"
        accessibilityLabel={`Roll dice for ${color}`}
        accessibilityHint={canRoll ? 'Your turn. Tap to roll.' : 'Wait for your turn.'}
        disabled={!canRoll}
        onPress={game.roll}
        style={[
          profile.pack && getCardDesign(profile.pack),
          {
            width: stacked.control,
            height: stacked.control,
            borderRadius: 14,
            borderWidth: active ? 2 : 1,
            borderColor: active ? theme.colors[color] : `${theme.colors[color]}60`,
            backgroundColor: theme.surface,
            alignItems: 'center',
            justifyContent: 'center',
          },
        ]}
      >
        {diceFace(color, stacked.control, active, canRoll)}
      </Pressable>
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
    <SafeAreaView style={{ flex: 1, overflow: 'hidden', backgroundColor: theme.background }}>
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
        <View style={{ alignItems: 'center', gap: 3 }}>
          <Label color={theme.accent}>{label}</Label>
          <Text style={shared.small}>
            {match.state.players.length} players / {profile.board3d ? '3D' : 'Classic'} table
          </Text>
        </View>
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
        {twoPlayerLocalView ? (
          // Portrait: opponent above, me below. Landscape: opponent left, me
          // right — nearest my corner, so "my" dice stays on my side.
          <View
            testID="game-table"
            style={{
              flexDirection: stacked.side ? 'row' : 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: stacked.gap,
            }}
          >
            {opponentColor && stackedDiceControl(opponentColor)}
            <View style={{ width: boardSize, height: boardSize }}>{board}</View>
            {myColor && stackedDiceControl(myColor)}
          </View>
        ) : (
          <View testID="game-table" style={{ width: layout.size, height: layout.size }}>
            <View style={{ position: 'absolute', left: layout.inset, top: layout.inset }}>
              {board}
            </View>
            {match.state.players.map((seat) => seatControl(seat.color))}
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

      <Sheet
        visible={stackMoves.length > 0}
        onClose={() => setStackMoves([])}
        title="Choose a stacked coin"
      >
        <Body>These coins share a square. Choose which one to move.</Body>
        {stackMoves.map((move) => (
          <Button
            key={move.pieceId}
            onPress={() => {
              game.move(move);
              setStackMoves([]);
            }}
          >
            {move.pieceId.split('-')[0]} coin {Number(move.pieceId.split('-')[1]) + 1}
          </Button>
        ))}
      </Sheet>

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
    </SafeAreaView>
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
    'The first player to finish all four pieces wins. Signed-in players earn 150 coins for a win and 40 for finishing a game.',
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
