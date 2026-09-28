import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Text } from '../components/AppText';
import { router, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import {
  countJoined,
  displayNameOf,
  isLobbyPlayerDisconnected,
  seatColors,
  type LobbyPlayer,
  tablePrize,
} from '@/domain';
import { Body, Button, Card, Label, Screen, shared, Sheet } from '../components/Kit';
import { useLobby } from '../hooks/useLobby';
import { useProfile } from '../state/ProfileProvider';
import { useSocial } from '../state/SocialProvider';
import { UserAvatar } from '../social/UserAvatar';
import { shareInvite } from '../social/inviteLink';
import { ui } from '../theme/themes';

type SeatState = {
  readonly label: string;
  readonly color: string;
  readonly muted: boolean;
};

function seatState(player: LobbyPlayer): SeatState {
  if (player.invitationStatus === 'EXPIRED') {
    return { label: '⏱ No answer', color: ui.subtle, muted: true };
  }
  if (player.status === 'DECLINED') return { label: 'Declined', color: ui.danger, muted: true };
  if (player.status === 'LEFT') return { label: 'Left the game', color: ui.danger, muted: true };
  if (isLobbyPlayerDisconnected(player)) {
    return { label: '🔴 Disconnected', color: ui.danger, muted: false };
  }
  if (player.status === 'JOINED') {
    return {
      label: player.isReady ? '✓ Ready' : 'Joined · not ready',
      color: player.isReady ? ui.green : ui.gold,
      muted: false,
    };
  }
  return { label: 'Waiting…', color: ui.gold, muted: true };
}

export default function GameLobbyScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const lobbyId = typeof params.id === 'string' ? params.id : null;
  const { theme } = useProfile();
  const { signedIn, identity, member } = useSocial();
  const lobby = useLobby(signedIn ? lobbyId : null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const snapshot = lobby.snapshot;
  // Quick-play and link tables, and guests, all belong to the online hub, not the friends list.
  const quick = snapshot?.challenge.kind === 'QUICK';
  const link = snapshot?.challenge.kind === 'LINK';
  const home = quick || link || !member ? '/online' : '/friends';
  const homeLabel = quick
    ? 'Find another match'
    : member && !link
      ? 'Back to friends'
      : 'Back to online play';
  const [copied, setCopied] = useState(false);

  async function leaveAndExit() {
    if (await lobby.leave()) router.replace(home);
  }

  // Every client leaves for the board the moment the server says STARTED, so
  // the transition is driven by one shared decision rather than N timers.
  useEffect(() => {
    if (snapshot?.lobby.status !== 'STARTED') return;
    const timer = setTimeout(
      () =>
        router.replace({
          pathname: '/game',
          // The lobby id is what makes it a shared board rather than a local one.
          params: { lobby: snapshot.lobby.id },
        }),
      700,
    );
    return () => clearTimeout(timer);
  }, [snapshot?.lobby.status, snapshot?.lobby.id, snapshot?.lobby.maxPlayers]);

  if (!signedIn) {
    return (
      <Screen nav={false} back title="Game lobby">
        <Card>
          <Body>Sign in to join this game.</Body>
          <Button onPress={() => router.replace('/login')}>Sign in</Button>
        </Card>
      </Screen>
    );
  }

  if (lobby.fatal) {
    return (
      <Screen nav={false} back title="Game unavailable">
        <Card>
          <Body>{lobby.fatal}</Body>
          <Button onPress={() => void lobby.refresh()}>Retry connection</Button>
          <Button onPress={() => router.replace(home)}>{homeLabel}</Button>
        </Card>
      </Screen>
    );
  }

  if (!snapshot) {
    return (
      <Screen nav={false} back title="Game lobby">
        <ActivityIndicator color={theme.accent} style={{ marginVertical: 40 }} />
      </Screen>
    );
  }

  const { lobby: room, challenge, players } = snapshot;
  const joined = countJoined(players);
  const closed = room.status === 'CANCELLED' || challenge.status === 'EXPIRED';
  const me = players.find((player) => player.userId === identity?.id) ?? null;
  const isHost = identity?.id === room.hostId;
  const waitingFor = players.filter((player) => player.status === 'INVITED');
  const colors = seatColors(room.maxPlayers);

  return (
    <Screen
      nav={false}
      back
      title={closed ? 'Game closed' : 'Game lobby'}
      subtitle={
        quick ? 'QUICK PLAY TABLE' : link ? 'PRIVATE GAME · INVITE LINK' : 'A PRIVATE TABLE'
      }
    >
      {closed ? (
        <Card>
          <Label color={ui.danger}>
            {challenge.status === 'EXPIRED'
              ? link
                ? 'LINK EXPIRED'
                : 'INVITATION EXPIRED'
              : quick
                ? 'TABLE BROKE UP'
                : link
                  ? 'GAME CLOSED'
                  : 'CHALLENGE CANCELLED'}
          </Label>
          <Text style={shared.sectionTitle}>
            {challenge.status === 'EXPIRED'
              ? link
                ? 'Nobody joined in time'
                : 'Nobody answered in time'
              : link
                ? 'The host closed this game'
                : quick
                  ? 'Someone left before the start'
                  : 'This game was called off'}
          </Text>
          <Body>
            {link
              ? 'Invite links stay open for 30 minutes. Start a new private game and share the fresh link.'
              : challenge.status === 'EXPIRED'
                ? 'The invitation timed out. Start a fresh challenge whenever you are ready.'
                : quick
                  ? 'Quick-play tables only start with everyone present. Search again and you will be seated with the next players.'
                  : 'Everyone invited has been told. You can set up another game any time.'}
          </Body>
          <Button onPress={() => router.replace(home)}>{homeLabel}</Button>
        </Card>
      ) : (
        <>
          {link && room.inviteCode && room.status === 'WAITING' && (
            <Card style={{ borderColor: `${theme.accent}60`, gap: 12 }}>
              <Label color={theme.accent}>INVITE YOUR PLAYERS</Label>
              <Text
                accessibilityLabel={`Invite code ${room.inviteCode.split('').join(' ')}`}
                selectable
                style={[s.inviteCode, { color: theme.accent }]}
              >
                {room.inviteCode}
              </Text>
              <Body>
                {room.maxPlayers - joined > 0
                  ? `Waiting for ${room.maxPlayers - joined} more. Anyone with the link or code can take a seat.`
                  : 'Everyone is here.'}
              </Body>
              <View style={shared.row}>
                <View style={{ flex: 1 }}>
                  <Button compact onPress={() => void shareInvite(room.inviteCode!)}>
                    Share link
                  </Button>
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    compact
                    secondary
                    onPress={() =>
                      void Clipboard.setStringAsync(room.inviteCode!).then(() => setCopied(true))
                    }
                  >
                    {copied ? '✓ Copied' : 'Copy code'}
                  </Button>
                </View>
              </View>
            </Card>
          )}
          <Card style={{ borderColor: `${theme.accent}40`, gap: 16 }}>
            <View style={shared.between}>
              <View style={{ gap: 5 }}>
                <Label color={theme.accent}>
                  {room.status === 'STARTED'
                    ? 'GAME START'
                    : room.status === 'COUNTDOWN'
                      ? 'EVERYONE IS HERE'
                      : 'WAITING FOR PLAYERS'}
                </Label>
                <Text style={s.count}>
                  {joined} / {room.maxPlayers} players
                </Text>
                {room.stake > 0 && (
                  <Text style={{ color: ui.gold, fontWeight: '800', fontSize: 13 }}>
                    🪙 {room.stake.toLocaleString()} entry · winner takes{' '}
                    {tablePrize(room.stake, room.maxPlayers).toLocaleString()}
                  </Text>
                )}
              </View>
              {room.status === 'COUNTDOWN' || room.status === 'STARTED' ? (
                <View style={[s.countdown, { borderColor: theme.accent }]}>
                  <Text style={[s.countdownText, { color: theme.accent }]}>
                    {room.status === 'STARTED' ? '▶' : lobby.countdown || 'GO'}
                  </Text>
                </View>
              ) : (
                <ActivityIndicator color={theme.accent} />
              )}
            </View>

            <View style={{ gap: 10 }}>
              {players.map((player) => {
                const state = seatState(player);
                const color = theme.colors[colors[player.seatIndex] ?? 'RED'];
                return (
                  <View
                    key={player.userId}
                    style={[s.seat, { opacity: state.muted ? 0.62 : 1, borderLeftColor: color }]}
                  >
                    <UserAvatar
                      id={player.userId}
                      name={displayNameOf(player)}
                      emoji={player.avatar}
                      presence={player.presence}
                      size={42}
                    />
                    <View style={{ flex: 1, gap: 4 }}>
                      <View style={s.nameRow}>
                        <Text style={s.name} numberOfLines={1}>
                          {displayNameOf(player)}
                        </Text>
                        {player.isHost && (
                          <View style={[s.hostTag, { borderColor: `${theme.accent}55` }]}>
                            <Text style={[s.hostText, { color: theme.accent }]}>HOST</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[s.status, { color: state.color }]}>{state.label}</Text>
                    </View>
                  </View>
                );
              })}
            </View>

            <Text style={shared.small}>
              {room.status === 'STARTED'
                ? 'Opening the board…'
                : room.status === 'COUNTDOWN'
                  ? 'Everyone is ready. Starting together…'
                  : waitingFor.length > 0
                    ? `Waiting for ${waitingFor.map(displayNameOf).join(' and ')}…`
                    : 'Waiting for players to be ready…'}
            </Text>
          </Card>

          <CountdownBanner
            visible={room.status === 'COUNTDOWN'}
            seconds={lobby.countdown}
            accent={theme.accent}
          />

          {room.status === 'WAITING' && me?.status === 'JOINED' && !me.isReady && (
            <Button disabled={lobby.busy} onPress={() => void lobby.setReady(true)}>
              I’m ready
            </Button>
          )}

          {lobby.error && (
            <Text accessibilityLiveRegion="polite" style={shared.error}>
              {lobby.error}
            </Text>
          )}

          {room.status !== 'STARTED' && (
            <Button
              secondary
              disabled={lobby.busy}
              onPress={() => (isHost ? setConfirmCancel(true) : void leaveAndExit())}
            >
              {isHost ? 'Cancel game' : 'Leave game'}
            </Button>
          )}
        </>
      )}

      <Sheet visible={confirmCancel} onClose={() => setConfirmCancel(false)} title="Cancel game?">
        <Body>All invited players will be told the game is off.</Body>
        <Button
          disabled={lobby.busy}
          onPress={() => {
            setConfirmCancel(false);
            void lobby.cancel();
          }}
        >
          Cancel game
        </Button>
        <Button secondary onPress={() => setConfirmCancel(false)}>
          Keep waiting
        </Button>
      </Sheet>
    </Screen>
  );
}

function CountdownBanner({
  visible,
  seconds,
  accent,
}: {
  visible: boolean;
  seconds: number;
  accent: string;
}) {
  if (!visible) return null;
  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityLabel={`Starting in ${seconds}`}
      style={[s.banner, { borderColor: `${accent}55`, backgroundColor: `${accent}12` }]}
    >
      <Text style={[s.bannerNumber, { color: accent }]}>{seconds || 'GO'}</Text>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={s.bannerTitle}>Get ready</Text>
        <Text style={shared.small}>Everyone starts at the same moment, timed by the server.</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  inviteCode: { fontSize: 40, fontWeight: '900', letterSpacing: 8, textAlign: 'center' },
  count: { color: ui.text, fontSize: 23, fontWeight: '900', letterSpacing: -0.5 },
  countdown: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownText: { fontSize: 22, fontWeight: '900' },
  seat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    padding: 12,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: ui.line,
    borderLeftWidth: 4,
    backgroundColor: '#00000020',
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { color: ui.text, fontSize: 15.5, fontWeight: '700', flexShrink: 1 },
  hostTag: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  hostText: { fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  status: { fontSize: 12, fontWeight: '700' },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 18,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  bannerNumber: { fontSize: 40, fontWeight: '900', minWidth: 46, textAlign: 'center' },
  bannerTitle: { color: ui.text, fontSize: 17, fontWeight: '800' },
});
