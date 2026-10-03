import { useMemo } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { goBackOrHome } from '../platform/navigation';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CAPTURES_TO_WIN, phaseOf, type GameState, type Result } from 'baghchal-engine';
import { haptics, sounds } from '@/config/container';
import { SILENT_HAPTICS } from '@/domain/ports/IHaptics';
import { SILENT_SOUNDS } from '@/domain/ports/ISoundPlayer';
import { Board } from '../board/Board';
import { parseAiOpponent } from '../game/aiOpponent';
import { MoveHistory } from '../game/MoveHistory';
import { useLocalGame, type GameFeedback } from '../hooks/useLocalGame';
import { useSettings } from '../state/SettingsProvider';
import { useWallet } from '../state/WalletProvider';
import { colors } from '../theme/colors';

const BOARD_MAX = 440;

export function GameScreen() {
  const params = useLocalSearchParams<{ ai?: string; aiSide?: string }>();
  const ai = useMemo(() => parseAiOpponent(params.ai, params.aiSide), [params.ai, params.aiSide]);
  const { settings } = useSettings();
  const { look } = useWallet();
  const feedback = useMemo<GameFeedback>(
    () => ({
      haptics: settings.haptics ? haptics : SILENT_HAPTICS,
      sounds: settings.sound ? sounds : SILENT_SOUNDS,
    }),
    [settings.haptics, settings.sound],
  );
  const {
    game,
    pieces,
    selected,
    targets,
    hint,
    history,
    thinking,
    canUndo,
    tap,
    showHint,
    undo,
    restart,
  } = useLocalGame(feedback, ai);
  const { width } = useWindowDimensions();
  const size = Math.min(width - 32, BOARD_MAX);
  const over = game.result !== null;

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <HeaderButton label="‹ Menu" onPress={() => goBackOrHome()} />
        <View style={styles.actions}>
          <HeaderButton label="Undo" onPress={undo} disabled={!canUndo} />
          <HeaderButton label="Hint" onPress={showHint} disabled={over || thinking} />
          <HeaderButton label="Restart" onPress={restart} />
        </View>
      </View>

      <View style={styles.status}>
        <Text style={styles.turn}>{headline(game, thinking)}</Text>
        <Text style={styles.counts}>
          Goats in hand {game.goatsInHand} · Captured {game.goatsCaptured}/{CAPTURES_TO_WIN}
        </Text>
      </View>

      <Board
        size={size}
        game={game}
        pieces={pieces}
        selected={selected}
        targets={targets}
        hint={hint}
        look={look}
        onTap={tap}
      />

      <MoveHistory turns={history} />

      {game.result && (
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>{resultText(game.result)}</Text>
          <Pressable onPress={restart} accessibilityRole="button" style={styles.primary}>
            <Text style={styles.primaryText}>Play again</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

interface HeaderButtonProps {
  readonly label: string;
  readonly onPress: () => void;
  readonly disabled?: boolean;
}

function HeaderButton({ label, onPress, disabled = false }: HeaderButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      hitSlop={10}
      style={disabled && styles.disabled}
    >
      <Text style={styles.headerText}>{label}</Text>
    </Pressable>
  );
}

function headline(game: GameState, thinking: boolean): string {
  if (game.result) return 'Game over';
  if (thinking) return game.turn === 'tiger' ? 'Tigers are thinking…' : 'Goats are thinking…';
  if (game.turn === 'tiger') return 'Tigers to move';
  return phaseOf(game) === 'placement' ? 'Goats: place a goat' : 'Goats to move';
}

function resultText(result: Result): string {
  if (result.kind === 'draw') {
    return result.reason === 'repetition' ? 'Draw by repetition' : 'Draw: no progress';
  }
  if (result.winner === 'goat') return 'Goats win: the tigers are trapped';
  return result.reason === 'captures'
    ? 'Tigers win: five goats taken'
    : 'Tigers win: the goats cannot move';
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 16 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  actions: { flexDirection: 'row', gap: 18 },
  headerText: { color: colors.accent, fontSize: 17, fontWeight: '600' },
  disabled: { opacity: 0.35 },
  status: { alignItems: 'center', marginBottom: 20 },
  turn: { color: colors.text, fontSize: 24, fontWeight: '700' },
  counts: { color: colors.muted, fontSize: 15, marginTop: 4 },
  resultCard: {
    marginTop: 16,
    padding: 20,
    borderRadius: 16,
    backgroundColor: colors.surface,
    alignItems: 'center',
    gap: 14,
  },
  resultTitle: { color: colors.text, fontSize: 20, fontWeight: '700', textAlign: 'center' },
  primary: {
    backgroundColor: colors.accent,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 999,
  },
  primaryText: { color: colors.onAccent, fontSize: 16, fontWeight: '700' },
});
