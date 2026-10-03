import { useMemo, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { goBackOrHome } from '../platform/navigation';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CAPTURES_TO_WIN, type Side } from 'baghchal-engine';
import { haptics, onlineMatches, rewardedAds, sounds, walletRepository } from '@/config/container';
import type { MatchOutcome, OnlineMatchSnapshot } from '@/domain/entities/OnlineMatch';
import { SILENT_HAPTICS } from '@/domain/ports/IHaptics';
import { SILENT_SOUNDS } from '@/domain/ports/ISoundPlayer';
import type { IOnlineMatchRepository } from '@/domain/ports/IOnlineMatchRepository';
import { Board } from '../board/Board';
import { useOnlineMatch } from '../hooks/useOnlineMatch';
import { confirmAction } from '../platform/confirm';
import type { GameFeedback } from '../hooks/useLocalGame';
import { useSettings } from '../state/SettingsProvider';
import { useWallet } from '../state/WalletProvider';
import { colors } from '../theme/colors';

const BOARD_MAX = 440;

export function OnlineMatchScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!onlineMatches || !id) {
    return (
      <SafeAreaView style={styles.screen}>
        <Text style={styles.note}>This match is not available.</Text>
      </SafeAreaView>
    );
  }
  return <Match repo={onlineMatches} matchId={id} />;
}

