import {
  DAILY_GIFT_COINS,
  FREE_ITEMS,
  GUEST_VAULT_AD_COINS,
  GUEST_VAULT_ADS_PER_DAY,
  GUEST_VAULT_CAP,
  GUEST_VAULT_PLAYED,
  GUEST_VAULT_WIN,
  PLAYED_COINS,
  TRIAL_HOURS,
  WIN_COINS,
  type IKeyValueStore,
  type WalletSnapshot,
} from '@/domain';
import {
  COSMETICS,
  cosmeticCurrency,
  DEFAULT_TABLE_STYLE,
  getCosmetic,
  isCosmeticExpired,
} from '@/domain/cosmetics/catalog';

/** A finished match whose reward could not reach the account yet. */
export interface PendingReward {
  readonly matchId: string;
  readonly won: boolean;
  readonly rewardEligible: boolean;
}

export interface Profile {
  readonly version: 1;
  readonly name: string;
  readonly coins: number;
  readonly owned: readonly string[];
  readonly board: string;
  readonly dice: string;
  readonly pack: string | null;
  /** How the 5-6 player round table draws its homes (a `style` cosmetic). */
  readonly style: string;
  readonly board3d: boolean;
  readonly reducedMotion: boolean;
  readonly soundEnabled: boolean;
  readonly games: number;
  readonly wins: number;
  /** Consecutive wins right now; any loss resets it to zero. */
  readonly streak: number;
  /** High-water mark of `streak`, never decreases. */
  readonly bestStreak: number;
  readonly rewardedMatches: readonly string[];
  readonly lastGift: string | null;
  /** Account mirrors of the streak calendar and the comeback rescue. */
  readonly giftStreak: number;
  readonly lastRescue: string | null;
  /** Account mirrors of the piggy bank and Ludo Club (0 / null for guests). */
  readonly piggyCoins: number;
  readonly clubUntil: string | null;
  /** The guest vault: earnings waiting to be claimed onto an account. */
  readonly vaultCoins: number;
  /** UTC day and count of the guest's watch-an-ad vault bonuses. */
  readonly vaultAdDay: string | null;
  readonly vaultAdsToday: number;
  /** A board a guest is trying after an ad, until the ISO instant. */
  readonly trialBoard: string | null;
  readonly trialUntil: string | null;
  /**
   * Results recorded while the account wallet was unreachable. Replayed in
   * order the next time it answers; the server pays each match id once, so a
   * replay after a crash or a second device can never pay twice.
   */
  readonly pendingRewards: readonly PendingReward[];
  /** Account mirrors (0 for guests): gems, total XP, and the lucky spin. */
  readonly gems: number;
  readonly xp: number;
  readonly lastSpin: string | null;
  readonly spinStreak: number;
}
export const INITIAL_PROFILE: Profile = {
  version: 1,
  name: 'Player',
  coins: 1000,
  owned: [...FREE_ITEMS],
  board: 'classic',
  dice: 'ivory',
  pack: null,
  style: DEFAULT_TABLE_STYLE,
  board3d: false,
  reducedMotion: false,
  soundEnabled: true,
  games: 0,
  wins: 0,
  streak: 0,
  bestStreak: 0,
  rewardedMatches: [],
  lastGift: null,
  giftStreak: 0,
  lastRescue: null,
  piggyCoins: 0,
  clubUntil: null,
  vaultCoins: 0,
  vaultAdDay: null,
  vaultAdsToday: 0,
  trialBoard: null,
  trialUntil: null,
  pendingRewards: [],
  gems: 0,
  xp: 0,
  lastSpin: null,
  spinStreak: 0,
};
export const PROFILE_KEY = 'ludo.profile.v1';

