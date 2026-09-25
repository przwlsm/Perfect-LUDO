import {
  canPlayOnline,
  describeConnection,
  nextConnectionState,
  SERVER_UNAVAILABLE_AFTER,
  type ConnectionState,
} from './connectionState';

const sample = (linkUp: boolean, serverReachable: boolean | null, consecutiveFailures = 0) => ({
  linkUp,
  serverReachable,
  consecutiveFailures,
});

describe('nextConnectionState', () => {
  it('is OFFLINE whenever the device has no link, whatever the server said', () => {
    for (const previous of ['ONLINE', 'CONNECTING', 'SERVER_UNAVAILABLE'] as ConnectionState[]) {
      expect(nextConnectionState(previous, sample(false, true))).toBe('OFFLINE');
    }
  });

  it('is ONLINE only once the server actually answered', () => {
    expect(nextConnectionState('OFFLINE', sample(true, true))).toBe('ONLINE');
    expect(nextConnectionState('OFFLINE', sample(true, null))).toBe('CONNECTING');
  });

  it('says RECONNECTING when a previously good connection drops', () => {
    expect(nextConnectionState('ONLINE', sample(true, false, 1))).toBe('RECONNECTING');
    expect(nextConnectionState('RECONNECTING', sample(true, null, 1))).toBe('RECONNECTING');
  });

  it('says CONNECTING when the server has not answered yet on a fresh link', () => {
    expect(nextConnectionState('OFFLINE', sample(true, false, 1))).toBe('CONNECTING');
    expect(nextConnectionState('CONNECTING', sample(true, false, 2))).toBe('CONNECTING');
  });

  it('gives up on the server after repeated failures, and recovers on success', () => {
    expect(nextConnectionState('RECONNECTING', sample(true, false, SERVER_UNAVAILABLE_AFTER))).toBe(
      'SERVER_UNAVAILABLE',
    );
    expect(nextConnectionState('SERVER_UNAVAILABLE', sample(true, true))).toBe('ONLINE');
  });

  it('only allows online play when ONLINE', () => {
    expect(canPlayOnline('ONLINE')).toBe(true);
    for (const state of ['OFFLINE', 'CONNECTING', 'RECONNECTING', 'SERVER_UNAVAILABLE'] as const) {
      expect(canPlayOnline(state)).toBe(false);
    }
  });

  it('describes every state with a tone', () => {
    expect(describeConnection('ONLINE')).toEqual({ label: 'Online', tone: 'good' });
    expect(describeConnection('OFFLINE').tone).toBe('bad');
    expect(describeConnection('RECONNECTING').tone).toBe('warn');
  });
});
