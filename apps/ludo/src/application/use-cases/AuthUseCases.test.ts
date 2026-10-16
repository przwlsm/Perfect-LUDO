import { InMemoryAuthProvider } from '@/domain/testing/InMemoryAuthProvider';
import { InMemoryUserProgressRepository } from '@/domain/testing/InMemoryUserProgressRepository';
import { signIn, signOut, signUp } from './AuthUseCases';

describe('signUp', () => {
  it('creates both the auth account and its progress profile', async () => {
    const auth = new InMemoryAuthProvider();
    const progress = new InMemoryUserProgressRepository();

    const { user, profile } = await signUp(auth, progress, 'a@test.com', 'pw', {
      displayName: 'Alice',
      coins: 1000,
      gamesPlayed: 0,
      gamesWon: 0,
      streak: 0,
      bestStreak: 0,
    });

    expect(user.email).toBe('a@test.com');
    expect(profile.uid).toBe(user.uid);
    expect(profile.displayName).toBe('Alice');
    expect(profile.coins).toBe(1000);
    // The seeded profile must be readable back, not just returned.
    await expect(progress.getProfile(user.uid)).resolves.toMatchObject({ coins: 1000 });
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
