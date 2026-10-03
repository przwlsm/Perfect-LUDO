export type ItemKind = 'board' | 'pieces';

/** A look in the store. Mirrors `store_items` in supabase/migrations/0003_economy.sql. */
export interface StoreItem {
  readonly id: string;
  readonly kind: ItemKind;
  readonly name: string;
  /** Coins; 0 for the default looks. */
  readonly price: number;
  /** Never for sale: every supporter owns it. */
  readonly supporterOnly: boolean;
}

/**
 * Real-money products. The stores take the payment; the verify-purchase
 * Edge Function checks the receipt and the server grants the contents.
 * Mirrors `iap_products`; the same ids are created in Play Console and App
 * Store Connect. Money only flows in: nothing bought is ever redeemable.
 */
export interface IapProduct {
  readonly id: string;
  readonly kind: 'coins' | 'pass';
  readonly coins: number;
}

export const SUPPORTER_SKU = 'baghchal.supporter';

/** A product as the store lists it, with its localized price. */
export interface StoreListing {
  readonly sku: string;
  /** e.g. "₹169.00" */
  readonly price: string;
}

export interface Wallet {
  readonly coins: number;
  readonly supporter: boolean;
  readonly equippedBoard: string;
  readonly equippedPieces: string;
  readonly owned: readonly string[];
  /** Rewarded ads already claimed today, against `caps`. */
  readonly adRewardsToday: { readonly coins: number; readonly double: number };
  readonly caps: { readonly coins: number; readonly double: number; readonly adCoins: number };
}

export interface StoreCatalog {
  readonly items: readonly StoreItem[];
  readonly products: readonly IapProduct[];
  readonly wallet: Wallet;
}

/** Whether the player may equip the item: free, bought, or a perk of a pass they hold. */
export function canUse(wallet: Wallet, item: StoreItem): boolean {
  if (item.price === 0 && !item.supporterOnly) return true;
  if (wallet.owned.includes(item.id)) return true;
  return item.supporterOnly && wallet.supporter;
}

/** The store or the server said no (declined, cancelled, not for sale). */
export class PurchaseRefusedError extends Error {}
/** The purchase flow could not run at all (no store, no network). */
export class PurchaseUnavailableError extends Error {}
