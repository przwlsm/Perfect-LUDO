import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '../components/AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { challengeRepository } from '@/config/container';
import { useProfile } from '../state/ProfileProvider';
import { useSocial } from '../state/SocialProvider';
import { makeStyles, useUi } from '../theme/AppearanceProvider';

/**
 * Rendered above the navigator so a challenge reaches the player wherever
 * they are — mid-game, in the store, anywhere. Invitations arriving while the
 * app is closed are still waiting in the notification list on return.
 */
export function ChallengeBanner() {
  const { invite, dismissInvite } = useSocial();
  const { theme } = useProfile();
  const { t } = useTranslation('social');
  const insets = useSafeAreaInsets();
  const s = useStyles();
  const ui = useUi();
  const [busy, setBusy] = useState(false);
  // The server's message, or {} when the translated fallback applies.
  const [error, setError] = useState<{ message?: string } | null>(null);

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
      setError(e instanceof Error ? { message: e.message } : {});
    } finally {
      setBusy(false);
    }
  }

  return (
    <View pointerEvents="box-none" style={[s.wrap, { paddingTop: insets.top + 10 }]}>
      <View
        style={[
          s.card,
          // A white card with a hairline by day (the 60%); night keeps its accent rim.
          {
            backgroundColor: theme.surface,
            borderColor: ui.scheme === 'dark' ? `${theme.accent}66` : ui.line,
          },
        ]}
      >
        <View style={s.header}>
          <Text style={s.emoji}>🎮</Text>
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={s.title}>{invite.title}</Text>
            <Text style={s.message}>{invite.message}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('invite.dismiss')}
            onPress={dismissInvite}
            android_ripple={{ color: ui.ripple }}
            style={s.close}
          >
            <Text style={{ color: ui.subtle, fontSize: 20 }}>×</Text>
          </Pressable>
        </View>
        {error && <Text style={s.error}>{error.message ?? t('invite.unavailable')}</Text>}
        <View style={s.actions}>
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => void respond(true)}
            android_ripple={{ color: '#00000025' }}
            style={[s.action, { backgroundColor: theme.accent, opacity: busy ? 0.5 : 1 }]}
          >
            <Text style={[s.actionText, { color: '#251b13' }]}>{t('invite.join')}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => void respond(false)}
            android_ripple={{ color: ui.ripple }}
            style={[s.action, s.decline, { opacity: busy ? 0.5 : 1 }]}
          >
            <Text style={[s.actionText, { color: ui.secondaryText }]}>{t('invite.decline')}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const useStyles = makeStyles((ui) => ({
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
    // It floats over any page: a heavier shadow at night, the soft token by day.
    boxShadow: `0 12px 30px ${ui.scheme === 'dark' ? '#00000070' : ui.shadow}`,
  },
  header: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  emoji: { fontSize: 26 },
  title: { color: ui.text, fontSize: 16, fontWeight: '800' },
  message: { color: ui.muted, fontSize: 13, lineHeight: 19 },
  close: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  error: { color: ui.danger, fontSize: 12.5 },
  actions: { flexDirection: 'row', gap: 10 },
  action: {
    flex: 1,
    minHeight: 48,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 3,
    borderBottomColor: ui.shadow,
  },
  // Night: the faint glass key as before. Day: the navy secondary (the 30%).
  decline:
    ui.scheme === 'dark'
      ? { backgroundColor: ui.fillStrong, borderWidth: 1, borderColor: ui.border }
      : { backgroundColor: ui.navy, borderBottomColor: ui.navyRim },
  actionText: { fontSize: 14, fontWeight: '800' },
}));
