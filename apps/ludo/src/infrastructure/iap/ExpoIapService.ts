import { Platform } from 'react-native';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  getIapProduct,
  IAP_PRODUCTS,
  parseWalletSnapshot,
  WalletRefusedError,
  WalletUnavailableError,
  type IIapService,
  type StoreListing,
  type WalletSnapshot,
} from '@/domain';

/**
 * The slice of expo-iap this app uses. Typed here so the module can be
 * loaded lazily: it only exists in a development or store build, never in
 * Expo Go, and the shop stays hidden when it is missing.
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
  /** Play subscriptions need one of these offers named in the request. */
  subscriptionOfferDetails?: { offerToken?: string }[];
  subscriptionOfferDetailsAndroid?: { offerToken?: string }[];
}
interface IapModule {
  initConnection(): Promise<unknown>;
  fetchProducts(params: { skus: string[]; type: 'in-app' | 'subs' }): Promise<StoreProduct[]>;
  requestPurchase(params: {
    request: {
      ios: { sku: string };
      android: {
        skus: string[];
        subscriptionOffers?: { sku: string; offerToken: string }[];
      };
    };
    type: 'in-app' | 'subs';
  }): Promise<unknown>;
  purchaseUpdatedListener(fn: (purchase: Purchase) => void): { remove(): void };
  purchaseErrorListener(fn: (error: { message?: string }) => void): { remove(): void };
  finishTransaction(params: { purchase: Purchase; isConsumable: boolean }): Promise<unknown>;
}

let mod: IapModule | null | undefined;
function iap(): IapModule | null {
  if (mod === undefined) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- optional native module
      mod = require('expo-iap') as IapModule;
    } catch {
      mod = null;
    }
  }
  return mod;
}

export class ExpoIapService implements IIapService {
  private connected: Promise<unknown> | null = null;
  /** Play subscription offers seen on the last listings fetch, by sku. */
  private readonly offers = new Map<string, string>();

  constructor(private readonly client: SupabaseClient) {}

  supported(): boolean {
    return iap() !== null;
  }

  private async connect(m: IapModule): Promise<void> {
    this.connected ??= m.initConnection().catch(() => (this.connected = null));
    await this.connected;
  }

  async listings(): Promise<readonly StoreListing[]> {
    const m = iap();
    if (!m) return [];
    try {
      await this.connect(m);
      const oneOff = IAP_PRODUCTS.filter((p) => !p.subscription).map((p) => p.sku);
      const subs = IAP_PRODUCTS.filter((p) => p.subscription).map((p) => p.sku);
      const products = [
        ...(await m.fetchProducts({ skus: oneOff, type: 'in-app' })),
        ...(subs.length ? await m.fetchProducts({ skus: subs, type: 'subs' }).catch(() => []) : []),
      ];
      for (const p of products) {
        const sku = p.id ?? p.productId;
        const offer = (p.subscriptionOfferDetails ?? p.subscriptionOfferDetailsAndroid)?.[0]
          ?.offerToken;
        if (sku && offer) this.offers.set(sku, offer);
      }
      return products
        .map((p) => ({
          sku: p.id ?? p.productId ?? '',
          price: p.displayPrice ?? p.localizedPrice ?? '',
        }))
        .filter((p) => p.sku !== '' && p.price !== '');
    } catch {
      // No store session (e.g. an emulator without Play): the shop hides.
      return [];
    }
  }

  /** The store's proof of purchase, whichever field this platform fills. */
  private static tokenOf(purchase: Purchase): string | null {
    return (
      purchase.purchaseToken ??
      purchase.purchaseTokenAndroid ??
      purchase.jwsRepresentationIos ??
      purchase.transactionReceipt ??
      null
    );
  }

  private async verify(sku: string, purchase: Purchase): Promise<WalletSnapshot> {
    const token = ExpoIapService.tokenOf(purchase);
    if (!token) throw new WalletUnavailableError('The store returned no receipt to verify.');
    const { data, error } = await this.client.functions.invoke('verify-purchase', {
      body: {
        platform: Platform.OS === 'ios' ? 'ios' : 'android',
        productId: sku,
        token,
      },
    });
    if (error) {
      throw new WalletUnavailableError(
        'The purchase could not be verified yet. It will be restored on your next try.',
      );
    }
    const payload = data as { wallet?: unknown; error?: string };
    if (!payload?.wallet) {
      throw new WalletRefusedError(payload?.error ?? 'The store refused this purchase.');
    }
    return parseWalletSnapshot(payload.wallet);
  }

  purchase(sku: string): Promise<WalletSnapshot> {
    const m = iap();
    if (!m) {
      return Promise.reject(
        new WalletUnavailableError('Purchases need the full app build from the store.'),
      );
    }
    const product = getIapProduct(sku);
    if (!product) return Promise.reject(new WalletRefusedError('That product is not for sale.'));

    return new Promise<WalletSnapshot>((resolve, reject) => {
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
              await m.finishTransaction({ purchase, isConsumable: product.consumable });
              finish(() => resolve(wallet));
            } catch (e) {
              finish(() => reject(e));
            }
          })();
        }),
        m.purchaseErrorListener((error) => {
          finish(() =>
            reject(new WalletRefusedError(error.message ?? 'The purchase was cancelled.')),
          );
        }),
      );
      const offerToken = this.offers.get(sku);
      void this.connect(m)
        .then(() =>
          m.requestPurchase({
            request: {
              ios: { sku },
              android: {
                skus: [sku],
                ...(product.subscription && offerToken
                  ? { subscriptionOffers: [{ sku, offerToken }] }
                  : {}),
              },
            },
            type: product.subscription ? 'subs' : 'in-app',
          }),
        )
        .catch(() =>
          finish(() =>
            reject(new WalletUnavailableError('The store could not start this purchase.')),
          ),
        );
    });
  }
}
