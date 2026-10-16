import { Platform } from 'react-native';
import {
  isTipSku,
  PurchaseRefusedError,
  PurchaseUnavailableError,
  type StoreListing,
} from '../money/Products';
import type { IStoreBilling } from '../ports/IStoreBilling';

/**
 * The slice of expo-iap (5.8) this app uses, typed here so the module can be
 * loaded lazily: it only exists in a development or store build, never in
 * Expo Go or on the web. Note the request shape: expo-iap 5.8 reads
 * `request.apple` / `request.google` and ignores the older `ios` / `android`
 * keys.
 */
interface Purchase {
  readonly productId?: string;
  readonly purchaseState?: 'pending' | 'purchased' | 'unknown';
}
interface StoreProduct {
  readonly id?: string;
  readonly displayPrice?: string;
}
interface IapModule {
  initConnection(): Promise<unknown>;
  fetchProducts(params: { skus: string[]; type: 'in-app' }): Promise<StoreProduct[] | null>;
  requestPurchase(params: {
    request: { apple: { sku: string }; google: { skus: string[] } };
    type: 'in-app';
  }): Promise<unknown>;
  getAvailablePurchases(): Promise<Purchase[]>;
  purchaseUpdatedListener(fn: (purchase: Purchase) => void): { remove(): void };
  purchaseErrorListener(fn: (error: { code?: string; message?: string }) => void): {
    remove(): void;
  };
  finishTransaction(params: { purchase: Purchase; isConsumable: boolean }): Promise<unknown>;
}

let mod: IapModule | null | undefined;
function iap(): IapModule | null {
  if (mod === undefined) {
    // No store in a browser: the package is stubbed out of the web bundle (metro.config.js).
    if (Platform.OS === 'web') return (mod = null);
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- optional native module
      const loaded = require('expo-iap') as Partial<IapModule>;
      mod = typeof loaded.initConnection === 'function' ? (loaded as IapModule) : null;
    } catch {
      mod = null;
    }
  }
  return mod;
}

/**
 * Store billing without a server. The apps keep no accounts and store
 * nothing about the player off the device, so the store account itself is
 * the record of what was bought: Plus is restored from it on every launch.
 * Transactions are finished only after the purchase is reported as
 * completed, so Google refunds nothing it should not and redelivers anything
 * left open.
 */
export class ExpoIapBilling implements IStoreBilling {
  private connected: Promise<unknown> | null = null;

  supported(): boolean {
    return iap() !== null;
  }

  private async connect(m: IapModule): Promise<void> {
    this.connected ??= m.initConnection().catch((e: unknown) => {
      this.connected = null;
      throw e;
    });
    await this.connected;
  }

  async listings(skus: readonly string[]): Promise<readonly StoreListing[]> {
    const m = iap();
    if (!m || skus.length === 0) return [];
    try {
      await this.connect(m);
      const products = (await m.fetchProducts({ skus: [...skus], type: 'in-app' })) ?? [];
      return products
        .map((p) => ({ sku: p.id ?? '', price: p.displayPrice ?? '' }))
        .filter((p) => p.sku !== '' && p.price !== '');
    } catch {
      // No store session (an emulator without Play, say): the products hide.
      return [];
    }
  }

  purchase(sku: string, consumable: boolean): Promise<void> {
    const m = iap();
    if (!m) {
      return Promise.reject(new PurchaseUnavailableError('Purchases need the app from the store.'));
    }
    return new Promise<void>((resolve, reject) => {
      let settled = false;
      const subscriptions: { remove(): void }[] = [];
      const finish = (outcome: () => void) => {
        if (settled) return;
        settled = true;
        for (const s of subscriptions) s.remove();
        outcome();
      };
      subscriptions.push(
        m.purchaseUpdatedListener((purchase) => {
          if (purchase.productId && purchase.productId !== sku) return;
          // A pending payment (cash at a shop, say) completes later and is
          // picked up by the restore on a following launch.
          if (purchase.purchaseState === 'pending') {
            finish(() =>
              reject(
                new PurchaseRefusedError(
                  'Your payment is pending. It will arrive when the store confirms it.',
                ),
              ),
            );
            return;
          }
          void m
            .finishTransaction({ purchase, isConsumable: consumable })
            .then(() => finish(resolve))
            .catch(() =>
              finish(() =>
                reject(
                  new PurchaseUnavailableError(
                    'The store took your purchase but could not confirm it yet. It will be restored.',
                  ),
                ),
              ),
            );
        }),
        m.purchaseErrorListener((error) => {
          const cancelled = error.code === 'user-cancelled';
          finish(() =>
            reject(
              new PurchaseRefusedError(error.message ?? 'The purchase was cancelled.', cancelled),
            ),
          );
        }),
      );
      void this.connect(m)
        .then(() =>
          m.requestPurchase({
            request: { apple: { sku }, google: { skus: [sku] } },
            type: 'in-app',
          }),
        )
        .catch(() =>
          finish(() =>
            reject(new PurchaseUnavailableError('The store could not start this purchase.')),
          ),
        );
    });
  }

  async owned(): Promise<readonly string[] | null> {
    const m = iap();
    if (!m) return null;
    try {
      await this.connect(m);
      const purchases = await m.getAvailablePurchases();
      const owned: string[] = [];
      for (const p of purchases) {
        if (!p.productId || p.purchaseState === 'pending') continue;
        const tip = isTipSku(p.productId);
        if (!tip) owned.push(p.productId);
        // A purchase that was paid but never finished (the app closed
        // mid-flow) is finished now, or Google would refund it: a tip is
        // consumed so it can be given again, Plus is acknowledged.
        void m.finishTransaction({ purchase: p, isConsumable: tip }).catch(() => undefined);
      }
      return owned;
    } catch {
      return null;
    }
  }
}
