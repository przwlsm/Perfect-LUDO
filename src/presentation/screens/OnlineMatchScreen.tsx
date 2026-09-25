import { useState } from 'react';
import { Text, useWindowDimensions, View } from 'react-native';
import { router, useIsFocused } from 'expo-router';
import { displayNameOf, isOnline, PLAYED_COINS, WIN_COINS, type OnlineMatchPlayer } from '@/domain';
import { useGameSounds } from '../audio/useGameSounds';
import { Body, Button, Card, Screen, Sheet, shared } from '../components/Kit';
import { GameTable, gameTableStyles } from '../game/GameTable';
import { useMotionEnabled } from '../hooks/useMotionEnabled';
import { useOnlineMatch } from '../hooks/useOnlineMatch';
import { useConnectivity } from '../state/ConnectivityProvider';
import { useProfile } from '../state/ProfileProvider';
import { useAtBoardPresence } from '../state/SocialProvider';
import { ui } from '../theme/themes';

/** Where every online game returns to: the hub works for guests and members alike. */
const ONLINE_HOME = '/online';

export default function OnlineMatchScreen({ lobbyId }: { lobbyId: string }) {
  const { profile, theme, recordMatch, member, ready } = useProfile();
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
  const over = game.status === 'FINISHED' || game.status === 'ABANDONED';

  async function finish() {
    if (!match || saving) return;
    setSaving(true);
    try {
      // Recorded against the shared match id, so the once-per-match guard on
      // the account stops a replay from paying out twice.
      if (game.status === 'FINISHED') await recordMatch(match.id, won, true);
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
                    : 'Your turn - tap the dice to roll'
                  : `Waiting for ${waitingOn ? displayNameOf(waitingOn) : 'the next player'}…`;

  return (
    <GameTable
      game={game}
      // Everyone sees the same board, so which colour is yours has to be said.
      label={myColor ? `ONLINE · YOU ARE ${myColor}` : 'ONLINE MATCH'}
      statusLine={statusLine}
      // Everyone has their own screen, so nothing should be turned upside down.
      seatRotation={false}
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
            <Text style={{ fontSize: 64, textAlign: 'center' }}>
              {game.status === 'ABANDONED' ? '👋' : '🏆'}
            </Text>
            {game.status !== 'ABANDONED' && (
              <Text
                style={[
                  gameTableStyles.winTitle,
                  { color: theme.colors[match.state.winnerColor ?? 'RED'] },
                ]}
              >
                {won ? 'YOU WIN' : `${match.state.winnerColor} WINS`}
              </Text>
            )}
            <Seats players={players} mySeat={mySeat} winnerSeat={game.winnerSeat} />
            {game.status === 'FINISHED' &&
              (member ? (
                <Card>
                  <Text
                    style={{
                      color: theme.accent,
                      fontSize: 30,
                      fontWeight: '900',
                      textAlign: 'center',
                    }}
                  >
                    +{won ? WIN_COINS : PLAYED_COINS} coins
                  </Text>
                  <Text style={[shared.small, { textAlign: 'center' }]}>
                    {won ? 'Against real people, too.' : 'Thanks for playing it out.'}
                  </Text>
                </Card>
              ) : (
                <Text style={[shared.small, { textAlign: 'center' }]}>
                  Create an account to earn {WIN_COINS} coins for a win and {PLAYED_COINS} for
                  playing it out.
                </Text>
              ))}
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
