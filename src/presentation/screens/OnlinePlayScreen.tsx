import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { describeConnection, type QuickMatchPlayerCount } from '@/domain';
import { ConnectionPill } from '../components/ConnectionPill';
import { Body, Button, Card, Label, Screen, shared } from '../components/Kit';
import { useQuickMatch } from '../hooks/useQuickMatch';
import { AccountGateSheet, LOGIN_HREF, SIGN_UP_HREF } from '../social/AccountGate';
import { UserAvatar } from '../social/UserAvatar';
import { useConnectivity } from '../state/ConnectivityProvider';
import { useProfile } from '../state/ProfileProvider';
import { useSocial } from '../state/SocialProvider';
import { useAuthSession } from '../state/useAuthSession';
import { ui } from '../theme/themes';

const SEATS: readonly QuickMatchPlayerCount[] = [2, 3, 4];

/**
 * The hub for everything that needs a server: quick play for anyone with a
 * connection, friend challenges for members, and the guest/login choice in
 * between. Offline play never comes through here.
 */
export default function OnlinePlayScreen() {
  const { theme, profile } = useProfile();
  const connectivity = useConnectivity();
  const { enabled, signedIn, account, identity } = useSocial();
  const auth = useAuthSession();
  const quick = useQuickMatch();
  const [seats, setSeats] = useState<QuickMatchPlayerCount>(2);
  const [gate, setGate] = useState<string | null>(null);

  const lobbyId = quick.phase === 'matched' ? quick.ticket?.lobbyId : null;
  useEffect(() => {
    if (!lobbyId) return;
    router.replace({ pathname: '/lobby/[id]', params: { id: lobbyId } });
  }, [lobbyId]);

  if (!enabled || !connectivity.available) {
    return (
      <Screen title="Online play" subtitle="PLAY WITH PEOPLE">
        <Card>
          <Body>
            This build has no game server configured, so online play is not available. Offline games
            work as usual.
          </Body>
          <Button onPress={() => router.replace('/')}>Back to the game</Button>
        </Card>
      </Screen>
    );
  }

  const status = describeConnection(connectivity.state);

  if (!connectivity.online) {
    return (
      <Screen title="Online play" subtitle="PLAY WITH PEOPLE">
        <Card>
          <ConnectionPill large />
          <Text style={shared.sectionTitle}>Play Online is unavailable</Text>
          <Body>
            {connectivity.state === 'OFFLINE'
              ? 'No internet connection. Online play returns the moment you are back online; offline games are always ready.'
              : connectivity.state === 'SERVER_UNAVAILABLE'
                ? 'The game server is not answering right now. Try again in a moment, or play offline meanwhile.'
                : `${status.label} Hang on a second.`}
          </Body>
          <Button secondary onPress={() => void connectivity.refresh()}>
            Try again
          </Button>
          <Button onPress={() => router.replace('/')}>Play offline instead</Button>
        </Card>
      </Screen>
    );
  }

  if (!signedIn) {
    return (
      <Screen title="Choose how to play" subtitle="ONLINE PLAY">
        <Card style={{ borderColor: `${theme.accent}40` }}>
          <ConnectionPill large />
          <Text style={shared.sectionTitle}>Jump straight in, or bring your account</Text>
          <Body>
            Guests can play online right away. An account adds friends, challenges, your game
            history and progress that follows you between devices.
          </Body>
          <Button disabled={auth.busy} onPress={() => void auth.continueAsGuest()}>
            {auth.busy ? 'Setting up your seat…' : 'Continue as Guest'}
          </Button>
          <Button secondary disabled={auth.busy} onPress={() => router.push(LOGIN_HREF)}>
            Login / Sign Up
          </Button>
          {auth.error && (
            <Text accessibilityLiveRegion="polite" style={shared.error}>
              {auth.error}
            </Text>
          )}
        </Card>
      </Screen>
    );
  }

  const name = identity?.displayName?.trim() || profile.name;
  const searching = quick.phase === 'searching';

  return (
    <Screen title="Online play" subtitle="PLAY WITH PEOPLE">
      <Card>
        <View style={shared.between}>
          <View style={[shared.row, { flex: 1 }]}>
            <UserAvatar
              id={identity?.id ?? 'me'}
              name={name}
              emoji={identity?.avatar ?? null}
              size={44}
            />
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={s.welcome} numberOfLines={1}>
                Welcome, {name}
              </Text>
              <Text style={shared.small}>
                {account === 'guest'
                  ? `Playing as @${identity?.username ?? 'guest'} · temporary`
                  : identity
                    ? `@${identity.username}${identity.publicId ? ` · ID ${identity.publicId}` : ''}`
                    : 'Setting up your profile…'}
              </Text>
            </View>
          </View>
          <ConnectionPill large />
        </View>
      </Card>

      <View style={shared.section}>
        <Text style={shared.sectionTitle}>Quick Play</Text>
        <Card style={{ borderColor: `${theme.accent}40` }}>
          {searching || quick.phase === 'matched' ? (
            <>
              <View style={shared.row}>
                <ActivityIndicator color={theme.accent} />
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={shared.sectionTitle}>
                    {quick.phase === 'matched' ? 'Opponent found!' : 'Finding opponent…'}
                  </Text>
                  <Text style={shared.small}>
                    {quick.phase === 'matched'
                      ? 'Taking you to the table.'
                      : `${seats}-player table · ${quick.ticket?.waiting ?? 1} waiting`}
                  </Text>
                </View>
              </View>
              <Body>
                Keep this screen open. Leaving cancels your search, and the other players are
                strangers who will not wait.
              </Body>
              {quick.error && (
                <Text accessibilityLiveRegion="polite" style={shared.error}>
                  {quick.error}
                </Text>
              )}
              <Button secondary onPress={() => void quick.cancel()}>
                Cancel search
              </Button>
            </>
          ) : (
            <>
              <Label color={theme.accent}>NO FRIENDS NEEDED</Label>
              <Text style={shared.sectionTitle}>Find an opponent now</Text>
              <Body>You are seated with the next players looking for the same table.</Body>
              <Label>TABLE SIZE</Label>
              <View style={shared.row}>
                {SEATS.map((n) => (
                  <Pressable
                    key={n}
                    accessibilityRole="button"
                    accessibilityLabel={`${n} players`}
                    accessibilityState={{ selected: n === seats }}
                    onPress={() => setSeats(n)}
                    android_ripple={{ color: `${theme.accent}30` }}
                    style={[
                      s.choice,
                      { backgroundColor: theme.surface },
                      n === seats && { borderColor: theme.accent },
                    ]}
                  >
                    <Text style={s.choiceText}>{n}</Text>
                    <Text style={{ color: ui.muted, fontSize: 9 }}>players</Text>
                  </Pressable>
                ))}
              </View>
              {quick.error && (
                <Text accessibilityLiveRegion="polite" style={shared.error}>
                  {quick.error}
                </Text>
              )}
              <Button disabled={!quick.available} onPress={() => void quick.start(seats)}>
                Quick Match →
              </Button>
            </>
          )}
        </Card>
      </View>

      <View style={shared.section}>
        <Text style={shared.sectionTitle}>More ways to play</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            account === 'guest' ? 'Challenge friends, account required' : 'Challenge friends'
          }
          onPress={() =>
            account === 'member' ? router.push('/friends') : setGate('friend challenges')
          }
          android_ripple={{ color: '#a7beff30' }}
          style={({ pressed }) => [
            s.option,
            { backgroundColor: theme.surface, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={s.optionIcon}>⚈⚈</Text>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={s.optionTitle}>Challenge Friends {account === 'guest' ? '🔒' : ''}</Text>
            <Text style={shared.small}>
              {account === 'guest'
                ? 'Create an account to add friends and challenge them.'
                : 'Pick one or two friends for a private table.'}
            </Text>
          </View>
          <Text style={[s.arrow, { color: theme.accent }]}>↗</Text>
        </Pressable>
        <View style={[s.option, { backgroundColor: theme.surface, opacity: 0.6 }]}>
          <Text style={s.optionIcon}>✉</Text>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={s.optionTitle}>Create Private Game</Text>
            <Text style={shared.small}>Invite by link. Coming soon.</Text>
          </View>
        </View>
      </View>

      {account === 'guest' && (
        <Card>
          <Label color={theme.accent}>PLAYING AS A GUEST</Label>
          <Text style={shared.sectionTitle}>
            {profile.games > 0
              ? `You’ve played ${profile.games} ${profile.games === 1 ? 'game' : 'games'} as a guest.`
              : 'Like it here? Make it yours.'}
          </Text>
          <Body>
            Create an account to save your game history, keep your coins and progress, and add
            friends. Nothing you have played is lost.
          </Body>
          <Button onPress={() => router.push(SIGN_UP_HREF)}>Sign Up</Button>
          <Button secondary compact onPress={() => router.push(LOGIN_HREF)}>
            Login
          </Button>
        </Card>
      )}

      <AccountGateSheet feature={gate} visible={gate !== null} onClose={() => setGate(null)} />
    </Screen>
  );
}

const s = StyleSheet.create({
  welcome: { color: ui.text, fontSize: 19, fontWeight: '800' },
  choice: {
    flex: 1,
    borderWidth: 1,
    borderColor: ui.line,
    borderRadius: 13,
    paddingVertical: 14,
    alignItems: 'center',
  },
  choiceText: { color: ui.text, fontSize: 15, fontWeight: '800' },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: ui.line,
  },
  optionIcon: { fontSize: 22, color: '#a7beff', width: 34, textAlign: 'center' },
  optionTitle: { color: ui.text, fontSize: 16, fontWeight: '800' },
  arrow: { fontSize: 22 },
});
