import { useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Text } from '../components/AppText';
import { router } from 'expo-router';
import type { AppNotification } from '@/domain';
import { useProfile } from '../state/ProfileProvider';
import { useSocial } from '../state/SocialProvider';
import { makeStyles, useUi } from '../theme/AppearanceProvider';
import { liftByDay } from '../theme/surfaces';

const ICON: Record<AppNotification['type'], string> = {
  FRIEND_REQUEST: '👋',
  FRIEND_REQUEST_ACCEPTED: '🤝',
  GIFT: '🎁',
  CHALLENGE_INVITE: '🎮',
  CHALLENGE_ACCEPTED: '✅',
  CHALLENGE_DECLINED: '🚪',
  CHALLENGE_EXPIRED: '⏱',
  CHALLENGE_CANCELLED: '✖',
  GAME_STARTED: '🎲',
};

function relativeTime(t: TFunction<'social'>, iso: string, nowMs: number): string {
  const seconds = Math.max(0, Math.round((nowMs - Date.parse(iso)) / 1000));
  if (!Number.isFinite(seconds)) return '';
  if (seconds < 60) return t('notifications.justNow');
  if (seconds < 3600) return t('notifications.minutesAgo', { count: Math.floor(seconds / 60) });
  if (seconds < 86400) return t('notifications.hoursAgo', { count: Math.floor(seconds / 3600) });
  return t('notifications.daysAgo', { count: Math.floor(seconds / 86400) });
}

/**
 * Deliberately not part of the generic Kit: it reaches into social state, and
 * Kit is imported by screens that must keep working without an account.
 */
export function NotificationBell() {
  const { enabled, signedIn, notifications, unreadCount, markAllRead } = useSocial();
  const { theme } = useProfile();
  const { t } = useTranslation('social');
  const s = useStyles();
  const ui = useUi();
  // Timestamps are relative to when the panel was opened, so rendering stays
  // pure and the list does not silently re-time itself under the reader.
  const [openedAt, setOpenedAt] = useState<number | null>(null);
  const open = openedAt !== null;
  // Safe fallback: the panel only renders while openedAt is set.
  const openedMs = openedAt ?? 0;

  if (!enabled || !signedIn) return null;

  function show() {
    setOpenedAt(Date.now());
    void markAllRead();
  }

  function follow(notification: AppNotification) {
    setOpenedAt(null);
    if (notification.lobbyId) {
      router.push({ pathname: '/lobby/[id]', params: { id: notification.lobbyId } });
    } else router.push('/friends');
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          unreadCount > 0
            ? t('notifications.unreadA11y', { count: unreadCount })
            : t('notifications.a11y')
        }
        onPress={show}
        android_ripple={{ color: ui.ripple }}
        // The header has no room for a larger bell; the slop lifts its touch area to 48x48.
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 4 }}
        style={s.bell}
      >
        <Text style={s.bellIcon}>🔔</Text>
        {unreadCount > 0 && (
          <View style={[s.badge, { backgroundColor: theme.accent }]}>
            <Text style={s.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
          </View>
        )}
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpenedAt(null)}
      >
        <Pressable style={s.overlay} onPress={() => setOpenedAt(null)}>
          <Pressable
            accessibilityViewIsModal
            style={[s.panel, { backgroundColor: theme.background }]}
            onPress={() => undefined}
          >
            <View style={s.panelHeader}>
              <Text style={s.panelTitle}>{t('notifications.title')}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('notifications.close')}
                onPress={() => setOpenedAt(null)}
                android_ripple={{ color: ui.ripple }}
                style={s.close}
              >
                <Text style={{ color: ui.muted, fontSize: 22 }}>×</Text>
              </Pressable>
            </View>
            {notifications.length === 0 ? (
              <Text style={s.empty}>{t('notifications.empty')}</Text>
            ) : (
              <ScrollView contentContainerStyle={{ gap: 9 }} showsVerticalScrollIndicator={false}>
                {notifications.map((notification) => (
                  <Pressable
                    key={notification.id}
                    accessibilityRole="button"
                    onPress={() => follow(notification)}
                    android_ripple={{ color: `${theme.accent}25` }}
                    style={[s.item, { backgroundColor: theme.surface }]}
                  >
                    <Text style={s.itemIcon}>{ICON[notification.type]}</Text>
                    <View style={{ flex: 1, gap: 3 }}>
                      <Text style={s.itemTitle}>{notification.title}</Text>
                      <Text style={s.itemMessage}>{notification.message}</Text>
                      <Text style={s.itemTime}>
                        {relativeTime(t, notification.createdAt, openedMs)}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const useStyles = makeStyles((ui) => ({
  bell: { width: 38, height: 36, alignItems: 'center', justifyContent: 'center' },
  bellIcon: { fontSize: 19 },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Dark ink on the accent badge, the same in both modes.
  badgeText: { color: '#251b13', fontSize: 10, fontWeight: '900' },
  overlay: { flex: 1, backgroundColor: ui.scrim, justifyContent: 'center', padding: 18 },
  panel: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '78%',
    alignSelf: 'center',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: ui.border,
    padding: 20,
    gap: 14,
    // Lifts the paper panel off the dimmed page by day; night is unchanged.
    ...(ui.scheme === 'light' && { boxShadow: `0 12px 30px ${ui.shadow}` }),
  },
  panelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  panelTitle: { color: ui.text, fontSize: 20, fontWeight: '800' },
  close: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  empty: { color: ui.muted, fontSize: 13.5, lineHeight: 21, paddingVertical: 12 },
  item: {
    flexDirection: 'row',
    gap: 12,
    padding: 13,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: ui.line,
    // White cards lifted off the ivory panel by day; night is unchanged.
    boxShadow: liftByDay(ui),
  },
  itemIcon: { fontSize: 19 },
  itemTitle: { color: ui.text, fontSize: 14.5, fontWeight: '700' },
  itemMessage: { color: ui.muted, fontSize: 12.5, lineHeight: 18 },
  itemTime: { color: ui.subtle, fontSize: 10.5, fontWeight: '600' },
}));
