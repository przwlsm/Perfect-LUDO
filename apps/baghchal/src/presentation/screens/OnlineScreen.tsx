import { useCallback, useEffect, useState } from 'react';
import { router } from 'expo-router';
import { goBackOrHome } from '../platform/navigation';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Side } from 'baghchal-engine';
import { onlineMatches } from '@/config/container';
import type { OnlineMatchSnapshot } from '@/domain/entities/OnlineMatch';
import { useSession } from '../state/SessionProvider';
import { colors } from '../theme/colors';

const TURN_SECONDS = 45;
/** While waiting for an opponent, Realtime is backed up by this. */
const WAIT_POLL_MS = 4000;

export function OnlineScreen() {
  const { status, session, error: sessionError, retry } = useSession();
  const repo = onlineMatches;
  const [side, setSide] = useState<Side>('goat');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [waiting, setWaiting] = useState<OnlineMatchSnapshot | null>(null);

  const open = useCallback((snapshot: OnlineMatchSnapshot) => {
    router.replace({ pathname: '/match/[id]', params: { id: snapshot.match.id } });
  }, []);

  // The host waits here until someone joins, then both go to the board.
  useEffect(() => {
    if (!waiting || !repo) return;
    const id = waiting.match.id;
    let live = true;
    const check = () =>
      repo.get(id).then(
        (snapshot) => {
          if (!live) return;
          if (snapshot.match.status === 'ACTIVE') open(snapshot);
          else if (snapshot.match.status !== 'WAITING') setWaiting(null);
        },
        () => undefined,
      );
    const unsubscribe = repo.subscribe(id, () => void check());
    const poll = setInterval(() => void check(), WAIT_POLL_MS);
    return () => {
      live = false;
      unsubscribe();
      clearInterval(poll);
    };
  }, [waiting, repo, open]);

  const run = async (
    action: () => Promise<OnlineMatchSnapshot>,
    then: (s: OnlineMatchSnapshot) => void,
  ) => {
    setBusy(true);
    setError(null);
    try {
      then(await action());
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  const create = () => repo && run(() => repo.create(side, TURN_SECONDS), setWaiting);
  const join = () => repo && run(() => repo.join(code), open);
  const cancel = () => {
    if (!repo || !waiting) return;
    const id = waiting.match.id;
    setWaiting(null);
    void repo.resign(id).catch(() => undefined);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <Pressable onPress={() => goBackOrHome()} accessibilityRole="button" hitSlop={12}>
        <Text style={styles.back}>‹ Menu</Text>
      </Pressable>
      <Text style={styles.title}>Online</Text>

      {status === 'unavailable' && (
        <Text style={styles.note}>This build has no game server configured.</Text>
      )}
      {status === 'loading' && <ActivityIndicator color={colors.accent} style={styles.spinner} />}
      {status === 'error' && (
        <View style={styles.card}>
          <Text style={styles.error}>{sessionError}</Text>
          <Primary label="Try again" onPress={retry} />
        </View>
      )}

      {status === 'ready' && session && repo && !waiting && (
        <>
          <Text style={styles.note}>
            Playing as {session.profile.displayName ?? session.profile.username}
          </Text>

          <Text style={styles.heading}>Invite a friend</Text>
          <View style={styles.row}>
            {(['goat', 'tiger'] as const).map((option) => (
              <Pressable
                key={option}
                onPress={() => setSide(option)}
                accessibilityRole="radio"
                accessibilityState={{ checked: side === option }}
                style={[styles.chip, side === option && styles.chipChosen]}
              >
                <Text style={[styles.chipText, side === option && styles.chipTextChosen]}>
                  I play {option === 'goat' ? 'Goats' : 'Tigers'}
                </Text>
              </Pressable>
            ))}
          </View>
          <Primary label="Create game" onPress={create} disabled={busy} />

          <Text style={styles.heading}>Join with a code</Text>
          <TextInput
            value={code}
            onChangeText={(text) =>
              setCode(
                text
                  .toUpperCase()
                  .replace(/[^A-Z0-9]/g, '')
                  .slice(0, 6),
              )
            }
            placeholder="ABC123"
            placeholderTextColor={colors.muted}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={6}
            style={styles.input}
            accessibilityLabel="Invitation code"
          />
          <Primary label="Join game" onPress={join} disabled={busy || code.length !== 6} />
          {error && <Text style={styles.error}>{error}</Text>}
        </>
      )}

      {waiting && (
        <View style={styles.card}>
          <Text style={styles.note}>Share this code</Text>
          <Text
            style={styles.code}
            selectable
            accessibilityLabel={`Code ${waiting.match.code.split('').join(' ')}`}
          >
            {waiting.match.code}
          </Text>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.note}>Waiting for an opponent…</Text>
          <Pressable onPress={cancel} accessibilityRole="button" hitSlop={10}>
            <Text style={styles.back}>Cancel</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

function Primary({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={[styles.primary, disabled && styles.disabled]}
    >
      <Text style={styles.primaryText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 24 },
  back: { color: colors.accent, fontSize: 17, fontWeight: '600', paddingVertical: 12 },
  title: { color: colors.text, fontSize: 32, fontWeight: '800' },
  heading: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 28,
    marginBottom: 10,
  },
  note: { color: colors.muted, fontSize: 14, marginTop: 6 },
  spinner: { marginTop: 32 },
  row: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  chip: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  chipChosen: { borderColor: colors.accent },
  chipText: { color: colors.text, fontSize: 15, fontWeight: '600' },
  chipTextChosen: { color: colors.accent },
  input: {
    backgroundColor: colors.surface,
    color: colors.text,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 22,
    letterSpacing: 6,
    textAlign: 'center',
    marginBottom: 12,
  },
  primary: {
    backgroundColor: colors.accent,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
  },
  primaryText: { color: colors.onAccent, fontSize: 16, fontWeight: '800' },
  disabled: { opacity: 0.4 },
  error: { color: '#ff8a80', fontSize: 14, marginTop: 12 },
  card: {
    marginTop: 24,
    padding: 24,
    borderRadius: 16,
    backgroundColor: colors.surface,
    alignItems: 'center',
    gap: 14,
  },
  code: { color: colors.text, fontSize: 40, fontWeight: '800', letterSpacing: 8 },
});
