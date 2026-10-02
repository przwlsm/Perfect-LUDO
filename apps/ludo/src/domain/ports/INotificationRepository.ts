import type { AppNotification, Unsubscribe } from '../entities/Social';

/**
 * Notifications are stored, not just pushed: a player who was offline when a
 * friend request or challenge arrived still finds it waiting on return.
 */
export interface INotificationRepository {
  list(limit?: number): Promise<readonly AppNotification[]>;
  markRead(ids?: readonly string[]): Promise<void>;
  /** Fires with each newly inserted notification for the signed-in user. */
  subscribe(onNotification: (notification: AppNotification) => void): Unsubscribe;
}
