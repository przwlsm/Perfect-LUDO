/**
 * Real-money products. The stores take the payment; the verify-purchase
 * Edge Function checks the receipt and the server grants the contents.
 * Mirrors `iap_products` in supabase/migrations/0023_iap.sql — the same ids
 * must be created as products in Play Console / App Store Connect.
 *
 * Money only flows in: everything bought here is virtual and never
 * redeemable, so play stays a game everywhere.
 */
export type IapKind = 'gems' | 'coins' | 'starter' | 'pass' | 'piggy' | 'club' | 'tip';

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
  // Coin packs: 1,000 coins a rupee at the anchor (100k for Rs 100), a little
  // more in the bigger packs. The old 12k/75k rows stay on the server for
  // their receipts but are no longer sold.
  {
    sku: 'ludo.coins.40k',
    kind: 'coins',
    gems: 0,
    coins: 40000,
    name: 'Pocket of Coins',
    blurb: '40,000 coins.',
    consumable: true,
  },
  {
    sku: 'ludo.coins.100k',
    kind: 'coins',
    gems: 0,
    coins: 100000,
    name: 'Chest of Coins',
    blurb: '100,000 coins: the Royal Road starts here.',
    consumable: true,
  },
  {
    sku: 'ludo.coins.275k',
    kind: 'coins',
    gems: 0,
    coins: 275000,
    name: 'Vault of Coins',
    blurb: '275,000 coins, with a bonus for the bigger pack.',
    consumable: true,
  },
  {
    sku: 'ludo.coins.600k',
    kind: 'coins',
    gems: 0,
    coins: 600000,
    name: 'Treasury of Coins',
    blurb: '600,000 coins: the Throne of Legends is in reach.',
    consumable: true,
  },
  {
    sku: 'ludo.coins.1300k',
    kind: 'coins',
    gems: 0,
    coins: 1300000,
    name: 'Royal Treasury',
    blurb: '1,300,000 coins, the best rate of all.',
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
  // "Buy me a coffee": voluntary tips that support the game's upkeep. They
  // grant nothing in the game (so tipping is never pay-to-win) and go through
  // the store's own billing like everything else, as store rules require.
  {
    sku: 'ludo.tip.coffee',
    kind: 'tip',
    gems: 0,
    coins: 0,
    name: 'Coffee',
    blurb: 'A small coffee for the developer.',
    consumable: true,
  },
  {
    sku: 'ludo.tip.big',
    kind: 'tip',
    gems: 0,
    coins: 0,
    name: 'Big coffee',
    blurb: 'A big coffee for a long night of fixes.',
    consumable: true,
  },
  {
    sku: 'ludo.tip.feast',
    kind: 'tip',
    gems: 0,
    coins: 0,
    name: 'Coffee & snack',
    blurb: 'Coffee and a snack: keeps the servers running.',
    consumable: true,
  },
  // "Gift more": bigger tips for players who want to give more. Store
  // billing has no free amount, so the ladder of fixed tiers stands in for one.
  {
    sku: 'ludo.tip.lunch',
    kind: 'tip',
    gems: 0,
    coins: 0,
    name: 'Lunch',
    blurb: 'Lunch for the developer.',
    consumable: true,
  },
  {
    sku: 'ludo.tip.dinner',
    kind: 'tip',
    gems: 0,
    coins: 0,
    name: 'Dinner',
    blurb: 'A proper dinner: a big help.',
    consumable: true,
  },
  {
    sku: 'ludo.tip.party',
    kind: 'tip',
    gems: 0,
    coins: 0,
    name: 'Party',
    blurb: 'A party for the whole team.',
    consumable: true,
  },
  {
    sku: 'ludo.tip.patron',
    kind: 'tip',
    gems: 0,
    coins: 0,
    name: 'Patron',
    blurb: 'For the true patrons of the game.',
    consumable: true,
  },
] as const;

/** Every tip, smallest first: the three coffees, then the "gift more" tiers. */
export const TIP_PRODUCTS: readonly IapProduct[] = IAP_PRODUCTS.filter((p) => p.kind === 'tip');

export function getIapProduct(sku: string): IapProduct | null {
  return IAP_PRODUCTS.find((p) => p.sku === sku) ?? null;
}

/** A catalog product as the store lists it, with its localized price. */
export interface StoreListing {
  readonly sku: string;
  /** Localized display price, e.g. "₹99.00". */
  readonly price: string;
}
