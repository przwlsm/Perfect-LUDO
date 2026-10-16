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
  grantDayPass,
  isLookOpen,
  NO_ENTITLEMENTS,
  parseEntitlements,
  passesLeftToday,
  type Entitlements,
} from '@/domain/entities/Entitlements';
import type { Look } from '@/domain/entities/Look';
import { ALL_SKUS, PLUS_SKU, type StoreListing } from '@/domain/entities/Products';
import { billing, rewardedAds, storage } from '@/config/container';

const KEY = 'quietatlas.entitlements.v1';

export type AdOutcome = 'granted' | 'unfinished' | 'limit' | 'unavailable';

interface EntitlementsValue {
  readonly entitlements: Entitlements;
  readonly plus: boolean;
  /** Store prices by sku; empty until (and unless) the store answers. */
  readonly listings: readonly StoreListing[];
  readonly storeReady: boolean;
  readonly adsReady: boolean;
  /** The clock passes are judged by; it ticks once a minute. */
  readonly now: number;
  /** Re-evaluated every minute, so day passes expire on screen. */
  isOpen(look: Look): boolean;
  passesLeft(): number;
  buyPlus(): Promise<void>;
  tip(sku: string): Promise<void>;
  /** Asks the store again what this account owns; true when Plus came back. */
  restore(): Promise<boolean>;
  /** Plays a rewarded video and, if it was finished, opens `look` for a day. */
  watchFor(look: Look): Promise<AdOutcome>;
  /** Starts ad consent and SDK setup ahead of a likely tap. */
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

  const value = useMemo<EntitlementsValue>(
    () => ({
      entitlements,
      plus: entitlements.plus,
      listings,
      storeReady: listings.length > 0,
      adsReady: rewardedAds.supported(),
      now,
      isOpen: (look) => isLookOpen(entitlements, look, now),
      passesLeft: () => passesLeftToday(entitlements, new Date()),
      async buyPlus() {
        await billing.purchase(PLUS_SKU, false);
        save({ ...latest.current, plus: true });
      },
      async tip(sku) {
        await billing.purchase(sku, true);
        save({ ...latest.current, tips: latest.current.tips + 1 });
      },
      restore: syncOwned,
      async watchFor(look) {
        if (!rewardedAds.supported()) return 'unavailable';
        if (passesLeftToday(latest.current, new Date()) <= 0) return 'limit';
        const finished = await rewardedAds.show();
        if (!finished) return 'unfinished';
        save(grantDayPass(latest.current, look.id, new Date()));
        setNow(Date.now());
        return 'granted';
      },
      warmAds: () => rewardedAds.prepare(),
    }),
    [entitlements, listings, now, save, syncOwned],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useEntitlements(): EntitlementsValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useEntitlements must be used inside EntitlementsProvider');
  return v;
}

export function priceOf(listings: readonly StoreListing[], sku: string): string | undefined {
  return listings.find((l) => l.sku === sku)?.price;
}
