import type { StoreListing } from '../entities/Products';

/**
 * Real-money products through the platform store. `supported()` is false
 * in builds without the native module (Expo Go, web); callers hide prices
 * and buttons then.
 */
export interface IStoreBilling {
  supported(): boolean;
  /** Localized prices for the given product ids; [] when the store is unreachable. */
  listings(skus: readonly string[]): Promise<readonly StoreListing[]>;
  /**
   * Runs the store's purchase flow for `sku` and finishes the transaction
   * (consumed for a tip, acknowledged for Plus). Rejects with
   * PurchaseRefusedError (declined or cancelled) or PurchaseUnavailableError.
   */
  purchase(sku: string, consumable: boolean): Promise<void>;
  /**
   * The non-consumable product ids the store account owns, or null when the
   * store could not be asked (offline, no Play services). Null must never be
   * read as "owns nothing".
   */
  owned(): Promise<readonly string[] | null>;
}
