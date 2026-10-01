import { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, useWindowDimensions } from 'react-native';
import { router, useIsFocused } from 'expo-router';
import {
  coinsHome,
  coinsToWin,
  standings,
  variantOf,
  displayNameOf,
  distinctMoves,
  placementCoins,
  REWARDS,
  controlledColor,
  type GameState,
  type PlayerColor,
} from '@/domain';
import { useTranslation } from 'react-i18next';
import { useCatalogText } from '../i18n/useCatalogText';

import { useOnlineReactions, useReactionBubbles } from '../hooks/useReactions';
import { useGameSounds } from '../audio/useGameSounds';
import { Body, Button, Card, Screen, Sheet } from '../components/Kit';
import { GameTable } from '../game/GameTable';
import { VictoryScreen } from '../game/VictoryScreen';
import { useMotionEnabled } from '../hooks/useMotionEnabled';
import { useOnlineMatch } from '../hooks/useOnlineMatch';
import { useConnectivity } from '../state/ConnectivityProvider';
import { useProfile } from '../state/ProfileProvider';
import { useAtBoardPresence } from '../state/SocialProvider';
import { numberLocale } from '../i18n/format';

/** Where every online game returns to: the hub works for guests and members alike. */
const ONLINE_HOME = '/online';

/** The win condition in words: "First coin home", "All four coins home"… */
function goalKey(state: Pick<GameState, 'goal' | 'teams'>) {
  const goal = coinsToWin(state);
  if (state.teams) return goal === 4 ? ('teamsAll' as const) : ('teams' as const);
  return goal === 1 ? ('one' as const) : goal === 2 ? ('two' as const) : ('all' as const);
}