function validPending(value: unknown): value is PendingReward[] {
  return (
    Array.isArray(value) &&
    value.every(
      (r: Partial<PendingReward> | null) =>
        r !== null &&
        typeof r === 'object' &&
        typeof r.matchId === 'string' &&
        r.matchId.length > 0 &&
        typeof r.won === 'boolean' &&
        typeof r.rewardEligible === 'boolean',
    )
  );
}

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
    (p.pack != null &&
      (!p.owned.includes(p.pack) ||
        getCosmetic(p.pack).kind !== 'pack' ||
        !p.owned.includes(getCosmetic(p.pack).contents!.board) ||
        !p.owned.includes(getCosmetic(p.pack).contents!.dice))) ||
    typeof p.board3d !== 'boolean' ||
    typeof p.reducedMotion !== 'boolean' ||
    (p.soundEnabled !== undefined && typeof p.soundEnabled !== 'boolean') ||
    !Number.isSafeInteger(p.games) ||
    p.games < 0 ||
    !Number.isSafeInteger(p.wins) ||
    p.wins < 0 ||
    p.wins > p.games ||
    // Older saves predate streaks, so absent is valid; present must be sane.
    (p.streak !== undefined &&
      (!Number.isSafeInteger(p.streak) || p.streak < 0 || p.streak > p.wins)) ||
    (p.bestStreak !== undefined &&
      (!Number.isSafeInteger(p.bestStreak) ||
        p.bestStreak < 0 ||
        p.bestStreak > p.wins ||
        p.bestStreak < (p.streak ?? 0))) ||
    !Array.isArray(p.rewardedMatches) ||
    !p.rewardedMatches.every((id) => typeof id === 'string') ||
    (p.lastGift !== null && typeof p.lastGift !== 'string') ||
    (p.pendingRewards !== undefined && !validPending(p.pendingRewards)) ||
    // Older saves predate table styles; present must be a style this profile owns.
    (p.style !== undefined &&
      p.style !== DEFAULT_TABLE_STYLE &&
      (!p.owned.includes(p.style) || getCosmetic(p.style).kind !== 'style'))
  ) {
    throw new Error('Saved profile could not be read. Please retry loading.');
  }
  return {
    ...p,
    soundEnabled: p.soundEnabled ?? true,
    pack: p.pack ?? null,
    streak: p.streak ?? 0,
    bestStreak: p.bestStreak ?? 0,
    pendingRewards: p.pendingRewards ?? [],
    style: p.style ?? DEFAULT_TABLE_STYLE,
    gems: Number.isSafeInteger(p.gems) && p.gems >= 0 ? p.gems : 0,
    xp: Number.isSafeInteger(p.xp) && p.xp >= 0 ? p.xp : 0,
    giftStreak: Number.isSafeInteger(p.giftStreak) && p.giftStreak >= 0 ? p.giftStreak : 0,
    lastRescue: typeof p.lastRescue === 'string' ? p.lastRescue : null,
    piggyCoins: Number.isSafeInteger(p.piggyCoins) && p.piggyCoins >= 0 ? p.piggyCoins : 0,
    clubUntil: typeof p.clubUntil === 'string' ? p.clubUntil : null,
    vaultCoins:
      Number.isSafeInteger(p.vaultCoins) && p.vaultCoins >= 0
        ? Math.min(p.vaultCoins, GUEST_VAULT_CAP)
        : 0,
    vaultAdDay: typeof p.vaultAdDay === 'string' ? p.vaultAdDay : null,
    vaultAdsToday:
      Number.isSafeInteger(p.vaultAdsToday) && p.vaultAdsToday >= 0 ? p.vaultAdsToday : 0,
    trialBoard: typeof p.trialBoard === 'string' ? p.trialBoard : null,
    trialUntil: typeof p.trialUntil === 'string' ? p.trialUntil : null,
    lastSpin: typeof p.lastSpin === 'string' ? p.lastSpin : null,
    spinStreak: Number.isSafeInteger(p.spinStreak) && p.spinStreak >= 0 ? p.spinStreak : 0,
    // Free items are everyone's; saves from before one existed just lack it.
    owned: [...new Set([...p.owned, ...FREE_ITEMS])],
  };
}

/**
 * Projects the account wallet onto the device profile. The server's coins,
 * inventory, gift day and statistics replace the local copies; equipment
 * stays as chosen unless the account does not own it (a new device, or an
 * item removed from the catalog), in which case it falls back to the free
 * look rather than leaving the profile unreadable. Results still waiting to
 * reach the account keep counting locally so a stat never appears to go
 * backwards while offline.
 */
