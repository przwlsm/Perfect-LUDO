import { InMemoryKeyValueStore } from '@/domain/testing/InMemoryKeyValueStore';
import { InMemoryUserProgressRepository } from '@/domain/testing/InMemoryUserProgressRepository';
import { InMemoryWalletRepository } from '@/domain/testing/InMemoryWalletRepository';
import { INITIAL_PROFILE, ProfileService } from '../store/ProfileService';
import { AccountProfiles, CLOUD_WAIT_MS } from './AccountProfiles';

function setup() {
  const storage = new InMemoryKeyValueStore();
  const profiles = new ProfileService(storage);
  const cloud = new InMemoryUserProgressRepository();
  return { storage, profiles, cloud, accounts: new AccountProfiles(storage, profiles, cloud) };
}

describe('shared-device account profiles', () => {
  it('restores guest progress on logout and the account collection on the next login', async () => {
    const { accounts, profiles } = setup();
    await profiles.update({ name: 'Guest name' });
    await accounts.activate('account-a');
    await profiles.replace({ ...INITIAL_PROFILE, name: 'Account A', coins: 30000 });
    await profiles.purchase('heritage-pack');
    const guest = await accounts.activate(null);
    expect(guest.profile.name).toBe('Guest name');
    expect(guest.profile.owned).not.toContain('heritage-pack');
    const restored = await accounts.activate('account-a');
    expect(restored.profile.owned).toContain('heritage-pack');
  });
  it('never seeds account B from account A when switching directly', async () => {
    const { accounts, profiles, cloud } = setup();
    await accounts.activate('account-a');
    await profiles.replace({
      ...INITIAL_PROFILE,
      coins: 4500,
      name: 'Private A',
      games: 8,
      wins: 4,
      bestStreak: 2,
    });
    await profiles.purchase('heritage-pack');
    const second = await accounts.activate('account-b');
    expect(second.profile).toMatchObject({ name: 'Player', coins: 1000, games: 0 });
    expect(second.profile.owned).not.toContain('heritage-pack');
    expect((await cloud.getProfile('account-b'))?.coins).toBe(1000);
  });
  it('keeps an offline account usable when cloud sync fails', async () => {
    const { accounts, cloud } = setup();
    jest.spyOn(cloud, 'getProfile').mockRejectedValueOnce(new Error('Offline'));
    const result = await accounts.activate('account-a');
    expect(result.profile).toEqual(INITIAL_PROFILE);
    expect(result.warning).toContain('Cloud sync is unavailable');
  });
  it('serializes quick account changes and restores the final account', async () => {
    const { accounts, storage } = setup();
    await Promise.all([accounts.activate('a'), accounts.activate(null), accounts.activate('b')]);
    expect(await storage.getItem('ludo.profile-owner.v1')).toBe('b');
  });
  it('does not reset a guest profile on restart', async () => {
    const { accounts, profiles } = setup();
    await accounts.activate(null);
    await profiles.update({ name: 'Offline player' });
    expect((await accounts.activate(null)).profile.name).toBe('Offline player');
  });
});

describe('account wallet on sign-in', () => {
  function setupWithWallet() {
    const storage = new InMemoryKeyValueStore();
    const profiles = new ProfileService(storage);
    const cloud = new InMemoryUserProgressRepository();
    const wallet = new InMemoryWalletRepository();
    return {
      storage,
      profiles,
      cloud,
      wallet,
      accounts: new AccountProfiles(storage, profiles, cloud, wallet),
    };
  }
  it('replaces device coins with the account wallet for a member', async () => {
    const { accounts, profiles, wallet } = setupWithWallet();
    await profiles.replace({ ...INITIAL_PROFILE, coins: 7777 });
    wallet.session = { uid: 'account-a', guest: false };
    wallet.seed('account-a', { coins: 300, owned: ['gold'] });
    const result = await accounts.activate('account-a');
    expect(result.wallet).toBe('ready');
    expect(result.profile.coins).toBe(300);
    expect(result.profile.owned).toContain('gold');
  });
  it('leaves a guest on device coins with no account wallet', async () => {
    const { accounts, wallet } = setupWithWallet();
    wallet.session = { uid: 'ghost', guest: true };
    const result = await accounts.activate('ghost', true);
    expect(result.wallet).toBe('none');
    expect(wallet.calls).toEqual([]);
  });
  it('does not wait forever on a server that never answers', async () => {
    jest.useFakeTimers();
    try {
      const { accounts, wallet } = setupWithWallet();
      wallet.session = { uid: 'account-a', guest: false };
      jest.spyOn(wallet, 'getWallet').mockReturnValue(new Promise(() => undefined));
      const activating = accounts.activate('account-a');
      await jest.advanceTimersByTimeAsync(CLOUD_WAIT_MS + 10);
      const result = await activating;
      expect(result.wallet).toBe('stale');
    } finally {
      jest.useRealTimers();
    }
  });
  it('keeps the last mirror and flags it stale when the account is unreachable', async () => {
    const { accounts, wallet } = setupWithWallet();
    wallet.session = { uid: 'account-a', guest: false };
    wallet.seed('account-a', { coins: 300 });
    await accounts.activate('account-a');
    await accounts.activate(null);
    wallet.offline = true;
    const result = await accounts.activate('account-a');
    expect(result.wallet).toBe('stale');
    expect(result.profile.coins).toBe(300);
    expect(result.warning).toContain('coins could not be loaded');
  });
  it('loads the wallet when a guest upgrades to an account under the same uid', async () => {
    const { accounts, wallet } = setupWithWallet();
    wallet.session = { uid: 'same-uid', guest: true };
    expect((await accounts.activate('same-uid', true)).wallet).toBe('none');
    wallet.session = { uid: 'same-uid', guest: false };
    const upgraded = await accounts.activate('same-uid', false);
    expect(upgraded.wallet).toBe('ready');
    expect(upgraded.profile.coins).toBe(1000);
  });
});
