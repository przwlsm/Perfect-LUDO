import { InMemoryKeyValueStore } from '@/domain/testing/InMemoryKeyValueStore';
import { INITIAL_PROFILE, PROFILE_KEY, ProfileService } from './ProfileService';

describe('local cosmetic economy', () => {
  let storage: InMemoryKeyValueStore;
  let service: ProfileService;
  beforeEach(() => {
    storage = new InMemoryKeyValueStore();
    service = new ProfileService(storage);
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
    expect(await service.load()).toMatchObject({ coins: 1150, wins: 1, games: 1 });
    await service.recordMatch('match-2', false, true);
    await service.recordMatch('match-3', true, false);
    expect(await service.load()).toMatchObject({ coins: 1190, wins: 2, games: 3 });
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
