import { useCallback, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { Text } from '../components/AppText';
import { router, useIsFocused } from 'expo-router';
import { displayNameOf, isOnline, REWARDS, type OnlineMatchPlayer } from '@/domain';
import { useOnlineReactions, useReactionBubbles } from '../hooks/useReactions';
import { useGameSounds } from '../audio/useGameSounds';
import { Body, Button, Card, Screen, Sheet, shared } from '../components/Kit';
import { GameTable } from '../game/GameTable';
import { ResultPanel } from '../game/ResultPanel';
import { useMotionEnabled } from '../hooks/useMotionEnabled';
import { useOnlineMatch } from '../hooks/useOnlineMatch';
import { useConnectivity } from '../state/ConnectivityProvider';
import { useProfile } from '../state/ProfileProvider';
import { useAtBoardPresence } from '../state/SocialProvider';
import { ui } from '../theme/themes';

/** Where every online game returns to: the hub works for guests and members alike. */
const ONLINE_HOME = '/online';

export default function OnlineMatchScreen({ lobbyId }: { lobbyId: string }) {
  const { profile, theme, recordOnlineMatch, member, ready } = useProfile();
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
  const connectivity = useConnectivity();
  // A dropped link is reported, never treated as the game ending: the seat
  // is kept server-side and play resumes when the connection does.
  const connectionLost =
    connectivity.available &&
    (connectivity.state === 'OFFLINE' ||
      connectivity.state === 'RECONNECTING' ||
      connectivity.state === 'SERVER_UNAVAILABLE');

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

  const won = game.winnerSeat !== null && game.winnerSeat === mySeat;
  const winner = players.find((p) => p.seatIndex === game.winnerSeat);
  const over = game.status === 'FINISHED' || game.status === 'ABANDONED';

  async function finish() {
    if (!match || saving) return;
    setSaving(true);
    try {
      // Recorded against the shared match id, so the once-per-match guard on
      // the account stops a replay from paying out twice.
      // The server reads the result from its own record; abandoned matches
      // pay the players who stayed.
      await recordOnlineMatch(match.id, game.getStats());
      router.replace(ONLINE_HOME);
    } catch {
      setNotice('Could not save your result. Tap again to retry.');
    } finally {
      setSaving(false);
    }
  }

  const waitingOn = players.find((p) => p.seatIndex === match?.state.currentPlayerIndex);
  const statusLine =
    connectionLost && !over
      ? connectivity.state === 'OFFLINE'
        ? 'Connection lost. Reconnecting… your seat is kept.'
        : 'Reconnecting to the server… your seat is kept.'
      : game.connection === 'reconnecting'
        ? 'Reconnecting to your table. Your turn will resume when connected.'
        : !match
          ? ''
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
                    ? game.moves.length > 1
                      ? `${game.moves.length} playable coins - tap a bouncing coin`
                      : game.moves.length === 1
                        ? 'Only one move - playing it for you...'
                        : match.state.consecutiveSixes === 3
                          ? 'Three sixes! Your turn passes.'
                          : 'No moves this time. Passing the dice…'
                    : game.secondsLeft !== null && game.secondsLeft <= 5
                      ? `Hurry! ${game.secondsLeft}s to roll`
                      : 'Your turn - tap the dice to roll'
                  : `Waiting for ${waitingOn ? displayNameOf(waitingOn) : 'the next player'}…`;

  return (
    <GameTable
      game={game}
      // Everyone sees the same board, so which colour is yours has to be said.
      label={
        (game.pool > 0 ? `🪙 ${game.prize.toLocaleString()} PRIZE · ` : '') +
        (myColor ? `YOU ARE ${myColor}` : 'ONLINE MATCH')
      }
      turnClock={over ? null : game.secondsLeft}
      statusLine={statusLine}
      // Everyone has their own screen, so nothing should be turned upside down.
      seatRotation={false}
      seatLabel={(color) => {
        const seat = match?.state.players.findIndex((p) => p.color === color) ?? -1;
        if (seat === mySeat) return 'You';
        const player = players.find((p) => p.seatIndex === seat);
        return player ? displayNameOf(player) : color.charAt(0) + color.slice(1).toLowerCase();
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
      pauseBody="The other players are still at the table. Leaving ends the match for everyone."
      exitLabel="Leave the match"
      onExit={() => {
        setMenu(false);
        void game.abandon();
      }}
      reactions={{
        bubbles: reactionBubbles.bubbles,
        send: mySeat === null ? undefined : sendReaction,
      }}
      resultSheet={
        match && (
          <Sheet
            visible={over && !busy}
            onClose={() => undefined}
            title={
              game.status === 'ABANDONED'
                ? 'The table broke up.'
                : won
                  ? 'A winning kind of day.'
                  : 'That was a good game.'
            }
          >
            <ResultPanel
              outcome={game.status === 'ABANDONED' ? 'abandoned' : won ? 'win' : 'loss'}
              headline={
                game.status === 'ABANDONED'
                  ? 'TABLE CLOSED'
                  : won
                    ? 'YOU WIN'
                    : `${winner ? displayNameOf(winner) : (match.state.winnerColor ?? '')} WINS`.toUpperCase()
              }
              accent={theme.colors[match.state.winnerColor ?? 'RED']}
              subline={
                game.status === 'ABANDONED'
                  ? 'Too many players left, so this match ended early.'
                  : won
                    ? 'You beat real players. That is a proper win.'
                    : 'Well played to the end. Rematch?'
              }
              stats={game.status === 'FINISHED' ? game.getStats() : null}
              reward={
                game.status === 'FINISHED' && member
                  ? won
                    ? {
                        coins: REWARDS.online.win.coins + game.prize,
                        xp: REWARDS.online.win.xp,
                      }
                    : REWARDS.online.played
                  : null
              }
              note={
                game.status === 'FINISHED' && !member
                  ? `Create an account to earn ${REWARDS.online.win.coins} coins for every online win.`
                  : game.status === 'ABANDONED' && game.pool > 0
                    ? 'The players who stayed split the prize pool. It is added to your coins when you continue.'
                    : undefined
              }
              motionEnabled={motionEnabled}
            >
              <Seats players={players} mySeat={mySeat} winnerSeat={game.winnerSeat} />
            </ResultPanel>
            {notice && <Text style={shared.error}>{notice}</Text>}
            <Button disabled={saving} onPress={() => void finish()}>
              {saving
                ? 'Saving result…'
                : game.status === 'ABANDONED'
                  ? 'Back to online play'
                  : 'Save result & play again'}
            </Button>
          </Sheet>
        )
      }
    />
  );
}

function Seats({
  players,
  mySeat,
  winnerSeat,
}: {
  players: readonly OnlineMatchPlayer[];
  mySeat: number | null;
  winnerSeat: number | null;
}) {
  return (
    <View style={{ gap: 8 }}>
      {players.map((player) => (
        <View key={player.userId} style={shared.between}>
          <Text style={{ color: ui.text, fontWeight: '700' }}>
            {displayNameOf(player)}
            {player.seatIndex === mySeat ? ' (you)' : ''}
          </Text>
          <Text
            style={{
              color: player.seatIndex === winnerSeat ? ui.gold : ui.subtle,
              fontSize: 12,
              fontWeight: '700',
            }}
          >
            {player.seatIndex === winnerSeat
              ? '🏆 Winner'
              : isOnline(player.presence)
                ? ''
                : 'Left'}
          </Text>
        </View>
      ))}
    </View>
  );
}
