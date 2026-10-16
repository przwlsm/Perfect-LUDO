import type { Profile } from '@/domain/entities/OnlineMatch';
import { InMemoryAuthProvider } from '@/domain/testing/InMemoryAuthProvider';
import { ensureSignedIn } from './session';

const profile: Profile = {
  id: 'guest-1',
  username: 'player_abc123',
  displayName: null,
  ratingTiger: 1200,
  ratingGoat: 1200,
  coins: 100,
};
const profiles = { ensure: jest.fn(async () => profile) };

describe('ensureSignedIn', () => {
  beforeEach(() => profiles.ensure.mockClear());

  it('keeps the saved login and never makes a second guest', async () => {
    const auth = new InMemoryAuthProvider({ uid: 'saved', isGuest: false });
    const session = await ensureSignedIn(auth, profiles);
    expect(session.user.uid).toBe('saved');
    expect(auth.guests).toBe(0);
    expect(profiles.ensure).toHaveBeenCalledTimes(1);
  });

  it('signs in as a guest when nothing is saved', async () => {
    const auth = new InMemoryAuthProvider();
    const session = await ensureSignedIn(auth, profiles);
    expect(session.user).toEqual({ uid: 'guest-1', isGuest: true });
    expect(session.profile).toBe(profile);
  });
});
