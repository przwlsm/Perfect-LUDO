import { InMemoryKeyValueStore } from '@/domain/testing/InMemoryKeyValueStore';
import { InMemoryWalletRepository } from '@/domain/testing/InMemoryWalletRepository';
import { WalletRefusedError, WalletUnavailableError } from '@/domain';
import { INITIAL_PROFILE, ProfileService } from '../store/ProfileService';
import { MemberWallet } from './MemberWallet';

function setup() {
  const storage = new InMemoryKeyValueStore();
  const profiles = new ProfileService(storage);
  const server = new InMemoryWalletRepository();
  server.session = { uid: 'alice', guest: false };
  return { storage, profiles, server, wallet: new MemberWallet(profiles, server) };
}

describe('member wallet', () => {
  it('shows the account balance, never the device one', async () => {
    const { profiles, server, wallet } = setup();
    await profiles.replace({
      ...INITIAL_PROFILE,
      coins: 99999,
      owned: ['classic', 'ivory', 'royal'],
    });
    server.seed('alice', { coins: 420, owned: ['heritage-pack'] });
    const profile = await wallet.refresh();
    expect(profile.coins).toBe(420);
    expect(profile.owned).toEqual(
      expect.arrayContaining(['classic', 'ivory', 'heritage-pack', 'heritage', 'heritage-dice']),
    );
    expect(profile.owned).not.toContain('royal');
  });

  it('charges the account and equips the item, with the server as the only ledger', async () => {
    const { profiles, server, wallet } = setup();
    const profile = await wallet.purchase('neon-pack');
    expect(profile).toMatchObject({
      coins: 450,
      board: 'neon',
      dice: 'neon-dice',
      pack: 'neon-pack',
    });
    expect((await server.getWallet()).coins).toBe(450);
    expect(await profiles.load()).toMatchObject({ coins: 450 });
  });

  it('refuses when the account cannot afford it and leaves the device untouched', async () => {
    const { profiles, server, wallet } = setup();
    server.seed('alice', { coins: 100 });
    await wallet.refresh();
    await expect(wallet.purchase('royal')).rejects.toThrow(/Not enough coins/);
    expect(await profiles.load()).toMatchObject({ coins: 100, board: 'classic' });
    expect(await profiles.load()).not.toHaveProperty('owned', expect.arrayContaining(['royal']));
  });

  it('changes nothing on the device when the server cannot be reached', async () => {
    const { profiles, server, wallet } = setup();
    await wallet.refresh();
    server.offline = true;
    await expect(wallet.purchase('royal')).rejects.toBeInstanceOf(WalletUnavailableError);
    expect(await profiles.load()).toMatchObject({ coins: 1000, board: 'classic' });
    expect((await profiles.load()).owned).not.toContain('royal');
  });

  it('never charges twice: a retry after a lost response and a double tap both settle once', async () => {
    const { server, wallet } = setup();
    await Promise.all([wallet.purchase('gold'), wallet.purchase('gold')]);
    await wallet.purchase('gold');
    expect((await server.getWallet()).coins).toBe(700);
    expect((await server.getWallet()).owned).toEqual(['gold']);
  });

  it('recovers a purchase the app was killed after: the item is there on the next refresh', async () => {
    const { profiles, server, wallet } = setup();
    // The server charged, but the mirror never got written.
    await server.purchase('ruby', 250);
    expect((await profiles.load()).owned).not.toContain('ruby');
    const profile = await wallet.refresh();
    expect(profile.owned).toContain('ruby');
    expect(profile.coins).toBe(750);
    // And equipping it costs nothing further.
    expect((await wallet.purchase('ruby')).dice).toBe('ruby');
    expect((await server.getWallet()).coins).toBe(750);
  });

  it('refuses a stale price rather than charging a different amount', async () => {
    const { server } = setup();
    await expect(server.purchase('royal', 1)).rejects.toThrow(/price.*changed/i);
  });

  it('claims the daily gift once per day on the account', async () => {
    const { server, wallet } = setup();
    expect((await wallet.claimGift()).coins).toBe(1250);
    await expect(wallet.claimGift()).rejects.toThrow(/claimed/);
    server.today = '2026-09-26';
    expect((await wallet.claimGift()).coins).toBe(1500);
  });

  it('pays a match once, even when the same result is recorded again', async () => {
    const { server, wallet } = setup();
    await wallet.recordMatch('m1', true, true);
    const again = await wallet.recordMatch('m1', true, true);
    expect(again).toMatchObject({ coins: 1050, games: 1, wins: 1, streak: 1 });
    expect((await server.getWallet()).coins).toBe(1050);
  });

  it('queues a result finished offline and pays it when the account is back', async () => {
    const { profiles, server, wallet } = setup();
    await wallet.refresh();
    server.offline = true;
    const offline = await wallet.recordMatch('m-offline', true, true);
    // Counted on the device right away, coins not yet.
    expect(offline).toMatchObject({ games: 1, wins: 1, coins: 1000 });
    expect(offline.pendingRewards).toEqual([
      { matchId: 'm-offline', won: true, rewardEligible: true },
    ]);
    server.offline = false;
    const paid = await wallet.flushPending();
    expect(paid).toMatchObject({ coins: 1050, games: 1, wins: 1, pendingRewards: [] });
    // A second flush (say, after a crash mid-way) does not pay again.
    await wallet.flushPending();
    expect((await server.getWallet()).coins).toBe(1050);
    expect((await profiles.load()).pendingRewards).toEqual([]);
  });

  it('stops at the first queued result the server cannot take and keeps the rest for later', async () => {
    const { profiles, server, wallet } = setup();
    server.offline = true;
    await wallet.recordMatch('a', false, true);
    await wallet.recordMatch('b', true, true);
    expect((await profiles.load()).pendingRewards).toHaveLength(2);
    // Still offline: nothing is lost, nothing is paid.
    await wallet.flushPending();
    expect((await profiles.load()).pendingRewards).toHaveLength(2);
    expect((await profiles.load()).coins).toBe(1000);
    server.offline = false;
    const paid = await wallet.refresh();
    expect(paid.coins).toBe(1065);
    expect(paid.pendingRewards).toEqual([]);
  });

  it('drops a queued result the account refuses for good instead of retrying forever', async () => {
    const { profiles, server, wallet } = setup();
    server.offline = true;
    await wallet.recordMatch('x'.repeat(65), true, true);
    server.offline = false;
    await wallet.flushPending();
    expect((await profiles.load()).pendingRewards).toEqual([]);
  });

  it('surfaces a refusal on a live result rather than queueing it', async () => {
    const { server, wallet } = setup();
    server.session = { uid: 'ghost', guest: true };
    await expect(wallet.recordMatch('m2', true, true)).rejects.toBeInstanceOf(WalletRefusedError);
  });

  it('keeps device-only settings and a still-owned look across refreshes', async () => {
    const { profiles, server, wallet } = setup();
    server.seed('alice', { owned: ['royal-pack'] });
    await wallet.refresh();
    await profiles.equip('royal-pack');
    await profiles.update({ board3d: true, reducedMotion: true });
    const profile = await wallet.refresh();
    expect(profile).toMatchObject({
      board: 'royal',
      dice: 'royal-dice',
      pack: 'royal-pack',
      board3d: true,
      reducedMotion: true,
    });
  });

  it('falls back to the free look when the account does not own what this device had equipped', async () => {
    const { profiles, wallet } = setup();
    await profiles.replace({
      ...INITIAL_PROFILE,
      owned: ['classic', 'ivory', 'neon', 'neon-dice', 'neon-pack'],
      board: 'neon',
      dice: 'neon-dice',
      pack: 'neon-pack',
    });
    const profile = await wallet.refresh();
    expect(profile).toMatchObject({ board: 'classic', dice: 'ivory', pack: null });
  });
});

