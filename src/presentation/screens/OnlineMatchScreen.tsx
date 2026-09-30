import { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, useWindowDimensions } from 'react-native';
import { router, useIsFocused } from 'expo-router';
import {
  coinsHome,
  coinsToWin,
  standings,
  VARIANT_INFO,
  variantOf,
  winLine,
  displayNameOf,
  distinctMoves,
  placementCoins,
  REWARDS,
  controlledColor,
} from '@/domain';

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

/** Where every online game returns to: the hub works for guests and members alike. */
const ONLINE_HOME = '/online';

export default function OnlineMatchScreen({ lobbyId }: { lobbyId: string }) {
  const { profile, theme, recordOnlineMatch, creditGuestVault, member, ready } = useProfile();
  useAtBoardPresence();
  const { width, height } = useWindowDimensions();
  const [menu, setMenu] = useState(false);
  const [rules, setRules] = useState(false);
  const [tableArea, setTableArea] = useState({ width: 0, height: 0 });
  const [notice, setNotice] = useState<string | null>(null);
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
      setNotice('Could not leave the table. Check your connection and try again.');
    } finally {
      setLeaving(false);
    }
  }

  if (game.fatal) {
    return (
      <Screen nav={false} back title="Match unavailable">
        <Card>
          <Body>{game.fatal}</Body>
          <Button onPress={() => router.replace(ONLINE_HOME)}>Back to online play</Button>
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
      setNotice('Could not save your result. Tap again to retry.');
    } finally {
      setSaving(false);
    }
  }

  /** What this table pays, shown in the header all game long. */
  const prizeLine = !match
    ? undefined
    : game.pool > 0
      ? `Winner takes ${game.prize.toLocaleString()} coins`
      : game.teams
        ? 'Winning pair: +100 coins each'
        : seatCount === 2
          ? 'Winner: +100 coins'
          : seatCount === 3
            ? '1st +100 · 2nd +50'
            : '1st +100 · 2nd +50 · 3rd +20';

  const waitingOn = players.find((p) => p.seatIndex === match?.state.currentPlayerIndex);
  const me = players.find((p) => p.seatIndex === mySeat);
  const livesLeft = me ? Math.max(0, game.lifelines - me.missed) : null;
  const statusLine =
    connectionLost && !over
      ? connectivity.state === 'OFFLINE'
        ? 'Connection lost. Reconnecting… your seat is kept.'
        : 'Reconnecting to the server… your seat is kept.'
      : game.connection === 'reconnecting'
        ? 'Reconnecting to your table. Your turn will resume when connected.'
        : !match
          ? ''
          : me?.out && !over
            ? 'You ran out of lifelines. Your turns are skipped - watch or leave the table.'
            : game.status === 'ABANDONED'
              ? 'Someone left. The game has ended.'
              : match.state.status === 'FINISHED'
                ? 'A good game, well played.'
                : busy
                  ? game.activity === 'rolling'
                    ? 'Rolling the dice...'
                    : 'Sending your move...'
                  : humanTurn
                    ? match.state.lastRoll !== null
                      ? distinctMoves(game.moves).length > 1
                        ? `${distinctMoves(game.moves).length} playable coins - tap a bouncing coin`
                        : distinctMoves(game.moves).length === 1
                          ? 'Only one move - playing it for you...'
                          : match.state.consecutiveSixes === 3
                            ? 'Three sixes! Your turn passes.'
                            : 'No moves this time. Passing the dice…'
                      : game.secondsLeft !== null && game.secondsLeft <= 5
                        ? `Hurry! ${game.secondsLeft}s to roll`
                        : livesLeft !== null && livesLeft < game.lifelines
                          ? `Your turn - roll before the clock runs out (${livesLeft} ♥ left)`
                          : game.teams &&
                              match &&
                              controlledColor(match.state) !==
                                match.state.players[mySeat ?? 0]?.color
                            ? 'Your coins are home - roll for your partner!'
                            : 'Your turn - tap the dice to roll'
                    : `Waiting for ${waitingOn ? displayNameOf(waitingOn) : 'the next player'}…`;

  const activeRivals = players.filter((p) => p.seatIndex !== mySeat && !p.out).length;
  const leaveConsequence =
    (game.pool > 0
      ? `Your ${game.stake.toLocaleString()}-coin stake stays in the pot and you get no prize. `
      : 'You get no coins for this game and it counts as a loss. ') +
    (game.teams
      ? 'Your partner loses with you, and the other pair wins.'
      : activeRivals >= 2
        ? 'The others keep playing without you.'
        : 'Your opponent wins the match.');

  return (
    <>
      <Sheet
        visible={confirmLeave}
        onClose={() => {
          if (!leaving) setConfirmLeave(false);
        }}
        title="Leave this match?"
      >
        <Body>{leaveConsequence}</Body>
        <Button disabled={leaving} onPress={() => setConfirmLeave(false)}>
          Stay and play
        </Button>
        <Button secondary danger disabled={leaving} onPress={() => void leaveMatch()}>
          {leaving ? 'Leaving…' : 'Leave & forfeit'}
        </Button>
        {notice && confirmLeave && <Body>{notice}</Body>}
      </Sheet>
      <GameTable
        game={game}
        // Everyone sees the same board, so which colour is yours has to be said.
        label={
          (match && variantOf(match.state) !== 'classic'
            ? `${VARIANT_INFO[variantOf(match.state)].short} · `
            : '') +
          (game.teams ? '2 V 2 · ' : '') +
          (myColor ? `YOU ARE ${myColor}` : 'ONLINE MATCH')
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
          if (seat === mySeat) return 'You';
          const player = players.find((p) => p.seatIndex === seat);
          const shown = player
            ? displayNameOf(player)
            : color.charAt(0) + color.slice(1).toLowerCase();
          return seat === partnerSeat ? `${shown} 🤝` : shown;
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
        pauseBody="The other players are still at the table. Leaving forfeits this game — they play on, or win it outright at a table of two."
        exitLabel="Leave the match"
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
              banner={game.status === 'ABANDONED' ? 'TABLE CLOSED' : won ? 'VICTORY!' : 'GOOD GAME'}
              subtitle={(game.status === 'ABANDONED'
                ? 'Someone left, so the match ended early'
                : won
                  ? `${VARIANT_INFO[variantOf(match.state)].short} · ${winLine(match.state)} · you beat real players`
                  : `${winner ? displayNameOf(winner) : 'Your rival'} took this one · rematch?`
              ).toUpperCase()}
              standings={standings(match.state).map((color) => {
                const seat = match.state.players.findIndex((p) => p.color === color);
                const player = players.find((p) => p.seatIndex === seat);
                return {
                  key: color,
                  name: seat === mySeat ? profile.name : player ? displayNameOf(player) : color,
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
                    ? `+${placePay} coins are waiting in your vault — sign in any time to claim everything in it.`
                    : `Create an account to earn ${REWARDS.online.win.coins} coins for every online win.`
                  : game.status === 'ABANDONED' && game.pool > 0
                    ? 'The players who stayed split the prize pool. It is added to your coins when you continue.'
                    : undefined
              }
              stats={game.status === 'FINISHED' ? game.getStats() : null}
              durationMs={durationMs}
              goal={coinsToWin(match.state)}
              primary={{ label: 'Play again', busy: saving, onPress: () => void finish(false) }}
              secondary={{ label: 'Lobby', onPress: () => void finish(true) }}
              shareMessage={
                won
                  ? `I just beat real players in a ${VARIANT_INFO[variantOf(match.state)].title} game of Ludo Rumble! 🎲🏆`
                  : undefined
              }
              error={notice}
              motionEnabled={motionEnabled}
            />
          )
        }
      />
    </>
  );
}
