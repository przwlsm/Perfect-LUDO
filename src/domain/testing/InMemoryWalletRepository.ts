import { COSMETICS, cosmeticCurrency, getCosmetic, isCosmeticExpired } from '../cosmetics/catalog';
import {
  BOT_PAID_GAMES_PER_DAY,
  GIFT_CYCLE_COINS,
  GIFT_STREAK_GEMS,
  levelInfo,
  RESCUE_COINS,
  RESCUE_THRESHOLD,
  REWARDS,
  WalletRefusedError,
  WalletUnavailableError,
  type WalletSnapshot,
} from '../entities/Wallet';
import type { MatchStats } from '../entities/Progression';
import type { IWalletRepository } from '../ports/IWalletRepository';

interface Account {
  coins: number;
  gems: number;
  xp: number;
  owned: string[];
  lastGift: string | null;
  giftStreak: number;
  lastRescue: string | null;
  piggyCoins: number;
  clubUntil: string | null;
  games: number;
  wins: number;
  streak: number;
  bestStreak: number;
  rewarded: Set<string>;
  paidBotGamesToday: number;
  vaultClaimed: boolean;
}

const fresh = (): Account => ({
  coins: 1000,
  gems: 20,
  xp: 0,
  owned: [],
  lastGift: null,
  giftStreak: 0,
  lastRescue: null,
  piggyCoins: 0,
  clubUntil: null,
  games: 0,
  wins: 0,
  streak: 0,
  bestStreak: 0,
  rewarded: new Set(),
  paidBotGamesToday: 0,
  vaultClaimed: false,
});

/**
 * In-memory IWalletRepository that behaves like migrations 0007 and 0012:
 * per-account state, idempotent purchases and rewards, server-side price and
 * balance checks, capped bot rewards, server-decided online results, XP with
 * level-up payouts, guests refused. `offline` makes every call fail as
 * unreachable so tests can walk the retry paths.
 */
export class InMemoryWalletRepository implements IWalletRepository {
  private readonly accounts = new Map<string, Account>();
  /** Who is signed in; `null` means no session and `guest` means anonymous. */
  session: { uid: string; guest: boolean } | null = null;
  offline = false;
  /** Lets a test pretend a day has passed. */
  today = '2026-09-25';
  calls: string[] = [];
  /** The server's record of online matches: who won, per match id and uid. */
  readonly onlineResults = new Map<
    string,
    { winner: string | null; players: string[]; leaver?: string }
  >();
  /** Last stats reported, for assertions. */
  lastStats: MatchStats | null = null;

  private account(): Account {
    this.calls.push(this.offline ? 'offline' : 'call');
    if (this.offline) throw new WalletUnavailableError('Could not reach the server.');
    if (!this.session) throw new WalletUnavailableError('Please sign in again to continue.');
    if (this.session.guest) throw new WalletRefusedError('Create an account to use this feature.');
    let account = this.accounts.get(this.session.uid);
    if (!account) {
      account = fresh();
      this.accounts.set(this.session.uid, account);
    }
    return account;
  }

  private snapshot(account: Account): WalletSnapshot {
    return {
      coins: account.coins,
      owned: [...account.owned],
      lastGift: account.lastGift,
      giftStreak: account.giftStreak,
      lastRescue: account.lastRescue,
      piggyCoins: account.piggyCoins,
      clubUntil: account.clubUntil,
      games: account.games,
      wins: account.wins,
      streak: account.streak,
      bestStreak: account.bestStreak,
      gems: account.gems,
      xp: account.xp,
      level: levelInfo(account.xp),
      lastSpin: null,
      spinStreak: 0,
    };
  }

  /** Same level-up payouts as the server's grant_xp, plus the piggy fill. */
  private grantXp(account: Account, amount: number) {
    const before = levelInfo(account.xp).level;
    account.xp += amount;
    account.piggyCoins = Math.min(account.piggyCoins + amount, 15000);
    const after = levelInfo(account.xp).level;
    for (let level = before + 1; level <= after; level++) {
      account.coins += 100 + 20 * level;
      account.gems += 5 + (level % 5 === 0 ? 20 : 0);
    }
  }

  private record(account: Account, won: boolean) {
    account.games += 1;
    if (won) account.wins += 1;
    account.streak = won ? account.streak + 1 : 0;
    account.bestStreak = Math.max(account.bestStreak, account.streak);
  }

  /** Test setup: what an account holds on the server before the app looks. */
  seed(uid: string, state: Partial<Omit<Account, 'rewarded'>>): void {
    const current = this.accounts.get(uid) ?? fresh();
    this.accounts.set(uid, { ...current, ...state, owned: [...(state.owned ?? current.owned)] });
  }

  async getWallet(): Promise<WalletSnapshot> {
    return this.snapshot(this.account());
  }

  async purchase(itemId: string, expectedPrice: number): Promise<WalletSnapshot> {
    const account = this.account();
    if (!COSMETICS.some((c) => c.id === itemId))
      throw new WalletRefusedError('This item is not in the store.');
    if (account.owned.includes(itemId)) return this.snapshot(account);
    const item = getCosmetic(itemId);
    if (isCosmeticExpired(item, new Date(this.today)))
      throw new WalletRefusedError('That look was part of a past event and is no longer for sale.');
    if (item.price !== expectedPrice)
      throw new WalletRefusedError('The price of this item has changed. Please reopen the store.');
    const gems = cosmeticCurrency(item) === 'gems';
    if ((gems ? account.gems : account.coins) < item.price)
      throw new WalletRefusedError(
        gems
          ? 'Not enough gems. Missions, the season pass and rewarded ads earn them.'
          : 'Not enough coins. Finish matches or claim your daily gift.',
      );
    if (gems) account.gems -= item.price;
    else account.coins -= item.price;
    for (const id of [itemId, item.contents?.board, item.contents?.dice])
      if (id && !account.owned.includes(id)) account.owned.push(id);
    return this.snapshot(account);
  }

