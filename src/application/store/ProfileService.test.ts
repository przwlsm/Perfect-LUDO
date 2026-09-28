import { InMemoryKeyValueStore } from '@/domain/testing/InMemoryKeyValueStore';
import { INITIAL_PROFILE, PROFILE_KEY, ProfileService } from './ProfileService';

describe('local cosmetic economy', () => {
  let storage: InMemoryKeyValueStore;
  let service: ProfileService;
  beforeEach(() => {
    storage = new InMemoryKeyValueStore();
    service = new ProfileService(storage);
  });
  it('unlocks an entire wooden pack atomically and preserves the old collection', async () => {
    const p = await service.purchase('heritage-pack');
    expect(p).toMatchObject({
      coins: 650,
      board: 'heritage',
      dice: 'heritage-dice',
      pack: 'heritage-pack',
    });
    expect(p.owned).toEqual(
      expect.arrayContaining(['classic', 'ivory', 'heritage', 'heritage-dice', 'heritage-pack']),
    );
    await service.equip('classic');
    expect(await service.load()).toMatchObject({ board: 'classic', dice: 'heritage-dice' });
    await service.equip('heritage-pack');
    expect(await new ProfileService(storage).load()).toMatchObject({
      coins: 650,
      board: 'heritage',
      dice: 'heritage-dice',
      pack: 'heritage-pack',
    });
  });
  it('charges a pack only once under concurrent purchases and does not charge for its included dice', async () => {
    await Promise.all([service.purchase('neon-pack'), service.purchase('neon-pack')]);
    await service.purchase('neon-dice');
    expect(await service.load()).toMatchObject({
      coins: 450,
      board: 'neon',
      dice: 'neon-dice',
      pack: 'neon-pack',
    });
  });
  it('does not grant partial pack ownership when saving fails', async () => {
    jest.spyOn(storage, 'setItem').mockRejectedValueOnce(new Error('Disk full'));
    await expect(service.purchase('heritage-pack')).rejects.toThrow('Disk full');
    expect(await service.load()).toMatchObject({
      coins: 1000,
      owned: ['classic', 'ivory', 'triangle-homes'],
      pack: null,
    });
  });
  it('loads an older profile without resetting its equipped board', async () => {
    await storage.setItem(
      PROFILE_KEY,
      JSON.stringify({
        ...INITIAL_PROFILE,
        pack: undefined,
        board: 'royal',
        owned: ['classic', 'ivory', 'royal'],
      }),
    );
    expect(await service.load()).toMatchObject({ board: 'royal', pack: null });
  });
  it('migrates the sound preference without resetting existing purchases or coins', async () => {
    await storage.setItem(
      PROFILE_KEY,
      JSON.stringify({
        ...INITIAL_PROFILE,
        soundEnabled: undefined,
        coins: 321,
        owned: ['classic', 'ivory', 'royal'],
        board: 'royal',
      }),
    );
    expect(await service.load()).toMatchObject({ soundEnabled: true, coins: 321, board: 'royal' });
    await service.update({ soundEnabled: false });
    expect(await new ProfileService(storage).load()).toMatchObject({
      soundEnabled: false,
      coins: 321,
      board: 'royal',
    });
  });
  it('unlocks and equips a purchase and restores it after reload', async () => {
    const purchased = await service.purchase('royal');
    expect(purchased.coins).toBe(400);
    expect(purchased.board).toBe('royal');
    expect((await new ProfileService(storage).load()).owned).toContain('royal');
  });
  it('charges only once for simultaneous duplicate purchase requests', async () => {
    await Promise.all([service.purchase('royal'), service.purchase('royal')]);
    const p = await service.load();
    expect(p.coins).toBe(400);
    expect(p.owned.filter((id) => id === 'royal')).toHaveLength(1);
  });
  it('serializes competing purchases and prevents overspending', async () => {
    const outcomes = await Promise.allSettled([
      service.purchase('royal'),
      service.purchase('obsidian'),
    ]);
    expect(outcomes.map((r) => r.status)).toEqual(['fulfilled', 'rejected']);
    expect((await service.load()).coins).toBe(400);
    await expect(service.purchase('forest')).resolves.toMatchObject({ coins: 150 });
  });
  it('cannot equip an unowned item or buy an unknown item', async () => {
    await expect(service.equip('royal')).rejects.toThrow('Unlock');
    await expect(service.purchase('invalid')).rejects.toThrow('not in the store');
    expect((await service.load()).coins).toBe(1000);
  });
  it('records each match reward once, even on retries', async () => {
    await Promise.all([
      service.recordMatch('match-1', true, true),
      service.recordMatch('match-1', true, true),
    ]);
    expect(await service.load()).toMatchObject({ coins: 1050, wins: 1, games: 1 });
    await service.recordMatch('match-2', false, true);
    await service.recordMatch('match-3', true, false);
    expect(await service.load()).toMatchObject({ coins: 1065, wins: 2, games: 3 });
  });
  it('builds a win streak and resets it on a loss, keeping the best', async () => {
    await service.recordMatch('m1', true, true);
    await service.recordMatch('m2', true, true);
    await service.recordMatch('m3', true, true);
    expect(await service.load()).toMatchObject({ streak: 3, bestStreak: 3 });

    await service.recordMatch('m4', false, true);
    expect(await service.load()).toMatchObject({ streak: 0, bestStreak: 3 });

    await service.recordMatch('m5', true, true);
    expect(await service.load()).toMatchObject({ streak: 1, bestStreak: 3 });
  });
  it('reads a save written before streaks existed', async () => {
    const legacy = JSON.stringify({
      ...INITIAL_PROFILE,
      games: 4,
      wins: 2,
      streak: undefined,
      bestStreak: undefined,
    });
    await storage.setItem(PROFILE_KEY, legacy);
    expect(await service.load()).toMatchObject({ streak: 0, bestStreak: 0, wins: 2 });
  });
  it('limits daily claims and rejects clock rollback', async () => {
    await service.claimGift(new Date('2026-09-23T01:00:00Z'));
    await expect(service.claimGift(new Date('2026-09-23T23:59:00Z'))).rejects.toThrow('claimed');
    await expect(service.claimGift(new Date('2026-09-22T23:59:00Z'))).rejects.toThrow('claimed');
    expect((await service.claimGift(new Date('2026-09-24T00:00:00Z'))).coins).toBe(1500);
  });
  it('does not overwrite corrupt saved data with fresh coins', async () => {
    await storage.setItem(PROFILE_KEY, JSON.stringify({ ...INITIAL_PROFILE, coins: -50 }));
    await expect(service.load()).rejects.toThrow();
    await expect(service.purchase('royal')).rejects.toThrow();
    expect(JSON.parse((await storage.getItem(PROFILE_KEY))!).coins).toBe(-50);
  });
  it('leaves no entitlement after a failed write and supports retry', async () => {
    const write = jest.spyOn(storage, 'setItem').mockRejectedValueOnce(new Error('Disk full'));
    await expect(service.purchase('royal')).rejects.toThrow('Disk full');
    expect((await service.load()).owned).not.toContain('royal');
    await expect(service.purchase('royal')).resolves.toMatchObject({ coins: 400 });
    expect(write).toHaveBeenCalledTimes(2);
  });
});

