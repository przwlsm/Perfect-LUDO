import type { StoreCatalog, Wallet } from '../entities/Economy';

export type AdRewardKind = 'coins' | 'double';

export interface AdRewardGrant {
  readonly wallet: Wallet;
  /** Coins the ad just earned. */
  readonly granted: number;
}

/** Coins, looks and rewards, all decided on the server. Every call returns the wallet as it now stands. */
export interface IWalletRepository {
  wallet(): Promise<Wallet>;
  store(): Promise<StoreCatalog>;
  buy(itemId: string): Promise<Wallet>;
  equip(itemId: string): Promise<Wallet>;
  /** After a finished rewarded ad. `ref` is the match id for 'double'. */
  claimAdReward(kind: AdRewardKind, ref?: string): Promise<AdRewardGrant>;
}
