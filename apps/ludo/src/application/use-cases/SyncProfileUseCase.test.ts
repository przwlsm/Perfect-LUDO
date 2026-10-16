import { InMemoryUserProgressRepository } from '@/domain/testing/InMemoryUserProgressRepository';
import type { UserProfile } from '@/domain';
import { INITIAL_PROFILE, type Profile } from '../store/ProfileService';
import { mergeCloudProfile, pushDisplayName, syncOnSignIn } from './SyncProfileUseCase';

function localProfile(overrides: Partial<Profile> = {}): Profile {
  return { ...INITIAL_PROFILE, ...overrides };
}

function cloudProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    uid: 'uid-1',
    displayName: 'Cloud Name',
    coins: 0,
    gamesPlayed: 0,
    gamesWon: 0,
    streak: 0,
    bestStreak: 0,
    ...overrides,
  };
}

describe('mergeCloudProfile', () => {
  it('keeps the better of each counter so signing in never costs progress', () => {
    const merged = mergeCloudProfile(
      localProfile({ coins: 2500, games: 10, wins: 6, streak: 2, bestStreak: 4 }),
      cloudProfile({ coins: 800, gamesPlayed: 3, gamesWon: 1, streak: 1, bestStreak: 1 }),
    );

    expect(merged.coins).toBe(2500);
    expect(merged.games).toBe(10);
    expect(merged.wins).toBe(6);
    expect(merged.bestStreak).toBe(4);
  });

  it('adopts cloud progress when the account is further along than this device', () => {
    const merged = mergeCloudProfile(
      localProfile({ coins: 100, games: 1, wins: 0, streak: 0, bestStreak: 0 }),
      cloudProfile({ coins: 4000, gamesPlayed: 20, gamesWon: 12, streak: 5, bestStreak: 7 }),
    );

    expect(merged.coins).toBe(100);
    expect(merged.games).toBe(20);
    expect(merged.streak).toBe(5);
    expect(merged.bestStreak).toBe(7);
  });

  it('is idempotent, so re-syncing does not inflate totals', () => {
    const local = localProfile({ coins: 1500, games: 4, wins: 3, streak: 3, bestStreak: 3 });
    const cloud = cloudProfile({
      displayName: local.name,
      gamesPlayed: 4,
      gamesWon: 3,
      streak: 3,
      bestStreak: 3,
    });
    const once = mergeCloudProfile(local, cloud);
    const twice = mergeCloudProfile(once, cloud);

    expect(twice).toEqual(once);
    expect(twice.coins).toBe(1500);
    expect(twice.games).toBe(4);
  });

  it('leaves device-only settings alone', () => {
    const merged = mergeCloudProfile(
      localProfile({ board3d: true, reducedMotion: true, soundEnabled: false }),
      cloudProfile({ coins: 99999 }),
    );

    expect(merged.board3d).toBe(true);
    expect(merged.reducedMotion).toBe(true);
    expect(merged.soundEnabled).toBe(false);
  });
});

describe('syncOnSignIn', () => {
  it("gives a brand-new account this device's name; the wallet is seeded by the server", async () => {
    const repository = new InMemoryUserProgressRepository();
    const local = localProfile({ name: 'Priya', coins: 1750, games: 5, wins: 4 });

    const merged = await syncOnSignIn(repository, 'uid-1', local);

    expect(merged.name).toBe('Priya');
    await expect(repository.getProfile('uid-1')).resolves.toMatchObject({
      displayName: 'Priya',
      coins: 1000,
    });
  });

  it('adopts the account name and statistics without touching the device coins', async () => {
    const repository = new InMemoryUserProgressRepository();
    repository.seed(cloudProfile({ coins: 5000, gamesPlayed: 30, gamesWon: 20, bestStreak: 9 }));

    const merged = await syncOnSignIn(repository, 'uid-1', localProfile({ coins: 10 }));

    expect(merged.coins).toBe(10);
    expect(merged.name).toBe('Cloud Name');
    expect(merged.bestStreak).toBe(9);
    // Nothing was written back: the account already carried a name.
    await expect(repository.getProfile('uid-1')).resolves.toMatchObject({ coins: 5000 });
  });
});

describe('pushDisplayName', () => {
  it("uploads only the name; coins and streaks are the server's to change", async () => {
    const repository = new InMemoryUserProgressRepository();
    repository.seed(cloudProfile({ coins: 800, streak: 2, bestStreak: 2 }));

    await pushDisplayName(
      repository,
      'uid-1',
      localProfile({ name: 'Renamed', coins: 3200, streak: 6, bestStreak: 6 }),
    );

    await expect(repository.getProfile('uid-1')).resolves.toMatchObject({
      displayName: 'Renamed',
      coins: 800,
      streak: 2,
      bestStreak: 2,
    });
  });
});
