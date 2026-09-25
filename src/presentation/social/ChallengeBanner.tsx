import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { challengeRepository } from '@/config/container';
import { useProfile } from '../state/ProfileProvider';
import { useSocial } from '../state/SocialProvider';
import { ui } from '../theme/themes';

/**
 * Rendered above the navigator so a challenge reaches the player wherever
 * they are — mid-game, in the store, anywhere. Invitations arriving while the
 * app is closed are still waiting in the notification list on return.
 */
export function ChallengeBanner() {
  const { invite, dismissInvite } = useSocial();
  const { theme } = useProfile();
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!invite?.challengeId || !invite.lobbyId) return null;

  async function respond(accept: boolean) {
    if (!challengeRepository || !invite?.challengeId) return;
    setBusy(true);
    setError(null);
    try {
      const lobbyId = await challengeRepository.respondToChallenge(invite.challengeId, accept);
      dismissInvite();
      if (accept && lobbyId) router.push({ pathname: '/lobby/[id]', params: { id: lobbyId } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That invitation is no longer available.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View pointerEvents="box-none" style={[s.wrap, { paddingTop: insets.top + 10 }]}>
      <View style={[s.card, { backgroundColor: theme.surface, borderColor: `${theme.accent}66` }]}>
        <View style={s.header}>
          <Text style={s.emoji}>🎮</Text>
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={s.title}>{invite.title}</Text>
            <Text style={s.message}>{invite.message}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss invitation"
            onPress={dismissInvite}
            android_ripple={{ color: '#ffffff25' }}
            style={s.close}
          >
            <Text style={{ color: ui.subtle, fontSize: 20 }}>×</Text>
          </Pressable>
        </View>
        {error && <Text style={s.error}>{error}</Text>}
        <View style={s.actions}>
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => void respond(true)}
            android_ripple={{ color: '#00000025' }}
            style={[s.action, { backgroundColor: theme.accent, opacity: busy ? 0.5 : 1 }]}
          >
            <Text style={[s.actionText, { color: '#251b13' }]}>Join game</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => void respond(false)}
            android_ripple={{ color: '#ffffff25' }}
            style={[s.action, s.decline, { opacity: busy ? 0.5 : 1 }]}
          >
            <Text style={[s.actionText, { color: ui.text }]}>Decline</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 14,
    zIndex: 50,
  },
  card: {
    width: '100%',
    maxWidth: 460,
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 16,
    gap: 13,
    boxShadow: '0 12px 30px #00000070',
  },
  header: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  emoji: { fontSize: 26 },
  title: { color: ui.text, fontSize: 16, fontWeight: '800' },
  message: { color: ui.muted, fontSize: 13, lineHeight: 19 },
  close: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  error: { color: ui.danger, fontSize: 12.5 },
  actions: { flexDirection: 'row', gap: 10 },
  action: {
    flex: 1,
    minHeight: 46,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 3,
    borderBottomColor: '#00000040',
  },
  decline: { backgroundColor: '#ffffff12', borderWidth: 1, borderColor: '#ffffff26' },
  actionText: { fontSize: 14, fontWeight: '800' },
});
