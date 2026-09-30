import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Text, TextInput } from '../components/AppText';
import { router, useLocalSearchParams } from 'expo-router';
import {
  describeConnection,
  MAX_PRIVATE_STAKE,
  parseInviteCode,
  REWARDS,
  VARIANT_INFO,
  type QuickMatchPlayerCount,
  type Stake,
  type GameVariant,
} from '@/domain';
import { Ionicons } from '@expo/vector-icons';
import { challengeRepository } from '@/config/container';
import { ConnectionPill } from '../components/ConnectionPill';
import { Body, Button, Card, Label, Screen, Sheet, shared } from '../components/Kit';
import { useQuickMatch } from '../hooks/useQuickMatch';
import { StakePicker } from '../components/StakePicker';
import { MatchmakingOverlay } from '../social/MatchmakingOverlay';
import { useMotionEnabled } from '../hooks/useMotionEnabled';
import { VariantPicker } from '../components/VariantPicker';
import { TeamsToggle } from '../components/TeamsToggle';
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
  const searchMotion = useMotionEnabled(profile.reducedMotion, quick.phase === 'searching');
  // The home screen can open this with a table size, or straight to a private room.
  const params = useLocalSearchParams<{
    seats?: string;
    private?: string;
    teams?: string;
    teamup?: string;
  }>();
  const [seats, setSeats] = useState<QuickMatchPlayerCount>(
    params.seats === '4' ? 4 : params.seats === '3' ? 3 : 2,
  );
  const [stake, setStake] = useState<Stake>(0);
  const [privateStake, setPrivateStake] = useState<Stake>(0);
  const [variant, setVariant] = useState<GameVariant>('classic');
  const [privateVariant, setPrivateVariant] = useState<GameVariant>('classic');
  const [teams, setTeams] = useState(params.teams === '1');
  const [teamUpBusy, setTeamUpBusy] = useState(false);
  const [teamUpError, setTeamUpError] = useState<string | null>(null);
  const teamUpStarted = useRef(false);
  const [privateTeams, setPrivateTeams] = useState(false);
  const [gate, setGate] = useState<string | null>(null);
  // Private game by invite link: pick a table size and share, or join by code.
  const [privateOpen, setPrivateOpen] = useState(params.private === '1');
  const [privateSeats, setPrivateSeats] = useState<QuickMatchPlayerCount>(2);
  const [codeInput, setCodeInput] = useState('');
  const [privateBusy, setPrivateBusy] = useState(false);
  const [privateError, setPrivateError] = useState<string | null>(null);

  /**
   * Closes the sheet first and moves on once it has gone: an Android dialog
   * still closing when the next screen opens can be left showing on return.
   */
  function openRoom(lobbyId: string) {
    setPrivateOpen(false);
    setTimeout(() => router.push({ pathname: '/lobby/[id]', params: { id: lobbyId } }), 250);
  }

  /** 2 v 2 with a friend: a team room with an invite code, ready to search together. */
  async function teamUp() {
    if (!challengeRepository || teamUpBusy) return;
    setTeamUpBusy(true);
    setTeamUpError(null);
    try {
      const room = await challengeRepository.createLinkRoom(4, stake, variant, true);
      openRoom(room.lobbyId);
    } catch (e) {
      setTeamUpError(
        e instanceof Error ? e.message : 'Could not create your team room. Try again.',
      );
    } finally {
      setTeamUpBusy(false);
    }
  }

  async function createPrivate() {
    if (!challengeRepository || privateBusy) return;
    setPrivateBusy(true);
    setPrivateError(null);
    try {
      const room = await challengeRepository.createLinkRoom(
        privateSeats,
        privateStake,
        privateVariant,
        privateTeams && privateSeats === 4,
      );
      openRoom(room.lobbyId);
    } catch (e) {
      setPrivateError(e instanceof Error ? e.message : 'Could not create the game. Try again.');
    } finally {
      setPrivateBusy(false);
    }
  }

  async function joinByCode() {
    if (!challengeRepository || privateBusy) return;
    const code = parseInviteCode(codeInput);
    if (!code) {
      setPrivateError('That code does not look right. It is six letters and numbers.');
      return;
    }
    setPrivateBusy(true);
    setPrivateError(null);
    try {
      const lobbyId = await challengeRepository.joinLinkRoom(code);
      setCodeInput('');
      openRoom(lobbyId);
    } catch (e) {
      setPrivateError(e instanceof Error ? e.message : 'Could not join that game. Try again.');
    } finally {
      setPrivateBusy(false);
    }
  }

  // The home screen's "2 v 2 with a friend" opens straight into a team room.
  useEffect(() => {
    if (params.teamup !== '1' || teamUpStarted.current) return;
    if (!signedIn || !connectivity.online || !challengeRepository) return;
    teamUpStarted.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- arriving from the home shortcut is the trigger
    void teamUp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.teamup, signedIn, connectivity.online]);

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
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Weekly tournament. Open leaderboard"
        onPress={() => router.push('/tournament')}
        android_ripple={{ color: `${theme.accent}30` }}
        style={[s.tourney, { borderColor: `${theme.accent}55` }]}
      >
        <View style={[s.tourneyIcon, { backgroundColor: `${theme.accent}22` }]}>
          <Ionicons name="trophy" size={22} color={theme.accent} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={s.tourneyTitle}>Weekly tournament</Text>
          <Text style={shared.small}>
            Every game +1 point, every win +3. Free tables pay up to +{REWARDS.online.win.coins}{' '}
            coins by finish; staked tables pay the pot.
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={ui.subtle} />
      </Pressable>

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
                      : `${seats}-player ${variant !== 'classic' ? `${VARIANT_INFO[variant].title} ` : ''}${stake > 0 ? `${stake}-coin ` : ''}table · ${quick.ticket?.waiting ?? 1} waiting`}
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
              <Label>GAME MODE</Label>
              <VariantPicker value={variant} onChange={setVariant} />
              {seats === 4 && <TeamsToggle value={teams} onChange={setTeams} />}
              <Label>ENTRY</Label>
              <StakePicker value={stake} players={seats} onChange={setStake} />
              {quick.error && (
                <Text accessibilityLiveRegion="polite" style={shared.error}>
                  {quick.error}
                </Text>
              )}
              <Button
                disabled={!quick.available}
                onPress={() => void quick.start(seats, stake, variant, teams && seats === 4)}
              >
                Quick Match →
              </Button>
            </>
          )}
        </Card>
      </View>

      <View style={shared.section}>
        <Text style={shared.sectionTitle}>2 v 2 teams</Text>
        <Card style={{ gap: 12, borderColor: `${ui.gem}55` }}>
          <Text style={shared.small}>
            Partners sit opposite, never capture each other, and win together.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Random 2 v 2"
            accessibilityHint="Play with three players from the queue"
            disabled={!quick.available || searching}
            onPress={() => {
              setSeats(4);
              setTeams(true);
              void quick.start(4, stake, variant, true);
            }}
            android_ripple={{ color: `${ui.gem}30` }}
            style={({ pressed }) => [
              s.option,
              { backgroundColor: theme.surface, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Ionicons name="shuffle" size={26} color={ui.gem} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={s.optionTitle}>Random 2 v 2</Text>
              <Text style={shared.small}>
                Four players from the queue. Your partner is picked for you.
              </Text>
            </View>
            <Text style={[s.arrow, { color: ui.gem }]}>↗</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Team up with a friend"
            accessibilityHint="Get a code for your friend, then find another team together"
            disabled={teamUpBusy}
            onPress={() => void teamUp()}
            android_ripple={{ color: `${ui.gem}30` }}
            style={({ pressed }) => [
              s.option,
              { backgroundColor: theme.surface, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Ionicons name="people" size={26} color={ui.gem} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={s.optionTitle}>
                {teamUpBusy ? 'Creating your team…' : 'Team up with a friend'}
              </Text>
              <Text style={shared.small}>
                Send your friend a code. Together you play another team of friends.
              </Text>
            </View>
            <Text style={[s.arrow, { color: ui.gem }]}>↗</Text>
          </Pressable>
          {teamUpError && <Text style={shared.error}>{teamUpError}</Text>}
          <Text style={shared.small}>Uses the game mode and entry you picked above.</Text>
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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Create a private game or join with a code"
          onPress={() => {
            setPrivateError(null);
            setPrivateOpen(true);
          }}
          android_ripple={{ color: `${theme.accent}30` }}
          style={({ pressed }) => [
            s.option,
            { backgroundColor: theme.surface, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={s.optionIcon}>✉</Text>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={s.optionTitle}>Private Game</Text>
            <Text style={shared.small}>Invite anyone with a link, or join with a code.</Text>
          </View>
          <Text style={[s.arrow, { color: theme.accent }]}>↗</Text>
        </Pressable>
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

      <MatchmakingOverlay
        visible={searching || quick.phase === 'matched'}
        matched={quick.phase === 'matched'}
        seats={seats}
        variant={variant}
        teams={teams && seats === 4}
        stake={stake}
        waiting={quick.ticket?.waiting ?? null}
        you={{ id: identity?.id ?? 'me', name, avatar: identity?.avatar ?? null }}
        error={quick.error}
        motionEnabled={searchMotion}
        onCancel={() => void quick.cancel()}
      />
      <AccountGateSheet feature={gate} visible={gate !== null} onClose={() => setGate(null)} />
      <Sheet
        visible={privateOpen}
        onClose={() => {
          if (!privateBusy) setPrivateOpen(false);
        }}
        title="Private game"
      >
        <Label color={theme.accent}>START A TABLE</Label>
        <Body>Pick the table size. You will get a link and a code to send to anyone.</Body>
        <View style={shared.row}>
          {SEATS.map((n) => (
            <Pressable
              key={n}
              accessibilityRole="button"
              accessibilityLabel={`${n} players`}
              accessibilityState={{ selected: n === privateSeats }}
              onPress={() => setPrivateSeats(n)}
              android_ripple={{ color: `${theme.accent}30` }}
              style={[
                s.choice,
                { backgroundColor: theme.surface },
                n === privateSeats && { borderColor: theme.accent },
              ]}
            >
              <Text style={s.choiceText}>{n}</Text>
              <Text style={{ color: ui.muted, fontSize: 9 }}>players</Text>
            </Pressable>
          ))}
        </View>
        <VariantPicker value={privateVariant} onChange={setPrivateVariant} />
        {privateSeats === 4 && <TeamsToggle value={privateTeams} onChange={setPrivateTeams} />}
        <StakePicker
          value={privateStake}
          players={privateSeats}
          maxStake={MAX_PRIVATE_STAKE}
          onChange={setPrivateStake}
        />
        <Button disabled={privateBusy} onPress={() => void createPrivate()}>
          {privateBusy ? 'Working…' : 'Create game & get link'}
        </Button>
        <Label color={theme.accent}>HAVE A CODE?</Label>
        <Text style={shared.small}>
          Type the six-character code, or paste the whole invite message.
        </Text>
        <TextInput
          accessibilityLabel="Invite code"
          value={codeInput}
          onChangeText={(t) => {
            setCodeInput(t);
            setPrivateError(null);
          }}
          editable={!privateBusy}
          placeholder="e.g. K7Q2MX"
          placeholderTextColor={ui.muted}
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="go"
          onSubmitEditing={() => void joinByCode()}
          style={s.codeInput}
        />
        <Button
          secondary
          disabled={privateBusy || !codeInput.trim()}
          onPress={() => void joinByCode()}
        >
          Join game
        </Button>
        {privateError && (
          <Text accessibilityLiveRegion="polite" style={shared.error}>
            {privateError}
          </Text>
        )}
      </Sheet>
    </Screen>
  );
}

const s = StyleSheet.create({
  tourney: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    backgroundColor: '#2a2210',
  },
  tourneyIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tourneyTitle: { color: ui.text, fontSize: 16, fontWeight: '800' },
  codeInput: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: '#ffffff28',
    borderRadius: 12,
    backgroundColor: '#00000020',
    color: ui.text,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 2,
    paddingHorizontal: 14,
  },
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
