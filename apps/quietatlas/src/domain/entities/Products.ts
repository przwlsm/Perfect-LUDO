/**
 * Everything Quiet Atlas sells, all through the platform store's own
 * billing (never an outside payment link, which store rules forbid).
 *
 * - Plus: one purchase, forever. Every premium look in every toy, and shared
 *   pictures without the small watermark. Toys themselves are never locked.
 * - Tips: "buy us a chai". They unlock nothing; they are a thank-you.
 */
export const PLUS_SKU = 'quietatlas.plus';

export type TipKey = 'chai' | 'coffee' | 'cake' | 'lunch' | 'patron';

export interface TipProduct {
  readonly sku: string;
  readonly key: TipKey;
  readonly icon: string;
  /** Shown in the first row; the rest sit behind "Give more". */
  readonly featured: boolean;
}

export const TIP_PRODUCTS: readonly TipProduct[] = [
  { sku: 'quietatlas.tip.chai', key: 'chai', icon: '🍵', featured: true },
  { sku: 'quietatlas.tip.coffee', key: 'coffee', icon: '☕', featured: true },
  { sku: 'quietatlas.tip.cake', key: 'cake', icon: '🍰', featured: true },
  { sku: 'quietatlas.tip.lunch', key: 'lunch', icon: '🍱', featured: false },
  { sku: 'quietatlas.tip.patron', key: 'patron', icon: '🌍', featured: false },
];

export const ALL_SKUS: readonly string[] = [PLUS_SKU, ...TIP_PRODUCTS.map((t) => t.sku)];

export function isTipSku(sku: string): boolean {
  return TIP_PRODUCTS.some((t) => t.sku === sku);
}

/** A product as the store lists it right now, with its localized price. */
export interface StoreListing {
  readonly sku: string;
  readonly price: string;
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
