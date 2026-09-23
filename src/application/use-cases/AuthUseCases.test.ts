import { InMemoryAuthProvider } from '@/domain/testing/InMemoryAuthProvider';
import { InMemoryUserProgressRepository } from '@/domain/testing/InMemoryUserProgressRepository';
import { signIn, signOut, signUp } from './AuthUseCases';

describe('signUp', () => {
  it('creates both the auth account and its progress profile', async () => {
    const auth = new InMemoryAuthProvider();
    const progress = new InMemoryUserProgressRepository();

    const { user, profile } = await signUp(auth, progress, 'a@test.com', 'pw', 'Alice');

    expect(user.email).toBe('a@test.com');
    expect(profile.uid).toBe(user.uid);
    expect(profile.displayName).toBe('Alice');
    expect(profile.stats).toEqual({ gamesPlayed: 0, gamesWon: 0 });
    expect(auth.getCurrentUser()).toEqual(user);
  });
});

describe('signIn / signOut', () => {
  it('signs an existing user back in', async () => {
    const auth = new InMemoryAuthProvider();
    await auth.signUp('a@test.com', 'pw');
    await signOut(auth);

    const user = await signIn(auth, 'a@test.com', 'pw');

    expect(user.email).toBe('a@test.com');
    expect(auth.getCurrentUser()).toEqual(user);
  });

  it('rejects an incorrect password', async () => {
    const auth = new InMemoryAuthProvider();
    await auth.signUp('a@test.com', 'pw');

    await expect(signIn(auth, 'a@test.com', 'wrong')).rejects.toThrow();
  });

  it('clears the current user on sign out', async () => {
    const auth = new InMemoryAuthProvider();
    await auth.signUp('a@test.com', 'pw');

    await signOut(auth);

    expect(auth.getCurrentUser()).toBeNull();
  });
});
