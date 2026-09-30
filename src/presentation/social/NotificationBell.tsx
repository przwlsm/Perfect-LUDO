import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../components/AppText';
import { router } from 'expo-router';
import type { AppNotification } from '@/domain';
import { useProfile } from '../state/ProfileProvider';
import { useSocial } from '../state/SocialProvider';
import { ui } from '../theme/themes';

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

function relativeTime(iso: string, nowMs: number): string {
  const seconds = Math.max(0, Math.round((nowMs - Date.parse(iso)) / 1000));
  if (!Number.isFinite(seconds)) return '';
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

/**
 * Deliberately not part of the generic Kit: it reaches into social state, and
 * Kit is imported by screens that must keep working without an account.
 */
export function NotificationBell() {
  const { enabled, signedIn, notifications, unreadCount, markAllRead } = useSocial();
  const { theme } = useProfile();
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
          unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'
        }
        onPress={show}
        android_ripple={{ color: '#ffffff25' }}
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
              <Text style={s.panelTitle}>Notifications</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close notifications"
                onPress={() => setOpenedAt(null)}
                android_ripple={{ color: '#ffffff25' }}
                style={s.close}
              >
                <Text style={{ color: ui.muted, fontSize: 22 }}>×</Text>
              </Pressable>
            </View>
            {notifications.length === 0 ? (
              <Text style={s.empty}>Nothing yet. Friend requests and challenges land here.</Text>
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
                        {relativeTime(notification.createdAt, openedMs)}
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

const s = StyleSheet.create({
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
  badgeText: { color: '#251b13', fontSize: 10, fontWeight: '900' },
  overlay: { flex: 1, backgroundColor: '#030612cc', justifyContent: 'center', padding: 18 },
  panel: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '78%',
    alignSelf: 'center',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#ffffff20',
    padding: 20,
    gap: 14,
  },
  panelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  panelTitle: { color: ui.text, fontSize: 20, fontWeight: '800' },
  close: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  empty: { color: ui.muted, fontSize: 13.5, lineHeight: 21, paddingVertical: 12 },
  item: {
    flexDirection: 'row',
    gap: 12,
    padding: 13,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: ui.line,
  },
  itemIcon: { fontSize: 19 },
  itemTitle: { color: ui.text, fontSize: 14.5, fontWeight: '700' },
  itemMessage: { color: ui.muted, fontSize: 12.5, lineHeight: 18 },
  itemTime: { color: ui.subtle, fontSize: 10.5, fontWeight: '600' },
});
