import type { ConnectionState } from '../connectivity/connectionState';
import type { Unsubscribe } from '../entities/Social';

/**
 * Whether online play is possible right now. "Online" means the game server
 * answered, not merely that the device has Wi-Fi: a captive portal or a
 * server outage must read as unavailable, not as a green dot.
 */
export interface IConnectivityService {
  /** Current best knowledge, without waiting for a probe. */
  current(): ConnectionState;
  /** Fires immediately with the current state, then on every change. */
  subscribe(listener: (state: ConnectionState) => void): Unsubscribe;
  /** Re-probes the server now, e.g. when a player taps Retry. */
  refresh(): Promise<ConnectionState>;
}
