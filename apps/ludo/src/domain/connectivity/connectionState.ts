/**
 * The five states the app communicates, in the words the spec uses. Only
 * ONLINE permits starting online play; the rest differ in what to tell the
 * player and whether to keep trying quietly.
 */
export type ConnectionState =
  'ONLINE' | 'OFFLINE' | 'CONNECTING' | 'RECONNECTING' | 'SERVER_UNAVAILABLE';

/** One observation: what the device link says, and what the last probe said. */
export interface ConnectivitySample {
  /** Device reports a network link (Wi-Fi, cellular, ethernet). */
  readonly linkUp: boolean;
  /** Result of the most recent server probe; null while the first one is in flight. */
  readonly serverReachable: boolean | null;
  /** Probes failed in a row while the link was up. */
  readonly consecutiveFailures: number;
}

/** Failures before a flaky server is called down rather than "reconnecting". */
export const SERVER_UNAVAILABLE_AFTER = 3;

/**
 * Pure and total, so every transition can be tested without a network:
 * given what was shown before and what was just observed, what to show now.
 */
export function nextConnectionState(
  previous: ConnectionState,
  sample: ConnectivitySample,
): ConnectionState {
  if (!sample.linkUp) return 'OFFLINE';
  if (sample.serverReachable === true) return 'ONLINE';
  if (sample.serverReachable === null) {
    // Link came back but nothing has been confirmed yet.
    return previous === 'ONLINE' || previous === 'RECONNECTING' ? 'RECONNECTING' : 'CONNECTING';
  }
  if (sample.consecutiveFailures >= SERVER_UNAVAILABLE_AFTER) return 'SERVER_UNAVAILABLE';
  // The link is fine and the server is not answering: either we never reached
  // it (still connecting) or we had it and lost it (reconnecting).
  return previous === 'ONLINE' || previous === 'RECONNECTING' ? 'RECONNECTING' : 'CONNECTING';
}

/** Whether online features may be started from this state. */
export function canPlayOnline(state: ConnectionState): boolean {
  return state === 'ONLINE';
}

/** Short, player-facing wording for a status pill. */
export function describeConnection(state: ConnectionState): {
  readonly label: string;
  readonly tone: 'good' | 'warn' | 'bad';
} {
  switch (state) {
    case 'ONLINE':
      return { label: 'Online', tone: 'good' };
    case 'CONNECTING':
      return { label: 'Connecting…', tone: 'warn' };
    case 'RECONNECTING':
      return { label: 'Reconnecting…', tone: 'warn' };
    case 'SERVER_UNAVAILABLE':
      return { label: 'Server unavailable', tone: 'bad' };
    default:
      return { label: 'Offline', tone: 'bad' };
  }
}
