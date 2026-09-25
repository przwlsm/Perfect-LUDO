import { COSMETICS, getCosmetic } from '../cosmetics/catalog';
import {
  DAILY_GIFT_COINS,
  PLAYED_COINS,
  WIN_COINS,
  WalletRefusedError,
  WalletUnavailableError,
  type WalletSnapshot,
} from '../entities/Wallet';
import type { IWalletRepository } from '../ports/IWalletRepository';

interface Account {
  coins: number;
  owned: string[];
  lastGift: string | null;
  games: number;
  wins: number;
  streak: number;
  bestStreak: number;
  rewarded: Set<string>;
}

/**
 * In-memory IWalletRepository that behaves like migration 0007: per-account
 * state, idempotent purchases and rewards, server-side price and balance
 * checks, guests refused. `offline` makes every call fail as unreachable so
 * tests can walk the retry paths.
 */
export class InMemoryWalletRepository implements IWalletRepository {
  private readonly accounts = new Map<string, Account>();
  /** Who is signed in; `null` means no session and `guest` means anonymous. */
  session: { uid: string; guest: boolean } | null = null;
  offline = false;
  /** Lets a test pretend a day has passed. */
  today = '2026-09-25';
  calls: string[] = [];

  private account(): Account {
    this.calls.push(this.offline ? 'offline' : 'call');
    if (this.offline) throw new WalletUnavailableError('Could not reach the server.');
    if (!this.session) throw new WalletUnavailableError('Please sign in again to continue.');
    if (this.session.guest) throw new WalletRefusedError('Create an account to use this feature.');
    let account = this.accounts.get(this.session.uid);
    if (!account) {
      account = {
        coins: 1000,
        owned: [],
        lastGift: null,
        games: 0,
        wins: 0,
        streak: 0,
        bestStreak: 0,
        rewarded: new Set(),
      };
      this.accounts.set(this.session.uid, account);
    }
    return account;
  }

  private snapshot(account: Account): WalletSnapshot {
    return {
      coins: account.coins,
      owned: [...account.owned],
      lastGift: account.lastGift,
      games: account.games,
      wins: account.wins,
      streak: account.streak,
      bestStreak: account.bestStreak,
    };
  }

  /** Test setup: what an account holds on the server before the app looks. */
  seed(uid: string, state: Partial<Omit<Account, 'rewarded'>>): void {
    const current = this.accounts.get(uid) ?? {
      coins: 1000,
      owned: [],
      lastGift: null,
      games: 0,
      wins: 0,
      streak: 0,
      bestStreak: 0,
      rewarded: new Set<string>(),
    };
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
    if (item.price !== expectedPrice)
      throw new WalletRefusedError('The price of this item has changed. Please reopen the store.');
    if (account.coins < item.price)
      throw new WalletRefusedError('Not enough coins. Finish matches or claim your daily gift.');
    account.coins -= item.price;
    for (const id of [itemId, item.contents?.board, item.contents?.dice])
      if (id && !account.owned.includes(id)) account.owned.push(id);
    return this.snapshot(account);
  }

  async claimGift(): Promise<WalletSnapshot> {
    const account = this.account();
    if (account.lastGift !== null && account.lastGift >= this.today)
      throw new WalletRefusedError('Today’s gift is claimed. Come back tomorrow!');
    account.coins += DAILY_GIFT_COINS;
    account.lastGift = this.today;
    return this.snapshot(account);
  }

  async awardMatch(
    matchId: string,
    won: boolean,
    rewardEligible: boolean,
  ): Promise<WalletSnapshot> {
    const account = this.account();
    if (!matchId || matchId.length > 64) throw new WalletRefusedError('Invalid match id.');
    if (account.rewarded.has(matchId)) return this.snapshot(account);
    account.rewarded.add(matchId);
    account.games += 1;
    if (won) account.wins += 1;
    account.streak = won ? account.streak + 1 : 0;
    account.bestStreak = Math.max(account.bestStreak, account.streak);
    if (rewardEligible) account.coins += won ? WIN_COINS : PLAYED_COINS;
    return this.snapshot(account);
  }
}
