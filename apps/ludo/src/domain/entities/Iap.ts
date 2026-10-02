/**
 * Real-money products. The stores take the payment; the verify-purchase
 * Edge Function checks the receipt and the server grants the contents.
 * Mirrors `iap_products` in supabase/migrations/0023_iap.sql — the same ids
 * must be created as products in Play Console / App Store Connect.
 *
 * Money only flows in: everything bought here is virtual and never
 * redeemable, so play stays a game everywhere.
 */
export type IapKind = 'gems' | 'coins' | 'starter' | 'pass' | 'piggy' | 'club';

export interface IapProduct {
  readonly sku: string;
  readonly kind: IapKind;
  readonly gems: number;
  readonly coins: number;
  readonly name: string;
  readonly blurb: string;
  /** Consumables can be bought again; the rest are one-time. */
  readonly consumable: boolean;
  /** A store subscription rather than a one-off product. */
  readonly subscription?: boolean;
}

export const IAP_PRODUCTS: readonly IapProduct[] = [
  {
    sku: 'ludo.starter',
    kind: 'starter',
    gems: 120,
    coins: 5000,
    name: 'Starter Pack',
    blurb: 'One-time bundle: a bankroll and a pocket of gems.',
    consumable: false,
  },
  {
    sku: 'ludo.gems.small',
    kind: 'gems',
    gems: 160,
    coins: 0,
    name: 'Pouch of Gems',
    blurb: '160 gems.',
    consumable: true,
  },
  {
    sku: 'ludo.gems.medium',
    kind: 'gems',
    gems: 900,
    coins: 0,
    name: 'Bag of Gems',
    blurb: '900 gems — the season pass and more.',
    consumable: true,
  },
  {
    sku: 'ludo.gems.large',
    kind: 'gems',
    gems: 4200,
    coins: 0,
    name: 'Chest of Gems',
    blurb: '4,200 gems for the whole collection.',
    consumable: true,
  },
  {
    sku: 'ludo.coins.small',
    kind: 'coins',
    gems: 0,
    coins: 12000,
    name: 'Stack of Coins',
    blurb: '12,000 coins — a seat at the 10K table.',
    consumable: true,
  },
  {
    sku: 'ludo.coins.large',
    kind: 'coins',
    gems: 0,
    coins: 75000,
    name: 'Vault of Coins',
    blurb: '75,000 coins — the 50K table awaits.',
    consumable: true,
  },
  {
    sku: 'ludo.pass',
    kind: 'pass',
    gems: 0,
    coins: 0,
    name: 'Premium Pass',
    blurb: 'This season’s premium track, paid directly.',
    consumable: true,
  },
  {
    sku: 'ludo.piggy',
    kind: 'piggy',
    gems: 0,
    coins: 0,
    name: 'Piggy Bank',
    blurb: 'Every game feeds it. Crack it open and keep everything inside.',
    consumable: true,
  },
  {
    sku: 'ludo.club',
    kind: 'club',
    gems: 0,
    coins: 0,
    name: 'Ludo Club',
    blurb: 'Free extra spins and 10 gems with every daily gift.',
    consumable: false,
    subscription: true,
  },
] as const;

export function getIapProduct(sku: string): IapProduct | null {
  return IAP_PRODUCTS.find((p) => p.sku === sku) ?? null;
}

/** A catalog product as the store lists it, with its localized price. */
export interface StoreListing {
  readonly sku: string;
  /** Localized display price, e.g. "₹99.00". */
  readonly price: string;
}
