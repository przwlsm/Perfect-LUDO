import { createGame } from 'baghchal-engine';
import type { OnlineMatchSnapshot } from '@/domain/entities/OnlineMatch';
import { canClaimTimeout, isMyTurn, secondsLeft } from './matchView';

const snapshot: OnlineMatchSnapshot = {
  serverNow: '2026-10-02T10:00:00.000Z',
  mySide: 'goat',
  match: {
    id: 'm1',
    code: 'ABCDEF',
    status: 'ACTIVE',
    hostId: 'a',
    tigerId: 'b',
    goatId: 'a',
    state: createGame(),
    outcome: null,
    version: 1,
    turnSeconds: 45,
    turnDeadline: '2026-10-02T10:00:45.000Z',
    lastMove: null,
    myReward: null,
    myRewardDoubled: false,
  },
  players: { tiger: null, goat: null },
};
const received = Date.parse('2026-10-02T09:59:50.000Z'); // the device clock runs 10 s slow

describe('isMyTurn', () => {
  it('is true for the side to move in an active game', () => {
    expect(isMyTurn(snapshot)).toBe(true);
    expect(isMyTurn({ ...snapshot, mySide: 'tiger' })).toBe(false);
    expect(isMyTurn({ ...snapshot, match: { ...snapshot.match, status: 'WAITING' } })).toBe(false);
  });
});

describe('secondsLeft', () => {
  it('counts down from the server clock, whatever the device clock says', () => {
    expect(secondsLeft(snapshot, received, received)).toBe(45);
    // A ticker that last fired before the snapshot arrived never adds time.
    expect(secondsLeft(snapshot, received, received - 900)).toBe(45);
    expect(secondsLeft(snapshot, received, received + 20_000)).toBe(25);
    expect(secondsLeft(snapshot, received, received + 90_000)).toBe(0);
  });

  it('is null without a running clock', () => {
    expect(
      secondsLeft({ ...snapshot, match: { ...snapshot.match, turnDeadline: null } }, 0, 0),
    ).toBeNull();
    expect(
      secondsLeft({ ...snapshot, match: { ...snapshot.match, status: 'FINISHED' } }, 0, 0),
    ).toBeNull();
  });
});

describe('canClaimTimeout', () => {
  const waiting = { ...snapshot, mySide: 'tiger' as const };

  it('is allowed only to the waiting player once the clock is out', () => {
    expect(canClaimTimeout(waiting, received, received + 10_000)).toBe(false);
    expect(canClaimTimeout(waiting, received, received + 46_000)).toBe(true);
    expect(canClaimTimeout(snapshot, received, received + 46_000)).toBe(false);
  });
});