function Match({
  repo,
  matchId,
}: {
  readonly repo: IOnlineMatchRepository;
  readonly matchId: string;
}) {
  const { settings } = useSettings();
  const { wallet, look, adopt, refresh } = useWallet();
  const feedback = useMemo<GameFeedback>(
    () => ({
      haptics: settings.haptics ? haptics : SILENT_HAPTICS,
      sounds: settings.sound ? sounds : SILENT_SOUNDS,
    }),
    [settings.haptics, settings.sound],
  );
  const match = useOnlineMatch(repo, matchId, feedback);
  const { snapshot } = match;
  const { width } = useWindowDimensions();
  const size = Math.min(width - 32, BOARD_MAX);
  const [doubling, setDoubling] = useState(false);
  const [rewardNote, setRewardNote] = useState<string | null>(null);

  const leave = async () => {
    if (snapshot?.match.status !== 'ACTIVE') {
      goBackOrHome();
      return;
    }
    if (
      await confirmAction('Resign?', 'Leaving the board gives your opponent the win.', 'Resign')
    ) {
      match.resign();
    }
  };

  // The one ad on this screen: after the game, by choice, to double the coins just earned.
  const reward = snapshot?.match.myReward ?? null;
  const canDouble =
    reward !== null &&
    snapshot?.match.myRewardDoubled === false &&
    walletRepository !== null &&
    rewardedAds.supported() &&
    wallet !== null &&
    wallet.adRewardsToday.double < wallet.caps.double;
  const doubleIt = async () => {
    if (!walletRepository || !snapshot) return;
    setDoubling(true);
    try {
      if (!(await rewardedAds.show())) {
        setRewardNote('The ad did not finish, so nothing changed.');
        return;
      }
      const grant = await walletRepository.claimAdReward('double', snapshot.match.id);
      adopt(grant.wallet);
      setRewardNote(`+${grant.granted} more coins`);
      await match.reload();
    } catch (failure) {
      setRewardNote(failure instanceof Error ? failure.message : 'Could not double the reward.');
    } finally {
      setDoubling(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={leave} accessibilityRole="button" hitSlop={10}>
          <Text style={styles.headerText}>
            {snapshot?.match.status === 'ACTIVE' ? 'Resign' : '‹ Online'}
          </Text>
        </Pressable>
        {!match.connected && snapshot?.match.status === 'ACTIVE' && (
          <Text style={styles.pill}>Reconnecting…</Text>
        )}
        {match.clock !== null && (
          <Text style={[styles.clock, match.clock <= 10 && styles.clockLow]}>{match.clock}s</Text>
        )}
      </View>

      {snapshot && (
        <View style={styles.status}>
          <Text style={styles.turn}>{headline(snapshot, match.myTurn, match.sending)}</Text>
          <Text style={styles.counts}>
            {seatLine(snapshot, 'tiger')} · {seatLine(snapshot, 'goat')}
          </Text>
          <Text style={styles.counts}>
            Goats in hand {snapshot.match.state.goatsInHand} · Captured{' '}
            {snapshot.match.state.goatsCaptured}/{CAPTURES_TO_WIN}
          </Text>
        </View>
      )}

      {snapshot && (
        <Board
          size={size}
          game={snapshot.match.state}
          pieces={match.pieces}
          selected={match.selected}
          targets={match.targets}
          hint={null}
          look={look}
          onTap={match.tap}
        />
      )}

      {match.error && <Text style={styles.error}>{match.error}</Text>}

      {match.canClaim && (
        <Pressable onPress={match.claim} accessibilityRole="button" style={styles.primary}>
          <Text style={styles.primaryText}>Opponent’s time is up: claim the win</Text>
        </Pressable>
      )}

      {snapshot?.match.outcome && (
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>
            {outcomeText(snapshot.match.outcome, snapshot.mySide)}
          </Text>
          {reward !== null && (
            <Text style={styles.reward}>
              +{reward} coins{snapshot.match.myRewardDoubled ? ', doubled' : ''}
            </Text>
          )}
          {rewardNote && <Text style={styles.counts}>{rewardNote}</Text>}
          {canDouble && (
            <Pressable
              onPress={() => void doubleIt()}
              disabled={doubling}
              accessibilityRole="button"
              style={[styles.secondary, doubling && styles.disabled]}
            >
              <Text style={styles.secondaryText}>Double it: watch an ad</Text>
            </Pressable>
          )}
          <Pressable
            onPress={() => {
              void refresh();
              goBackOrHome();
            }}
            accessibilityRole="button"
            style={styles.primary}
          >
            <Text style={styles.primaryText}>Back to Online</Text>
          </Pressable>
        </View>
      )}
      {snapshot?.match.status === 'ABANDONED' && (
        <Text style={styles.note}>This game was closed before it started.</Text>
      )}
    </SafeAreaView>
  );
}

function headline(snapshot: OnlineMatchSnapshot, myTurn: boolean, sending: boolean): string {
  const { match } = snapshot;
  if (match.outcome) return 'Game over';
  if (match.status === 'WAITING') return 'Waiting for an opponent';
  if (sending) return 'Sending…';
  if (myTurn) {
    return match.state.turn === 'goat' && match.state.goatsInHand > 0
      ? 'Your move: place a goat'
      : 'Your move';
  }
  return 'Opponent’s move';
}

function seatLine(snapshot: OnlineMatchSnapshot, side: Side): string {
  const player = snapshot.players[side];
  const name = player ? (player.displayName ?? player.username) : '—';
  const label = side === 'tiger' ? 'Tigers' : 'Goats';
  return snapshot.mySide === side ? `${label}: you` : `${label}: ${name}`;
}

function outcomeText(outcome: MatchOutcome, mySide: Side | null): string {
  if (outcome.kind === 'draw') {
    return outcome.reason === 'repetition' ? 'Draw by repetition' : 'Draw: no progress';
  }
  const won = mySide !== null && outcome.winner === mySide;
  const who =
    mySide === null
      ? outcome.winner === 'tiger'
        ? 'Tigers win'
        : 'Goats win'
      : won
        ? 'You win'
        : 'You lose';
  switch (outcome.reason) {
    case 'captures':
      return `${who}: five goats taken`;
    case 'trapped':
      return `${who}: the tigers are trapped`;
    case 'no-moves':
      return `${who}: the goats cannot move`;
    case 'timeout':
      return `${who} on time`;
    case 'resigned':
      return `${who} by resignation`;
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 16 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  headerText: { color: colors.accent, fontSize: 17, fontWeight: '600' },
  pill: { color: colors.muted, fontSize: 13 },
  clock: { color: colors.text, fontSize: 20, fontWeight: '800', fontVariant: ['tabular-nums'] },
  clockLow: { color: '#ff8a80' },
  status: { alignItems: 'center', marginBottom: 16 },
  turn: { color: colors.text, fontSize: 24, fontWeight: '700' },
  counts: { color: colors.muted, fontSize: 14, marginTop: 4 },
  note: { color: colors.muted, fontSize: 14, marginTop: 16, textAlign: 'center' },
  error: { color: '#ff8a80', fontSize: 14, marginTop: 12, textAlign: 'center' },
  reward: { color: colors.selected, fontSize: 18, fontWeight: '800', marginTop: 8 },
  primary: {
    marginTop: 16,
    backgroundColor: colors.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: 'center',
  },
  primaryText: { color: colors.onAccent, fontSize: 16, fontWeight: '700' },
  secondary: {
    marginTop: 12,
    borderColor: colors.selected,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
  },
  secondaryText: { color: colors.selected, fontSize: 15, fontWeight: '700' },
  disabled: { opacity: 0.4 },
  resultCard: {
    marginTop: 16,
    padding: 20,
    borderRadius: 16,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  resultTitle: { color: colors.text, fontSize: 20, fontWeight: '700', textAlign: 'center' },
});
