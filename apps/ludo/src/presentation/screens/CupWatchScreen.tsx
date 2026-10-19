import { View, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import {
  coinsHome,
  coinsToWin,
  countryFlag,
  displayNameOf,
  seatColors,
  type OnlineMatchPlayer,
  type PlayerColor,
} from '@/domain';
import { Text } from '../components/AppText';
import { Body, Button, Card, Screen, useShared } from '../components/Kit';
import { Dice } from '../components/Dice';
import { LiveDot, Pulse } from '../components/Live';
import { LudoLoader } from '../components/LudoLoader';
import { Board2D } from '../board/Board2D';
import { UserAvatar } from '../social/UserAvatar';
import { useCupWatch } from '../hooks/useCupWatch';
import { useMotionEnabled } from '../hooks/useMotionEnabled';
import { useProfile } from '../state/ProfileProvider';
import { makeStyles, useUi } from '../theme/AppearanceProvider';
import { liftByDay } from '../theme/surfaces';

/**
 * Watching another table of the player's cup, live and read-only: the board
 * as its players see it, whose turn it is and what they rolled. Tables of
 * computer players move on while they are watched; when the table is
 * decided the winner is named and the bracket is one tap away.
 */
export default function CupWatchScreen() {
  const { lobby, bracket } = useLocalSearchParams<{ lobby: string; bracket?: string }>();
  const { profile, theme } = useProfile();
  const { t } = useTranslation(['cups', 'common']);
  const { table, error } = useCupWatch(lobby);
  const motion = useMotionEnabled(profile.reducedMotion, true);
  const shared = useShared();
  const s = useStyles();
  const ui = useUi();
  const { width } = useWindowDimensions();
  const boardSize = Math.min(width - 32, 460);

  const back = () =>
    bracket
      ? router.replace({ pathname: '/cups/[id]', params: { id: bracket } })
      : router.canGoBack()
        ? router.back()
        : router.replace('/cups');

  if (!table)
    return (
      <Screen back title={t('watch.title')} subtitle={t('watch.subtitle')}>
        {error ? (
          <Card>
            <Body>{error}</Body>
            <Button secondary onPress={back}>
              {t('bracket.backToCups')}
            </Button>
          </Card>
        ) : (
          <LudoLoader motionEnabled={motion} label={t('watch.loading')} />
        )}
      </Screen>
    );

  const { snapshot, board } = table;
  const colors = seatColors(snapshot.match.playerCount);
  const playerAt = (seat: number) => snapshot.players.find((p) => p.seatIndex === seat);
  const nameOf = (p: OnlineMatchPlayer | undefined) => {
    if (!p) return '';
    const flag = countryFlag(p.country);
    return `${flag ? `${flag} ` : ''}${displayNameOf(p)}`;
  };
  const live = snapshot.match.status === 'IN_PROGRESS';
  const turn = playerAt(snapshot.match.turnSeat);
  const winner =
    snapshot.match.winnerSeat !== null ? playerAt(snapshot.match.winnerSeat) : undefined;
  const goal = coinsToWin(board);
  const status = !live
    ? winner
      ? t('watch.won', { name: nameOf(winner) })
      : t('watch.over')
    : snapshot.match.lastRoll
      ? t('watch.rolled', { name: nameOf(turn), die: snapshot.match.lastRoll })
      : t('watch.rolling', { name: nameOf(turn) });

  const panel = (seat: number) => {
    const p = playerAt(seat);
    const color: PlayerColor | undefined = colors[seat];
    if (!p || !color) return null;
    const onTurn = live && snapshot.match.turnSeat === seat;
    const isWinner = !live && snapshot.match.winnerSeat === seat;
    return (
      <View
        key={seat}
        style={[
          s.panel,
          { borderColor: onTurn || isWinner ? theme.colors[color] : ui.line },
          onTurn && { boxShadow: `0 0 14px ${theme.colors[color]}66` },
        ]}
      >
        <View style={[s.swatch, { backgroundColor: theme.colors[color] }]} />
        <UserAvatar id={p.userId} name={displayNameOf(p)} emoji={p.avatar} size={38} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={s.name} numberOfLines={1}>
            {nameOf(p)}
          </Text>
          <Text style={shared.small}>{t('watch.home', { n: coinsHome(board, color), goal })}</Text>
        </View>
        {onTurn && snapshot.match.lastRoll ? (
          <Dice value={snapshot.match.lastRoll} size={34} />
        ) : onTurn ? (
          <Pulse active={motion}>
            <Ionicons name="dice" size={26} color={theme.colors[color]} />
          </Pulse>
        ) : isWinner ? (
          <Ionicons name="trophy" size={24} color={ui.gold} />
        ) : null}
      </View>
    );
  };

  return (
    <Screen back title={t('watch.title')} subtitle={t('watch.subtitle')}>
      <View style={s.liveRow}>
        {live ? (
          <View style={[s.livePill, { borderColor: `${ui.danger}66` }]}>
            <LiveDot color={ui.danger} size={8} active={motion} />
            <Text style={[s.liveText, { color: ui.danger }]}>{t('watch.live')}</Text>
          </View>
        ) : null}
        <Text style={[shared.small, { flex: 1 }]} accessibilityLiveRegion="polite">
          {status}
        </Text>
      </View>
      {/* Each player's panel sits on the side of their yard: seat 0 (red) is top-left. */}
      {panel(0)}
      <View style={[s.board, { width: boardSize, height: boardSize }]}>
        <Board2D
          state={board}
          validMoves={[]}
          size={boardSize}
          theme={theme}
          motionEnabled={motion}
          homeStyle={profile.style === 'round-homes' ? 'round' : 'triangle'}
          showTurn={live}
          contrast={profile.highContrast ? 'high' : 'normal'}
          onSelectMove={() => undefined}
        />
      </View>
      {panel(1)}
      {!live && (
        <Card style={{ borderColor: `${ui.gold}66` }}>
          <Text style={shared.sectionTitle}>{status}</Text>
          <Button onPress={back}>{t('watch.backToBracket')}</Button>
        </Card>
      )}
      {error && live ? <Text style={shared.error}>{error}</Text> : null}
    </Screen>
  );
}

const useStyles = makeStyles((ui) => ({
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  liveText: { fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  panel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    backgroundColor: ui.scheme === 'light' ? '#ffffff' : ui.surfaceLow,
    boxShadow: liftByDay(ui),
  },
  swatch: { width: 6, alignSelf: 'stretch', borderRadius: 3 },
  name: { color: ui.text, fontSize: 15, fontWeight: '800' },
  board: { alignSelf: 'center' },
}));
