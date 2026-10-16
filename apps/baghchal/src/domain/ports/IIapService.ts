import type { StoreListing, Wallet } from '../entities/Economy';

/**
 * Real-money purchases through the platform store. `supported()` is false
 * in builds without the native module (Expo Go, web) and callers hide the
 * products then. A purchase runs the store flow AND the server-side receipt
 * verification; only the wallet the server returns is ever shown.
 */
export interface IIapService {
  supported(): boolean;
  /** Localized prices for the given product ids; [] when the store is unreachable. */
  listings(skus: readonly string[]): Promise<readonly StoreListing[]>;
  /**
   * Buys `sku` and resolves with the verified wallet. Rejects with
   * PurchaseRefusedError when the store or the server declines, and
   * PurchaseUnavailableError when the flow could not run.
   */
  purchase(sku: string, consumable: boolean): Promise<Wallet>;
  /** Re-verifies the store account's non-consumables; null when nothing was restored. */
  restore(skus: readonly string[]): Promise<Wallet | null>;
}
