import type { IKeyValueStore } from '@/domain';
import { COSMETICS, getCosmetic } from '@/domain/cosmetics/catalog';

export interface Profile {
  readonly version: 1;
  readonly name: string;
  readonly coins: number;
  readonly owned: readonly string[];
  readonly board: string;
  readonly dice: string;
  readonly board3d: boolean;
  readonly reducedMotion: boolean;
  readonly games: number;
  readonly wins: number;
  readonly rewardedMatches: readonly string[];
  readonly lastGift: string | null;
}
export const INITIAL_PROFILE: Profile = {
  version: 1,
  name: 'Player',
  coins: 1000,
  owned: ['classic', 'ivory'],
  board: 'classic',
  dice: 'ivory',
  board3d: false,
  reducedMotion: false,
  games: 0,
  wins: 0,
  rewardedMatches: [],
  lastGift: null,
};
export const PROFILE_KEY = 'ludo.profile.v1';

export function parseProfile(raw: string): Profile {
  const p = JSON.parse(raw) as Profile;
  if (
    p.version !== 1 ||
    typeof p.name !== 'string' ||
    p.name.length > 20 ||
    !Number.isSafeInteger(p.coins) ||
    p.coins < 0 ||
    !Array.isArray(p.owned) ||
    !p.owned.every((id) => COSMETICS.some((c) => c.id === id)) ||
    !p.owned.includes(p.board) ||
    getCosmetic(p.board).kind !== 'board' ||
    !p.owned.includes(p.dice) ||
    getCosmetic(p.dice).kind !== 'dice' ||
    typeof p.board3d !== 'boolean' ||
    typeof p.reducedMotion !== 'boolean' ||
    !Number.isSafeInteger(p.games) ||
    p.games < 0 ||
    !Number.isSafeInteger(p.wins) ||
    p.wins < 0 ||
    p.wins > p.games ||
    !Array.isArray(p.rewardedMatches) ||
    !p.rewardedMatches.every((id) => typeof id === 'string') ||
    (p.lastGift !== null && typeof p.lastGift !== 'string')
  ) {
    throw new Error('Saved profile could not be read. Please retry loading.');
  }
  return p;
}

/** Serializes purchases, equipment changes and rewards into one persisted snapshot.
 * A future server implementation can replace this service through IProfileService.
 * Local coins are entertainment currency, never a source of paid entitlements.
 */
export interface IProfileService {
  load(): Promise<Profile>;
  purchase(id: string): Promise<Profile>;
  equip(id: string): Promise<Profile>;
  update(settings: Partial<Pick<Profile, 'name' | 'board3d' | 'reducedMotion'>>): Promise<Profile>;
  claimGift(now?: Date): Promise<Profile>;
  recordMatch(id: string, won: boolean, rewardEligible: boolean): Promise<Profile>;
}
export class ProfileService implements IProfileService {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private readonly storage: IKeyValueStore) {}
  async load(): Promise<Profile> {
    await this.queue;
    return this.read();
  }
  private async read(): Promise<Profile> {
    const raw = await this.storage.getItem(PROFILE_KEY);
    return raw === null ? INITIAL_PROFILE : parseProfile(raw);
  }
  private transact(change: (p: Profile) => Profile): Promise<Profile> {
    const result = this.queue.then(async () => {
      const next = change(await this.read());
      await this.storage.setItem(PROFILE_KEY, JSON.stringify(next));
      return next;
    });
    this.queue = result.catch(() => undefined);
    return result;
  }
  purchase(id: string): Promise<Profile> {
    return this.transact((p) => {
      const item = getCosmetic(id);
      if (p.owned.includes(id)) return p;
      if (item.productId) throw new Error('This item requires a verified store purchase.');
      if (p.coins < item.price)
        throw new Error('Not enough coins. Finish matches or claim your daily gift.');
      return { ...p, coins: p.coins - item.price, owned: [...p.owned, id], [item.kind]: id };
    });
  }
  equip(id: string): Promise<Profile> {
    return this.transact((p) => {
      const item = getCosmetic(id);
      if (!p.owned.includes(id)) throw new Error('Unlock this item before equipping it.');
      return { ...p, [item.kind]: id };
    });
  }
  update(settings: Partial<Pick<Profile, 'name' | 'board3d' | 'reducedMotion'>>): Promise<Profile> {
    return this.transact((p) => ({
      ...p,
      ...settings,
      name: settings.name === undefined ? p.name : settings.name.trim().slice(0, 20) || 'Player',
    }));
  }
  claimGift(now = new Date()): Promise<Profile> {
    return this.transact((p) => {
      const today = now.toISOString().slice(0, 10);
      if (p.lastGift && p.lastGift >= today)
        throw new Error('Today’s gift is claimed. Come back tomorrow!');
      return { ...p, coins: p.coins + 250, lastGift: today };
    });
  }
  recordMatch(id: string, won: boolean, rewardEligible: boolean): Promise<Profile> {
    return this.transact((p) =>
      p.rewardedMatches.includes(id)
        ? p
        : {
            ...p,
            games: p.games + 1,
            wins: p.wins + (won ? 1 : 0),
            coins: p.coins + (rewardEligible ? (won ? 150 : 40) : 0),
            rewardedMatches: [...p.rewardedMatches, id],
          },
    );
  }
}