export function applyWalletSnapshot(local: Profile, wallet: WalletSnapshot): Profile {
  const known = new Set(COSMETICS.map((c) => c.id));
  const owned = new Set<string>(FREE_ITEMS);
  for (const id of wallet.owned) {
    if (!known.has(id)) continue;
    owned.add(id);
    const contents = getCosmetic(id).contents;
    if (contents) {
      owned.add(contents.board);
      owned.add(contents.dice);
    }
  }
  const board = owned.has(local.board) ? local.board : 'classic';
  const style = owned.has(local.style) ? local.style : DEFAULT_TABLE_STYLE;
  const dice = owned.has(local.dice) ? local.dice : 'ivory';
  const packContents = local.pack ? getCosmetic(local.pack).contents : undefined;
  const pack =
    local.pack && owned.has(local.pack) && packContents && board === packContents.board
      ? local.pack
      : null;
  const pending = local.pendingRewards;
  const pendingWins = pending.filter((r) => r.won).length;
  return {
    ...local,
    coins: wallet.coins,
    owned: [...owned],
    board,
    dice,
    pack,
    style,
    lastGift: wallet.lastGift,
    giftStreak: wallet.giftStreak,
    lastRescue: wallet.lastRescue,
    piggyCoins: wallet.piggyCoins,
    clubUntil: wallet.clubUntil,
    gems: wallet.gems,
    xp: wallet.xp,
    lastSpin: wallet.lastSpin,
    spinStreak: wallet.spinStreak,
    games: wallet.games + pending.length,
    wins: wallet.wins + pendingWins,
    streak: wallet.streak,
    bestStreak: Math.max(wallet.bestStreak, wallet.streak),
  };
}

/** Serializes purchases, equipment changes and rewards into one persisted snapshot.
 * For signed-in members the wallet parts of this snapshot mirror the account
 * (see `applyWalletSnapshot`); for guests they are device-local play money
 * that is never spendable in the store.
 */