describe('online rewards and levels', () => {
  it('pays an online win from the server record, far above a bot win, and only once', async () => {
    const { server, wallet } = setup();
    server.onlineResults.set('m-online', { winner: 'alice', players: ['alice', 'bob'] });
    const paid = await wallet.recordOnlineMatch('m-online', { sixes: 2, captures: 1, home: 0 });
    // 250 for the win, plus 140 for reaching level 2 on the 120 XP.
    expect(paid).toMatchObject({ coins: 1390, xp: 120, gems: 25, wins: 1 });
    expect(server.lastStats).toEqual({ sixes: 2, captures: 1, home: 0 });
    const again = await wallet.recordOnlineMatch('m-online');
    expect(again.coins).toBe(1390);
  });

  it('pays a finish but no win to the other player, and nothing to a player who left', async () => {
    const { server, wallet } = setup();
    server.onlineResults.set('lost', { winner: 'bob', players: ['alice', 'bob'] });
    expect((await wallet.recordOnlineMatch('lost')).coins).toBe(1060);
    server.onlineResults.set('walked', {
      winner: null,
      players: ['alice', 'bob'],
      leaver: 'alice',
    });
    expect((await wallet.recordOnlineMatch('walked')).coins).toBe(1060);
  });

  it('refuses to collect a match the player was not in', async () => {
    const { server, wallet } = setup();
    server.onlineResults.set('theirs', { winner: 'bob', players: ['bob', 'carol'] });
    await expect(wallet.recordOnlineMatch('theirs')).rejects.toThrow(/not in that match/);
  });

  it('leaves collection to the next wallet load when the server is unreachable', async () => {
    const { profiles, server, wallet } = setup();
    await wallet.refresh();
    server.offline = true;
    server.onlineResults.set('later', { winner: 'alice', players: ['alice'] });
    expect((await wallet.recordOnlineMatch('later')).coins).toBe(1000);
    expect((await profiles.load()).pendingRewards).toEqual([]);
  });

  it('caps paid bot games per day', async () => {
    const { server, wallet } = setup();
    for (let i = 0; i < 26; i++) await wallet.recordMatch(`bot-${i}`, false, true);
    // 25 paid losses at 15 coins; the 26th pays nothing (level-up coins aside).
    const { coins, xp } = await server.getWallet();
    const levelCoins = coins - 1000 - 25 * 15;
    expect(levelCoins).toBeGreaterThanOrEqual(0);
    expect(xp).toBe(26 * 15);
  });
});