  /** Same 7-day calendar as the server's claim_daily_gift. */
  async claimGift(): Promise<WalletSnapshot> {
    const account = this.account();
    if (account.lastGift !== null && account.lastGift >= this.today)
      throw new WalletRefusedError('Today’s gift is claimed. Come back tomorrow!');
    const yesterday = new Date(new Date(`${this.today}T00:00:00Z`).getTime() - 86400000)
      .toISOString()
      .slice(0, 10);
    account.giftStreak = account.lastGift === yesterday ? account.giftStreak + 1 : 1;
    const day = ((account.giftStreak - 1) % 7) + 1;
    account.coins += GIFT_CYCLE_COINS[day - 1]!;
    if (day === 7) account.gems += GIFT_STREAK_GEMS;
    account.lastGift = this.today;
    return this.snapshot(account);
  }

  /** Friendships for gift tests, as "giver|receiver". */
  readonly friendPairs = new Set<string>();

  /** Same rules as the server's gift_item. */
  async gift(toUserId: string, itemId: string, expectedPrice: number): Promise<WalletSnapshot> {
    const account = this.account();
    const uid = this.session!.uid;
    if (!this.friendPairs.has(`${uid}|${toUserId}`))
      throw new WalletRefusedError('Gifts go to friends. Add them first!');
    const target = this.accounts.get(toUserId);
    if (!target) throw new WalletRefusedError('That player is no longer around.');
    const item = getCosmetic(itemId);
    if (item.price === 0) throw new WalletRefusedError('Free looks are already everyone’s.');
    if (target.owned.includes(itemId))
      throw new WalletRefusedError('Your friend already owns that one. Pick another!');
    if (isCosmeticExpired(item, new Date(this.today)))
      throw new WalletRefusedError('That look was part of a past event and is no longer for sale.');
    if (item.price !== expectedPrice)
      throw new WalletRefusedError('The price of this item has changed. Please reopen the store.');
    const gems = cosmeticCurrency(item) === 'gems';
    if ((gems ? account.gems : account.coins) < item.price)
      throw new WalletRefusedError(gems ? 'Not enough gems.' : 'Not enough coins.');
    if (gems) account.gems -= item.price;
    else account.coins -= item.price;
    for (const id of [itemId, item.contents?.board, item.contents?.dice])
      if (id && !target.owned.includes(id)) target.owned.push(id);
    return this.snapshot(account);
  }

  /** Same rules as the server's claim_vault: capped, once per account. */
  async claimVault(coins: number): Promise<WalletSnapshot> {
    const account = this.account();
    if (!account.vaultClaimed) {
      account.vaultClaimed = true;
      account.coins += Math.min(Math.max(coins, 0), 5000);
    }
    return this.snapshot(account);
  }

  /** Same rules as the server's claim_rescue. */
  async claimRescue(): Promise<WalletSnapshot> {
    const account = this.account();
    if (account.coins >= RESCUE_THRESHOLD)
      throw new WalletRefusedError('The rescue is for when you are nearly out of coins.');
    if (account.lastRescue !== null && account.lastRescue >= this.today)
      throw new WalletRefusedError('Today’s rescue is used. Win a free game to rebuild!');
    account.coins += RESCUE_COINS;
    account.lastRescue = this.today;
    return this.snapshot(account);
  }

  async awardMatch(
    matchId: string,
    won: boolean,
    rewardEligible: boolean,
    stats?: MatchStats,
  ): Promise<WalletSnapshot> {
    const account = this.account();
    if (!matchId || matchId.length > 64 || matchId.startsWith('online:'))
      throw new WalletRefusedError('Invalid match id.');
    if (account.rewarded.has(matchId)) return this.snapshot(account);
    account.rewarded.add(matchId);
    this.lastStats = stats ?? null;
    this.record(account, won);
    // Only wins pay (and count against the daily cap of paid games).
    if (rewardEligible && won && account.paidBotGamesToday < BOT_PAID_GAMES_PER_DAY) {
      account.coins += REWARDS.bot.win.coins;
      account.paidBotGamesToday += 1;
    }
    this.grantXp(account, rewardEligible ? (won ? REWARDS.bot.win.xp : REWARDS.bot.played.xp) : 10);
    return this.snapshot(account);
  }

  async awardOnlineMatch(matchId: string, stats?: MatchStats): Promise<WalletSnapshot> {
    const account = this.account();
    const result = this.onlineResults.get(matchId);
    const uid = this.session!.uid;
    if (!result || !result.players.includes(uid))
      throw new WalletRefusedError('You are not in that match.');
    const key = `online:${matchId}`;
    if (account.rewarded.has(key)) return this.snapshot(account);
    account.rewarded.add(key);
    this.lastStats = stats ?? null;
    if (result.leaver === uid) return this.snapshot(account);
    const won = result.winner === uid;
    this.record(account, won);
    account.coins += won ? REWARDS.online.win.coins : REWARDS.online.played.coins;
    this.grantXp(account, won ? REWARDS.online.win.xp : REWARDS.online.played.xp);
    return this.snapshot(account);
  }
}