export interface IProfileService {
  load(): Promise<Profile>;
  purchase(id: string): Promise<Profile>;
  equip(id: string): Promise<Profile>;
  update(
    settings: Partial<Pick<Profile, 'name' | 'board3d' | 'reducedMotion' | 'soundEnabled'>>,
  ): Promise<Profile>;
  claimGift(now?: Date): Promise<Profile>;
  recordMatch(id: string, won: boolean, rewardEligible: boolean): Promise<Profile>;
  /** A guest's watch-an-ad vault bonus, capped per day. */
  claimVaultAd(now?: Date): Promise<Profile>;
  /** Zeroes the vault after the account claimed it. */
  clearVault(): Promise<Profile>;
  /** Credits a guest's vault once per match id. */
  creditVaultOnce(id: string, coins: number): Promise<Profile>;
  /** A guest tries a paid board for a day after a rewarded ad. */
  startTrial(boardId: string, now?: Date): Promise<Profile>;
  /** Adopts the account wallet the server just returned. */
  mirrorWallet(wallet: WalletSnapshot): Promise<Profile>;
  /** Counts a finished match locally and remembers to tell the account later. */
  queueReward(id: string, won: boolean, rewardEligible: boolean): Promise<Profile>;
  /** Forgets a queued result once the account has recorded it (or refused it for good). */
  settleReward(id: string): Promise<Profile>;
  /**
   * Overwrites the stored profile wholesale. Only cloud sign-in sync should
   * use this — everything else must go through the intent-specific methods
   * above so their rules (prices, once-per-match rewards) still apply.
   */
  replace(profile: Profile): Promise<Profile>;
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
      if (isCosmeticExpired(item))
        throw new Error('That look was part of a past event and is no longer for sale.');
      const gems = cosmeticCurrency(item) === 'gems';
      if (gems && p.gems < item.price)
        throw new Error('Not enough gems. Missions, the season pass and rewarded ads earn them.');
      if (!gems && p.coins < item.price)
        throw new Error('Not enough coins. Finish matches or claim your daily gift.');
      const contents = item.contents;
      const unlocked = {
        ...p,
        coins: gems ? p.coins : p.coins - item.price,
        gems: gems ? p.gems - item.price : p.gems,
        owned: [...new Set([...p.owned, id, ...(contents ? [contents.board, contents.dice] : [])])],
      };
      return contents ? { ...unlocked, ...contents, pack: id } : { ...unlocked, [item.kind]: id };
    });
  }
  equip(id: string): Promise<Profile> {
    return this.transact((p) => {
      const item = getCosmetic(id);
      if (!p.owned.includes(id)) throw new Error('Unlock this item before equipping it.');
      return item.contents ? { ...p, ...item.contents, pack: id } : { ...p, [item.kind]: id };
    });
  }
  update(
    settings: Partial<Pick<Profile, 'name' | 'board3d' | 'reducedMotion' | 'soundEnabled'>>,
  ): Promise<Profile> {
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
      return { ...p, coins: p.coins + DAILY_GIFT_COINS, lastGift: today };
    });
  }
  replace(profile: Profile): Promise<Profile> {
    // Round-tripped through the parser so a bad merge can never persist a
    // profile the app would later refuse to load.
    return this.transact(() => parseProfile(JSON.stringify(profile)));
  }
  recordMatch(id: string, won: boolean, rewardEligible: boolean): Promise<Profile> {
    return this.transact((p) => {
      if (p.rewardedMatches.includes(id)) return p;
      const streak = won ? p.streak + 1 : 0;
      return {
        ...p,
        games: p.games + 1,
        wins: p.wins + (won ? 1 : 0),
        streak,
        bestStreak: Math.max(p.bestStreak, streak),
        coins: p.coins + (rewardEligible ? (won ? WIN_COINS : PLAYED_COINS) : 0),
        // Guests earn into the vault; an account claims it later.
        vaultCoins: Math.min(
          p.vaultCoins + (won ? GUEST_VAULT_WIN : GUEST_VAULT_PLAYED),
          GUEST_VAULT_CAP,
        ),
        rewardedMatches: [...p.rewardedMatches, id],
      };
    });
  }

  /** A guest's watch-an-ad vault bonus, capped per UTC day. */
  claimVaultAd(now = new Date()): Promise<Profile> {
    return this.transact((p) => {
      const today = now.toISOString().slice(0, 10);
      const usedToday = p.vaultAdDay === today ? p.vaultAdsToday : 0;
      if (usedToday >= GUEST_VAULT_ADS_PER_DAY)
        throw new Error('That is all the bonus ads for today. Come back tomorrow!');
      return {
        ...p,
        vaultCoins: Math.min(p.vaultCoins + GUEST_VAULT_AD_COINS, GUEST_VAULT_CAP),
        vaultAdDay: today,
        vaultAdsToday: usedToday + 1,
      };
    });
  }

  /** The vault was paid onto the account; it starts again from zero. */
  clearVault(): Promise<Profile> {
    return this.transact((p) => ({ ...p, vaultCoins: 0 }));
  }

  /** Credits a guest's vault once per match id (e.g. an online placement). */
  creditVaultOnce(id: string, coins: number): Promise<Profile> {
    return this.transact((p) => {
      if (coins <= 0 || p.rewardedMatches.includes(id)) return p;
      return {
        ...p,
        vaultCoins: Math.min(p.vaultCoins + coins, GUEST_VAULT_CAP),
        rewardedMatches: [...p.rewardedMatches, id],
      };
    });
  }

  /** A guest tries a paid board for a day after a rewarded ad. */
  startTrial(boardId: string, now = new Date()): Promise<Profile> {
    return this.transact((p) => {
      const item = getCosmetic(boardId);
      if (item.kind !== 'board' || item.price === 0)
        throw new Error('Only paid boards can be tried.');
      if (isCosmeticExpired(item, now))
        throw new Error('That look was part of a past event and is no longer for sale.');
      return {
        ...p,
        trialBoard: boardId,
        trialUntil: new Date(now.getTime() + TRIAL_HOURS * 3600000).toISOString(),
      };
    });
  }
  mirrorWallet(wallet: WalletSnapshot): Promise<Profile> {
    return this.transact((p) => parseProfile(JSON.stringify(applyWalletSnapshot(p, wallet))));
  }
  queueReward(id: string, won: boolean, rewardEligible: boolean): Promise<Profile> {
    return this.transact((p) => {
      if (p.rewardedMatches.includes(id)) return p;
      const streak = won ? p.streak + 1 : 0;
      return {
        ...p,
        games: p.games + 1,
        wins: p.wins + (won ? 1 : 0),
        streak,
        bestStreak: Math.max(p.bestStreak, streak),
        rewardedMatches: [...p.rewardedMatches, id],
        pendingRewards: [...p.pendingRewards, { matchId: id, won, rewardEligible }],
      };
    });
  }
  settleReward(id: string): Promise<Profile> {
    return this.transact((p) => ({
      ...p,
      pendingRewards: p.pendingRewards.filter((r) => r.matchId !== id),
    }));
  }
}