describe('table styles', () => {
  it('gives everyone the triangle homes and lets a bought style be equipped and kept', async () => {
    const storage = new InMemoryKeyValueStore();
    const service = new ProfileService(storage);
    expect((await service.load()).style).toBe('triangle-homes');
    const bought = await service.purchase('round-homes');
    expect(bought).toMatchObject({ style: 'round-homes', coins: 800 });
    await service.equip('triangle-homes');
    expect((await new ProfileService(storage).load()).style).toBe('triangle-homes');
  });
  it('reads a save from before table styles existed', async () => {
    const storage = new InMemoryKeyValueStore();
    const { style: _unused, ...old } = INITIAL_PROFILE;
    await storage.setItem(PROFILE_KEY, JSON.stringify({ ...old, owned: ['classic', 'ivory'] }));
    const loaded = await new ProfileService(storage).load();
    expect(loaded.style).toBe('triangle-homes');
    expect(loaded.owned).toContain('triangle-homes');
  });
  it('refuses a save claiming a style it does not own', async () => {
    const storage = new InMemoryKeyValueStore();
    await storage.setItem(
      PROFILE_KEY,
      JSON.stringify({ ...INITIAL_PROFILE, style: 'round-homes' }),
    );
    await expect(new ProfileService(storage).load()).rejects.toThrow('could not be read');
  });
});