export default function OnlineMatchScreen({ lobbyId }: { lobbyId: string }) {
  const { profile, theme, recordOnlineMatch, creditGuestVault, member, ready } = useProfile();
  useAtBoardPresence();
  const { width, height } = useWindowDimensions();
  const [menu, setMenu] = useState(false);
  const [rules, setRules] = useState(false);
  const [tableArea, setTableArea] = useState({ width: 0, height: 0 });
  const { t } = useTranslation(['online', 'common']);
  const { variantTitle, variantShort } = useCatalogText();
  const [notice, setNotice] = useState<'leaveFailed' | 'saveFailed' | null>(null);
  const [saving, setSaving] = useState(false);
  const focused = useIsFocused();
  const motionEnabled = useMotionEnabled(
    profile.reducedMotion,
    focused && !menu && !rules && ready,
  );
  const game = useOnlineMatch(lobbyId, menu || rules || !focused || !ready);
  useGameSounds(game.feedback, profile.soundEnabled, focused && !menu && !rules, motionEnabled);
  const { match, humanTurn, busy, players, mySeat, myColor } = game;
  const reactionBubbles = useReactionBubbles();
  const seatColors = match?.state.players.map((p) => p.color).join(',') ?? '';
  const colorOfSeat = useCallback(
    (seat: number) => match?.state.players[seat]?.color ?? null,
    // Seats never change colour during a match; the joined list is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [seatColors],
  );
  const sendReaction = useOnlineReactions(
    match?.id ?? null,
    mySeat,
    colorOfSeat,
    reactionBubbles.show,
  );
  // How long this match lasted on this device, for the results screen.
  const startedAt = useRef<number | null>(null);
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const liveStatus = game.status;
  useEffect(() => {
    if (liveStatus === 'IN_PROGRESS' && startedAt.current === null) startedAt.current = Date.now();
    if ((liveStatus === 'FINISHED' || liveStatus === 'ABANDONED') && startedAt.current !== null)
      setDurationMs(Date.now() - startedAt.current);
  }, [liveStatus]);
  const connectivity = useConnectivity();
  // A dropped link is reported, never treated as the game ending: the seat
  // is kept server-side and play resumes when the connection does.
  const connectionLost =
    connectivity.available &&
    (connectivity.state === 'OFFLINE' ||
      connectivity.state === 'RECONNECTING' ||
      connectivity.state === 'SERVER_UNAVAILABLE');

  // Leaving a live match forfeits it, so it is never one accidental tap: the
  // Android back button and the menu's leave button both ask first.
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const live = game.status === 'IN_PROGRESS' && match !== null && mySeat !== null;
  useEffect(() => {
    if (!live || !focused) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setMenu(false);
      setConfirmLeave(true);
      return true;
    });
    return () => sub.remove();
  }, [live, focused]);

  async function leaveMatch() {
    if (leaving) return;
    setLeaving(true);
    try {
      await game.abandon();
      setConfirmLeave(false);
      router.replace(ONLINE_HOME);
    } catch {
      setNotice('leaveFailed');
    } finally {
      setLeaving(false);
    }
  }

  if (game.fatal) {
    return (
      <Screen nav={false} back title={t('match.unavailable')}>
        <Card>
          <Body>{game.fatal}</Body>
          <Button onPress={() => router.replace(ONLINE_HOME)}>{t('backToOnline')}</Button>
        </Card>
      </Screen>
    );
  }

  // In 2 v 2 the partner of the player who finished wins too.
  const partnerSeat = game.teams && mySeat !== null ? (mySeat + 2) % 4 : null;
  const won =
    game.winnerSeat !== null && (game.winnerSeat === mySeat || game.winnerSeat === partnerSeat);
  const winner = players.find((p) => p.seatIndex === game.winnerSeat);
  const over = game.status === 'FINISHED' || game.status === 'ABANDONED';

  // Where I placed at this table, and the prize that place pays.
  const seatCount = match?.state.players.length ?? 0;
  const myRank =
    match && myColor && game.status === 'FINISHED'
      ? standings(match.state).indexOf(myColor) + 1
      : 0;
  const placePay = !match ? 0 : game.teams ? (won ? 100 : 0) : placementCoins(myRank, seatCount);

  async function finish(home: boolean) {
    if (!match || saving) return;
    setSaving(true);
    try {
      // Recorded against the shared match id, so the once-per-match guard on
      // the account stops a replay from paying out twice.
      // The server reads the result from its own record; abandoned matches
      // pay the players who stayed.
      await recordOnlineMatch(match.id, game.getStats());
      // A guest's placement prize goes to the vault (also once per match).
      if (!member && game.status === 'FINISHED' && placePay > 0) {
        await creditGuestVault(match.id, placePay);
      }
      router.replace(home ? '/' : ONLINE_HOME);
    } catch {
      setNotice('saveFailed');
    } finally {
      setSaving(false);
    }
  }

  /** What this table pays, shown in the header all game long. */
  const prizeLine = !match
    ? undefined
    : game.pool > 0
      ? t('match.prize.pool', { amount: game.prize.toLocaleString(numberLocale()) })
      : game.teams
        ? t('match.prize.teams')
        : seatCount === 2
          ? t('match.prize.two')
          : seatCount === 3
            ? t('match.prize.three')
            : t('match.prize.four');

  const waitingOn = players.find((p) => p.seatIndex === match?.state.currentPlayerIndex);
  const me = players.find((p) => p.seatIndex === mySeat);
  const livesLeft = me ? Math.max(0, game.lifelines - me.missed) : null;
  const playable = distinctMoves(game.moves).length;
  const statusLine =
    connectionLost && !over
      ? connectivity.state === 'OFFLINE'
        ? t('match.status.connectionLost')
        : t('match.status.reconnectingServer')
      : game.connection === 'reconnecting'
        ? t('match.status.reconnectingTable')
        : !match
          ? ''
          : me?.out && !over
            ? t('match.status.outOfLifelines')
            : game.status === 'ABANDONED'
              ? t('match.status.someoneLeft')
              : match.state.status === 'FINISHED'
                ? t('match.status.goodGame')
                : busy
                  ? game.activity === 'rolling'
                    ? t('match.status.rolling')
                    : t('match.status.sending')
                  : humanTurn
                    ? match.state.lastRoll !== null
                      ? playable > 1
                        ? t('match.status.playable', { count: playable })
                        : playable === 1
                          ? t('match.status.onlyOne')
                          : match.state.consecutiveSixes === 3
                            ? t('match.status.threeSixes')
                            : t('match.status.noMoves')
                      : game.secondsLeft !== null && game.secondsLeft <= 5
                        ? t('match.status.hurry', { seconds: game.secondsLeft })
                        : livesLeft !== null && livesLeft < game.lifelines
                          ? t('match.status.yourTurnLives', { lives: livesLeft })
                          : game.teams &&
                              match &&
                              controlledColor(match.state) !==
                                match.state.players[mySeat ?? 0]?.color
                            ? t('match.status.rollForPartner')
                            : t('match.status.yourTurn')
                    : waitingOn
                      ? t('match.status.waitingFor', { name: displayNameOf(waitingOn) })
                      : t('match.status.waitingForNext');

  const activeRivals = players.filter((p) => p.seatIndex !== mySeat && !p.out).length;
  const leaveConsequence = `${
    game.pool > 0
      ? t('match.leave.stakeLost', { amount: game.stake.toLocaleString(numberLocale()) })
      : t('match.leave.noCoins')
  } ${
    game.teams
      ? t('match.leave.partnerLoses')
      : activeRivals >= 2
        ? t('match.leave.othersPlayOn')
        : t('match.leave.opponentWins')
  }`;
  const colorName = (color: PlayerColor) => t(`colors.${color}`);

  return (
    <>
      <Sheet
        visible={confirmLeave}
        onClose={() => {
          if (!leaving) setConfirmLeave(false);
        }}
        title={t('match.leave.title')}
      >
        <Body>{leaveConsequence}</Body>
        <Button disabled={leaving} onPress={() => setConfirmLeave(false)}>
          {t('match.leave.stay')}
        </Button>
        <Button secondary danger disabled={leaving} onPress={() => void leaveMatch()}>
          {leaving ? t('match.leave.leaving') : t('match.leave.forfeit')}
        </Button>
        {notice && confirmLeave && <Body>{t(`errors.${notice}`)}</Body>}
      </Sheet>
      <GameTable
        game={game}
        // Everyone sees the same board, so which colour is yours has to be said.
        label={
          (match && variantOf(match.state) !== 'classic'
            ? `${variantShort(variantOf(match.state))} · `
            : '') +
          (game.teams ? `${t('match.label.teams')} · ` : '') +
          (myColor
            ? t('match.label.youAre', { color: colorName(myColor).toUpperCase() })
            : t('match.label.onlineMatch'))
        }
        prize={prizeLine}
        turnClock={over ? null : game.secondsLeft}
        livesFor={(color) => {
          const seat = match?.state.players.findIndex((p) => p.color === color) ?? -1;
          const player = players.find((p) => p.seatIndex === seat);
          return player
            ? {
                left: Math.max(0, game.lifelines - player.missed),
                total: game.lifelines,
                out: player.out,
              }
            : null;
        }}
        statusLine={statusLine}
        // Everyone has their own screen, so nothing should be turned upside down.
        seatRotation={false}
        seatLabel={(color) => {
          const seat = match?.state.players.findIndex((p) => p.color === color) ?? -1;
          if (seat === mySeat) return t('match.you');
          const player = players.find((p) => p.seatIndex === seat);
          const shown = player ? displayNameOf(player) : colorName(color);
          return seat === partnerSeat ? t('match.partner', { name: shown }) : shown;
        }}
        motionEnabled={motionEnabled}
        tableArea={{
          width: tableArea.width || width,
          height: tableArea.height || Math.max(1, height - 128),
        }}
        onTableLayout={setTableArea}
        menu={menu}
        setMenu={setMenu}
        rules={rules}
        setRules={setRules}
        pauseBody={t('match.pauseBody')}
        exitLabel={t('match.exit')}
        onExit={() => {
          setMenu(false);
          setConfirmLeave(true);
        }}
        reactions={{
          bubbles: reactionBubbles.bubbles,
          send: mySeat === null ? undefined : sendReaction,
        }}
        resultSheet={
          match && (
            <VictoryScreen
              visible={over && !busy}
              outcome={game.status === 'ABANDONED' ? 'abandoned' : won ? 'win' : 'loss'}
              banner={
                game.status === 'ABANDONED'
                  ? t('match.banner.closed')
                  : won
                    ? t('match.banner.victory')
                    : t('match.banner.goodGame')
              }
              subtitle={(game.status === 'ABANDONED'
                ? t('match.subtitle.abandoned')
                : won
                  ? t('match.subtitle.won', {
                      mode: variantShort(variantOf(match.state)),
                      goal: t(`match.goal.${goalKey(match.state)}`, {
                        goal: coinsToWin(match.state),
                      }),
                    })
                  : winner
                    ? t('match.subtitle.lost', { name: displayNameOf(winner) })
                    : t('match.subtitle.lostRival')
              ).toUpperCase()}
              standings={standings(match.state).map((color) => {
                const seat = match.state.players.findIndex((p) => p.color === color);
                const player = players.find((p) => p.seatIndex === seat);
                return {
                  key: color,
                  name:
                    seat === mySeat
                      ? profile.name
                      : player
                        ? displayNameOf(player)
                        : colorName(color).toUpperCase(),
                  color: theme.colors[color],
                  you: seat === mySeat,
                  coinsHome: coinsHome(match.state, color),
                  userId: player?.userId,
                  avatar: player?.avatar ?? null,
                };
              })}
              reward={
                game.status === 'FINISHED' && member
                  ? {
                      // Placement pay, plus the winners' share of any stake pool.
                      coins: placePay + (won ? Math.floor(game.prize / (game.teams ? 2 : 1)) : 0),
                      xp: won ? REWARDS.online.win.xp : REWARDS.online.played.xp,
                    }
                  : null
              }
              note={
                game.status === 'FINISHED' && !member
                  ? placePay > 0
                    ? t('match.note.vault', { amount: placePay })
                    : t('match.note.earn', { amount: REWARDS.online.win.coins })
                  : game.status === 'ABANDONED' && game.pool > 0
                    ? t('match.note.poolSplit')
                    : undefined
              }
              stats={game.status === 'FINISHED' ? game.getStats() : null}
              durationMs={durationMs}
              goal={coinsToWin(match.state)}
              primary={{
                label: t('match.playAgain'),
                busy: saving,
                onPress: () => void finish(false),
              }}
              secondary={{ label: t('match.lobby'), onPress: () => void finish(true) }}
              shareMessage={
                won ? t('match.share', { mode: variantTitle(variantOf(match.state)) }) : undefined
              }
              error={notice && t(`errors.${notice}`)}
              motionEnabled={motionEnabled}
            />
          )
        }
      />
    </>
  );
}
