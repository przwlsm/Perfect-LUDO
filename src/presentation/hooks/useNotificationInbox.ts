import { useCallback, useEffect, useState } from 'react';
import { notificationRepository } from '@/config/container';
import type { AppNotification } from '@/domain';

const NONE: readonly AppNotification[] = [];
const KEEP = 30;

export interface NotificationInbox {
  readonly notifications: readonly AppNotification[];
  readonly unreadCount: number;
  /** A challenge that arrived while the app was open, shown over any screen. */
  readonly invite: AppNotification | null;
  dismissInvite(): void;
  refresh(): Promise<void>;
  markAllRead(): Promise<void>;
}

/**
 * Owns one thing: the player's notification inbox.
 *
 * Notifications are stored rather than only pushed, so somebody who was
 * offline when a request or challenge arrived still finds it waiting.
 */
export function useNotificationInbox(signedIn: boolean): NotificationInbox {
  const [notifications, setNotifications] = useState<readonly AppNotification[]>(NONE);
  const [invite, setInvite] = useState<AppNotification | null>(null);

  const refresh = useCallback((): Promise<void> => {
    if (!notificationRepository || !signedIn) return Promise.resolve();
    return (
      notificationRepository
        .list()
        .then((next) => setNotifications(next))
        // An unreadable inbox must not break the screen behind it.
        .catch(() => undefined)
    );
  }, [signedIn]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!notificationRepository || !signedIn) return;
    return notificationRepository.subscribe((notification) => {
      setNotifications((current) =>
        current.some((item) => item.id === notification.id)
          ? current
          : [notification, ...current].slice(0, KEEP),
      );
      if (notification.type === 'CHALLENGE_INVITE' && notification.lobbyId) {
        setInvite(notification);
      }
    });
  }, [signedIn]);

  const markAllRead = useCallback(async () => {
    if (!notificationRepository) return;
    const unread = notifications.filter((item) => !item.isRead).map((item) => item.id);
    if (unread.length === 0) return;
    setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
    try {
      await notificationRepository.markRead(unread);
    } catch {
      void refresh();
    }
  }, [notifications, refresh]);

  // Derived rather than cleared in an effect, so signing out cannot leave the
  // previous account's inbox on screen.
  const visible = signedIn ? notifications : NONE;

  return {
    notifications: visible,
    unreadCount: visible.reduce((total, item) => total + (item.isRead ? 0 : 1), 0),
    invite: signedIn ? invite : null,
    dismissInvite: () => setInvite(null),
    refresh,
    markAllRead,
  };
}
