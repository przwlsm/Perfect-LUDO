import type { IapProduct, StoreCatalog, StoreItem, Wallet } from '@/domain/entities/Economy';
import type { AdRewardGrant } from '@/domain/ports/IWalletRepository';

type Row = Record<string, unknown>;

function row(value: unknown, what: string): Row {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`Bad ${what} from the server`);
  }
  return value as Row;
}

function integer(value: unknown, what: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new Error(`Bad ${what} from the server`);
  }
  return value;
}

function text(value: unknown, what: string): string {
  if (typeof value !== 'string') throw new Error(`Bad ${what} from the server`);
  return value;
}

export function parseWallet(raw: unknown): Wallet {
  const w = row(raw, 'wallet');
  const today = row(w.adRewardsToday ?? {}, 'ad rewards');
  const caps = row(w.caps ?? {}, 'caps');
  const owned = Array.isArray(w.owned) ? w.owned : [];
  return {
    coins: integer(w.coins, 'coins'),
    supporter: w.supporter === true,
    equippedBoard: text(w.equippedBoard, 'board'),
    equippedPieces: text(w.equippedPieces, 'pieces'),
    owned: owned.map((id) => text(id, 'owned item')),
    adRewardsToday: {
      coins: integer(today.coins ?? 0, 'ad rewards'),
      double: integer(today.double ?? 0, 'ad rewards'),
    },
    caps: {
      coins: integer(caps.coins ?? 5, 'caps'),
      double: integer(caps.double ?? 3, 'caps'),
      adCoins: integer(caps.adCoins ?? 25, 'caps'),
    },
  };
}

export function parseAdRewardGrant(raw: unknown): AdRewardGrant {
  const r = row(raw, 'reward');
  return { wallet: parseWallet(raw), granted: integer(r.granted, 'reward') };
}

function item(raw: unknown): StoreItem {
  const i = row(raw, 'store item');
  const kind = i.kind;
  if (kind !== 'board' && kind !== 'pieces') throw new Error('Bad store item from the server');
  return {
    id: text(i.id, 'store item'),
    kind,
    name: text(i.name, 'store item'),
    price: integer(i.price, 'price'),
    supporterOnly: i.supporterOnly === true,
  };
}

function product(raw: unknown): IapProduct {
  const p = row(raw, 'product');
  const kind = p.kind;
  if (kind !== 'coins' && kind !== 'pass') throw new Error('Bad product from the server');
  return { id: text(p.id, 'product'), kind, coins: integer(p.coins, 'product') };
}

export function parseStoreCatalog(raw: unknown): StoreCatalog {
  const s = row(raw, 'store');
  if (!Array.isArray(s.items) || !Array.isArray(s.products))
    throw new Error('Bad store from the server');
  return {
    items: s.items.map(item),
    products: s.products.map(product),
    wallet: parseWallet(s.wallet),
  };
}
