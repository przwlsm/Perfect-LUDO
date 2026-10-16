import { Platform } from 'react-native';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  PurchaseRefusedError,
  PurchaseUnavailableError,
  type StoreListing,
  type Wallet,
} from '@/domain/entities/Economy';
import type { IIapService } from '@/domain/ports/IIapService';
import { parseWallet } from '../supabase/economyRows';

/**
 * The slice of expo-iap this app uses. Typed here so the module can be
 * loaded lazily: it only exists in a development or store build, never in
 * Expo Go or on the web, and the products stay hidden when it is missing.
 */
interface Purchase {
  readonly productId?: string;
  readonly purchaseToken?: string;
  readonly purchaseTokenAndroid?: string;
  readonly transactionReceipt?: string;
  readonly jwsRepresentationIos?: string;
}
interface StoreProduct {
  id?: string;
  productId?: string;
  displayPrice?: string;
  localizedPrice?: string;
}
interface IapModule {
  initConnection(): Promise<unknown>;
  fetchProducts(params: { skus: string[]; type: 'in-app' }): Promise<StoreProduct[]>;
  requestPurchase(params: {
    request: { ios: { sku: string }; android: { skus: string[] } };
    type: 'in-app';
  }): Promise<unknown>;
  getAvailablePurchases(): Promise<Purchase[]>;
  purchaseUpdatedListener(fn: (purchase: Purchase) => void): { remove(): void };
  purchaseErrorListener(fn: (error: { message?: string }) => void): { remove(): void };
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

/** The store's proof of purchase, whichever field this platform fills. */
function tokenOf(purchase: Purchase): string | null {
  return (
    purchase.purchaseToken ??
    purchase.purchaseTokenAndroid ??
    purchase.jwsRepresentationIos ??
    purchase.transactionReceipt ??
    null
  );
}

export class ExpoIapService implements IIapService {
  private connected: Promise<unknown> | null = null;

  constructor(private readonly client: SupabaseClient) {}

  supported(): boolean {
    return iap() !== null;
  }

  private async connect(m: IapModule): Promise<void> {
    this.connected ??= m.initConnection().catch(() => (this.connected = null));
    await this.connected;
  }

  async listings(skus: readonly string[]): Promise<readonly StoreListing[]> {
    const m = iap();
    if (!m || skus.length === 0) return [];
    try {
      await this.connect(m);
      const products = await m.fetchProducts({ skus: [...skus], type: 'in-app' });
      return products
        .map((p) => ({
          sku: p.id ?? p.productId ?? '',
          price: p.displayPrice ?? p.localizedPrice ?? '',
        }))
        .filter((p) => p.sku !== '' && p.price !== '');
    } catch {
      // No store session (an emulator without Play, say): the products hide.
      return [];
    }
  }

  /** Sends the receipt to the server; only its answer is ever shown as a wallet. */
  private async verify(sku: string, purchase: Purchase): Promise<Wallet> {
    const token = tokenOf(purchase);
    if (!token) throw new PurchaseUnavailableError('The store returned no receipt to verify.');
    const { data, error } = await this.client.functions.invoke('verify-purchase', {
      body: { platform: Platform.OS === 'ios' ? 'ios' : 'android', productId: sku, token },
    });
    if (error) {
      throw new PurchaseUnavailableError(
        'The purchase could not be verified yet. It will be restored on your next try.',
      );
    }
    const payload = data as { wallet?: unknown; error?: string };
    if (!payload?.wallet) {
      throw new PurchaseRefusedError(payload?.error ?? 'The store refused this purchase.');
    }
    return parseWallet(payload.wallet);
  }

  purchase(sku: string, consumable: boolean): Promise<Wallet> {
    const m = iap();
    if (!m) {
      return Promise.reject(
        new PurchaseUnavailableError('Purchases need the full app from the store.'),
      );
    }
    return new Promise<Wallet>((resolve, reject) => {
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
          void (async () => {
            try {
              const wallet = await this.verify(sku, purchase);
              // Only a server-granted purchase is finished; anything else
              // stays open for the store to redeliver.
              await m.finishTransaction({ purchase, isConsumable: consumable });
              finish(() => resolve(wallet));
            } catch (e) {
              finish(() => reject(e));
            }
          })();
        }),
        m.purchaseErrorListener((error) => {
          finish(() =>
            reject(new PurchaseRefusedError(error.message ?? 'The purchase was cancelled.')),
          );
        }),
      );
      void this.connect(m)
        .then(() =>
          m.requestPurchase({
            request: { ios: { sku }, android: { skus: [sku] } },
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

  async restore(skus: readonly string[]): Promise<Wallet | null> {
    const m = iap();
    if (!m) return null;
    await this.connect(m);
    const purchases = await m.getAvailablePurchases().catch(() => [] as Purchase[]);
    let wallet: Wallet | null = null;
    for (const purchase of purchases) {
      if (!purchase.productId || !skus.includes(purchase.productId)) continue;
      wallet = await this.verify(purchase.productId, purchase);
    }
    return wallet;
  }
}
