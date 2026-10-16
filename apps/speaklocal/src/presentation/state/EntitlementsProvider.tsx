import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { PropsWithChildren } from 'react';
import {
  adsLeftToday,
  grantDayPass,
  isOpen,
  NO_ENTITLEMENTS,
  parseEntitlements,
  passRemaining,
  type Entitlements,
  type StoreListing,
} from 'app-kit';
import { ALL_SKUS, PLUS_SKU } from '@/domain/entities/Products';
import { billing, rewardedAds, storage } from '@/config/container';

const KEY = 'speaklocal.entitlements.v1';

export type AdOutcome = 'granted' | 'unfinished' | 'limit' | 'unavailable';

interface Item {
  readonly id: string;
  readonly premium: boolean;
}

interface EntitlementsValue {
  readonly entitlements: Entitlements;
  readonly plus: boolean;
  /** Store prices by sku; empty until (and unless) the store answers. */
  readonly listings: readonly StoreListing[];
  readonly adsReady: boolean;
  /** The clock passes are judged by; it ticks once a minute. */
  readonly now: number;
  open(item: Item): boolean;
  /** Ms left on an item's day pass. */
  remaining(id: string): number;
  adsLeft(): number;
  buyPlus(): Promise<void>;
  tip(sku: string): Promise<void>;
  /** Asks the store again what this account owns; true when Plus came back. */
  restore(): Promise<boolean>;
  /** A finished video opens `id` for a day. */
  watchForPass(id: string): Promise<AdOutcome>;
  /** Starts ad consent and SDK setup when an offer for a video opens. */
  warmAds(): void;
}

const Ctx = createContext<EntitlementsValue | null>(null);

export function EntitlementsProvider({ children }: PropsWithChildren) {
  const [entitlements, setEntitlements] = useState<Entitlements>(NO_ENTITLEMENTS);
  const [listings, setListings] = useState<readonly StoreListing[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const latest = useRef(entitlements);

  const save = useCallback((next: Entitlements) => {
    latest.current = next;
    setEntitlements(next);
    void storage.setItem(KEY, JSON.stringify(next)).catch(() => undefined);
  }, []);

  /** Mirrors what the store says about Plus. Silence (null) changes nothing. */
  const syncOwned = useCallback(async (): Promise<boolean> => {
    const owned = await billing.owned();
    if (owned === null) return latest.current.plus;
    const plus = owned.includes(PLUS_SKU);
    if (plus !== latest.current.plus) save({ ...latest.current, plus });
    return plus;
  }, [save]);

  useEffect(() => {
    let live = true;
    void (async () => {
      const raw = await storage.getItem(KEY).catch(() => null);
      if (!live) return;
      const stored = parseEntitlements(raw);
      latest.current = stored;
      setEntitlements(stored);
      if (!billing.supported()) return;
      void billing.listings(ALL_SKUS).then((l) => {
        if (live) setListings(l);
      });
      await syncOwned();
    })();
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [syncOwned]);

  const value = useMemo<EntitlementsValue>(() => {
    const watch = async (grant: (e: Entitlements) => Entitlements): Promise<AdOutcome> => {
      if (!rewardedAds.supported()) return 'unavailable';
      if (adsLeftToday(latest.current, new Date()) <= 0) return 'limit';
      const finished = await rewardedAds.show();
      if (!finished) return 'unfinished';
      save(grant(latest.current));
      setNow(Date.now());
      return 'granted';
    };
    return {
      entitlements,
      plus: entitlements.plus,
      listings,
      adsReady: rewardedAds.supported(),
      now,
      open: (item) => isOpen(entitlements, item, now),
      remaining: (id) => passRemaining(entitlements, id, now),
      adsLeft: () => adsLeftToday(entitlements, new Date()),
      async buyPlus() {
        await billing.purchase(PLUS_SKU, false);
        save({ ...latest.current, plus: true });
      },
      async tip(sku) {
        await billing.purchase(sku, true);
        save({ ...latest.current, tips: latest.current.tips + 1 });
      },
      restore: syncOwned,
      watchForPass: (id) => watch((e) => grantDayPass(e, id, new Date())),
      warmAds: () => rewardedAds.prepare(),
    };
  }, [entitlements, listings, now, save, syncOwned]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useEntitlements(): EntitlementsValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useEntitlements must be used inside EntitlementsProvider');
  return v;
}
