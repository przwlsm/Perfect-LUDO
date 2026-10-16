/**
 * The honest money model every app shares, sold only through the platform
 * store's own billing (never an outside payment link, which store rules
 * forbid for in-app payments):
 *
 * - Plus: one purchase, forever. Cosmetics, comfort features and no
 *   watermark. Never gameplay, never a paywall on a level or a toy.
 * - Rewarded videos: only after the player taps for one; each opens one
 *   premium item for a day, or gives one hint.
 * - Tips: "buy us a chai". They unlock nothing.
 */
export type TipKey = 'chai' | 'coffee' | 'cake' | 'lunch' | 'patron';

export interface TipProduct {
  readonly sku: string;
  readonly key: TipKey;
  readonly icon: string;
  /** Shown in the first row; the rest sit behind "Give more". */
  readonly featured: boolean;
}

/** The standard five tip tiers, under the app's own product-id prefix (e.g. "quietatlas"). */
export function tipProducts(prefix: string): readonly TipProduct[] {
  return [
    { sku: `${prefix}.tip.chai`, key: 'chai', icon: '🍵', featured: true },
    { sku: `${prefix}.tip.coffee`, key: 'coffee', icon: '☕', featured: true },
    { sku: `${prefix}.tip.cake`, key: 'cake', icon: '🍰', featured: true },
    { sku: `${prefix}.tip.lunch`, key: 'lunch', icon: '🍱', featured: false },
    { sku: `${prefix}.tip.patron`, key: 'patron', icon: '🌍', featured: false },
  ];
}

/** True for any product id that is a tip under the standard naming (`<app>.tip.<tier>`). */
export function isTipSku(sku: string): boolean {
  return /\.tip\.[a-z]+$/.test(sku);
}

/** A product as the store lists it right now, with its localized price. */
export interface StoreListing {
  readonly sku: string;
  readonly price: string;
}

export function priceOf(listings: readonly StoreListing[], sku: string): string | undefined {
  return listings.find((l) => l.sku === sku)?.price;
}

/** The store or the player declined (cancelled, card refused, already owned…). */
export class PurchaseRefusedError extends Error {
  readonly cancelled: boolean;
  constructor(message: string, cancelled = false) {
    super(message);
    this.name = 'PurchaseRefusedError';
    this.cancelled = cancelled;
  }
}

/** The purchase flow could not run at all (no store, no network). */
export class PurchaseUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PurchaseUnavailableError';
  }
}
