import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { Text } from '../components/AppText';
import { router, useLocalSearchParams } from 'expo-router';
import { parseInviteCode } from '@/domain';
import { challengeRepository } from '@/config/container';
import { Body, Button, Card, Label, Screen, shared } from '../components/Kit';
import { LOGIN_HREF } from '../social/AccountGate';
import { useProfile } from '../state/ProfileProvider';
import { useSocial } from '../state/SocialProvider';
import { useAuthSession } from '../state/useAuthSession';

/**
 * Where an invite link lands (perfectludo://join/CODE). Anyone can follow
 * one: a player with no session is offered guest play first, and the seat
 * is taken as soon as they have one.
 */
export default function JoinByCodeScreen() {
  const params = useLocalSearchParams<{ code?: string }>();
  const code = parseInviteCode(typeof params.code === 'string' ? params.code : '');
  const { theme } = useProfile();
  const { enabled, signedIn } = useSocial();
  const auth = useAuthSession();
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const started = useRef(-1);

  useEffect(() => {
    if (!code || !signedIn || !challengeRepository || started.current === attempt) return;
    started.current = attempt;
    setError(null);
    challengeRepository
      .joinLinkRoom(code)
      .then((lobbyId) => router.replace({ pathname: '/lobby/[id]', params: { id: lobbyId } }))
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : 'Could not join that game. Please try again.'),
      );
  }, [code, signedIn, attempt]);

  if (!enabled || !challengeRepository)
    return (
      <Screen nav={false} back title="Join a game" subtitle="INVITE LINK">
        <Card>
          <Body>This build has no game server configured, so invite links cannot be used.</Body>
          <Button onPress={() => router.replace('/')}>Back to the game</Button>
        </Card>
      </Screen>
    );

  if (!code)
    return (
      <Screen nav={false} back title="Join a game" subtitle="INVITE LINK">
        <Card>
          <Text style={shared.sectionTitle}>That link does not have a valid code</Text>
          <Body>
            Ask your friend to share the invite again, or enter the code on the Online tab.
          </Body>
          <Button onPress={() => router.replace('/online')}>Go to online play</Button>
        </Card>
      </Screen>
    );

  if (!signedIn)
    return (
      <Screen nav={false} back title="You’re invited" subtitle="INVITE LINK">
        <Card style={{ borderColor: `${theme.accent}40` }}>
          <Label color={theme.accent}>GAME {code}</Label>
          <Text style={shared.sectionTitle}>Take your seat</Text>
          <Body>Join as a guest right away, or sign in to play with your account.</Body>
          <Button disabled={auth.busy} onPress={() => void auth.continueAsGuest()}>
            {auth.busy ? 'Setting up your seat…' : 'Continue as Guest'}
          </Button>
          <Button secondary disabled={auth.busy} onPress={() => router.push(LOGIN_HREF)}>
            Login / Sign Up
          </Button>
          {auth.error && <Text style={shared.error}>{auth.error}</Text>}
        </Card>
      </Screen>
    );

  return (
    <Screen nav={false} back title="Joining the game" subtitle="INVITE LINK">
      <Card>
        <Label color={theme.accent}>GAME {code}</Label>
        {error ? (
          <>
            <Text accessibilityLiveRegion="polite" style={shared.error}>
              {error}
            </Text>
            <Button onPress={() => setAttempt((n) => n + 1)}>Try again</Button>
            <Button secondary onPress={() => router.replace('/online')}>
              Back to online play
            </Button>
          </>
        ) : (
          <>
            <ActivityIndicator color={theme.accent} />
            <Body>Finding your seat…</Body>
          </>
        )}
      </Card>
    </Screen>
  );
}
