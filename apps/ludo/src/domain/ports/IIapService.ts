import type { StoreListing } from '../entities/Iap';
import type { WalletSnapshot } from '../entities/Wallet';

/**
 * Real-money purchases through the platform store. `supported()` is false
 * in builds without the native module (Expo Go) and callers hide the shop
 * then. A purchase runs the store flow AND the server-side receipt
 * verification; only the wallet the server returns is ever shown.
 */
export interface IIapService {
  supported(): boolean;
  /** Store listings (localized prices) for the catalog; [] when unavailable. */
  listings(): Promise<readonly StoreListing[]>;
  /**
   * Buys `sku` and resolves with the verified wallet. Rejects with
   * `WalletRefusedError` when the store or the server declines, and
   * `WalletUnavailableError` when the flow could not run.
   */
  purchase(sku: string): Promise<WalletSnapshot>;
}
