import type { PresenceStatus } from '../entities/Social';

/**
 * Heartbeat-based presence.
 *
 * Being signed in is not the same as being here: a session outlives a closed
 * tab, a dead radio or a crashed app. Online therefore means "sent a
 * heartbeat recently", and going quiet is enough to go offline.
 */
export interface IPresenceService {
  heartbeat(status: PresenceStatus): Promise<void>;
  /** Mirrors the server's staleness rule so clients can age rows out locally. */
  getTimeoutSeconds(): Promise<number>;
}
