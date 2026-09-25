import type { LobbyPlayer, PublicUser } from '../entities/Social';
import {
  agePresence,
  countJoined,
  countOnline,
  displayNameOf,
  initialsOf,
  isLobbyPlayerDisconnected,
  requiredFriendCount,
  secondsUntil,
  serverClockOffsetMs,
  toggleSelection,
} from './rules';

function user(overrides: Partial<PublicUser> = {}): PublicUser {
  return {
    id: 'u1',
    username: 'alex',
    displayName: 'Alex',
    avatar: null,
    publicId: '84729163',
    presence: 'ONLINE',
    lastSeen: '2026-09-24T10:00:00.000Z',
    ...overrides,
  };
}

function player(overrides: Partial<LobbyPlayer> = {}): LobbyPlayer {
  return {
    userId: 'u1',
    username: 'alex',
    displayName: 'Alex',
    avatar: null,
    seatIndex: 0,
    status: 'JOINED',
    isReady: true,
    isHost: false,
    joinedAt: null,
    invitationStatus: 'ACCEPTED',
    presence: 'ONLINE',
    lastSeen: '2026-09-24T10:00:00.000Z',
    ...overrides,
  };
}

describe('displayNameOf', () => {
  it('prefers the display name', () => {
    expect(displayNameOf({ displayName: 'Alex', username: 'alex99' })).toBe('Alex');
  });

  it('falls back to the username when the display name is blank', () => {
    expect(displayNameOf({ displayName: '   ', username: 'alex99' })).toBe('alex99');
    expect(displayNameOf({ displayName: null, username: 'alex99' })).toBe('alex99');
  });
});

describe('initialsOf', () => {
  it('uses the first letter of two words', () => {
    expect(initialsOf('Ada Lovelace')).toBe('AL');
  });

  it('uses the first two letters of a single word', () => {
    expect(initialsOf('alex')).toBe('AL');
  });

  it('survives an empty name', () => {
    expect(initialsOf('   ')).toBe('?');
  });
});

describe('agePresence', () => {
  const seen = '2026-09-24T10:00:00.000Z';
  const seenMs = Date.parse(seen);

  it('keeps a recent heartbeat online', () => {
    expect(agePresence('ONLINE', seen, seenMs + 30_000, 75)).toBe('ONLINE');
  });

  it('drops a stale heartbeat to offline', () => {
    expect(agePresence('ONLINE', seen, seenMs + 76_000, 75)).toBe('OFFLINE');
  });

  it('preserves away for a recent heartbeat', () => {
    expect(agePresence('AWAY', seen, seenMs + 1_000, 75)).toBe('AWAY');
  });

  it('preserves in-game for a recent heartbeat', () => {
    expect(agePresence('IN_GAME', seen, seenMs + 1_000, 75)).toBe('IN_GAME');
  });

  it('drops a stale in-game heartbeat rather than leaving them mid-match forever', () => {
    expect(agePresence('IN_GAME', seen, seenMs + 120_000, 75)).toBe('OFFLINE');
  });

  it('treats a missing or unparseable heartbeat as offline', () => {
    expect(agePresence('ONLINE', null, seenMs, 75)).toBe('OFFLINE');
    expect(agePresence('ONLINE', 'not-a-date', seenMs, 75)).toBe('OFFLINE');
  });
});

describe('countOnline', () => {
  it('counts every present state, but not offline', () => {
    const friends = [
      user({ id: 'a', presence: 'ONLINE' }),
      user({ id: 'b', presence: 'AWAY' }),
      user({ id: 'c', presence: 'IN_GAME' }),
      user({ id: 'd', presence: 'OFFLINE' }),
    ];
    expect(countOnline(friends)).toBe(3);
  });
});

describe('requiredFriendCount', () => {
  it('excludes the creator, who always fills a seat', () => {
    expect(requiredFriendCount(2)).toBe(1);
    expect(requiredFriendCount(3)).toBe(2);
  });
});

describe('toggleSelection', () => {
  it('adds up to the limit and then refuses', () => {
    expect(toggleSelection([], 'a', 2)).toEqual(['a']);
    expect(toggleSelection(['a'], 'b', 2)).toEqual(['a', 'b']);
    expect(toggleSelection(['a', 'b'], 'c', 2)).toEqual(['a', 'b']);
  });

  it('removes an already selected id even at the limit', () => {
    expect(toggleSelection(['a', 'b'], 'a', 2)).toEqual(['b']);
  });
});

describe('lobby player state', () => {
  it('reports a joined player with a stale heartbeat as disconnected', () => {
    expect(isLobbyPlayerDisconnected(player({ presence: 'OFFLINE' }))).toBe(true);
  });

  it('does not report a player who is in a game as disconnected', () => {
    expect(isLobbyPlayerDisconnected(player({ presence: 'IN_GAME' }))).toBe(false);
  });

  it('does not report an invited player as disconnected', () => {
    expect(isLobbyPlayerDisconnected(player({ status: 'INVITED', presence: 'OFFLINE' }))).toBe(
      false,
    );
  });

  it('counts only joined seats', () => {
    const players = [player({ userId: 'a' }), player({ userId: 'b', status: 'INVITED' })];
    expect(countJoined(players)).toBe(1);
  });
});

describe('countdown timing', () => {
  it('measures how far this device drifts from the server', () => {
    // Device clock reads 10:00:05 while the server says 10:00:00.
    const offset = serverClockOffsetMs(
      '2026-09-24T10:00:00.000Z',
      Date.parse('2026-09-24T10:00:05.000Z'),
    );
    expect(offset).toBe(-5_000);
  });

  it('corrects the remaining seconds for that drift', () => {
    const startAt = '2026-09-24T10:00:03.000Z';
    const deviceNow = Date.parse('2026-09-24T10:00:05.000Z');
    // Uncorrected this device would already have started the game; with the
    // server running 5s behind it correctly still has 3 seconds to wait.
    expect(secondsUntil(startAt, 0, deviceNow)).toBe(0);
    expect(secondsUntil(startAt, -5_000, deviceNow)).toBe(3);
  });

  it('never goes negative and treats a missing target as elapsed', () => {
    expect(
      secondsUntil('2026-09-24T09:00:00.000Z', 0, Date.parse('2026-09-24T10:00:00.000Z')),
    ).toBe(0);
    expect(secondsUntil(null, 0, 1)).toBe(0);
  });
});
