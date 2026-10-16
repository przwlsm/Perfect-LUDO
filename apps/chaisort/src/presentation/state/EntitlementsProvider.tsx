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
  grantHint,
  isOpen,
  NO_ENTITLEMENTS,
  parseEntitlements,
  spendHint,
  type Entitlements,
  type StoreListing,
} from 'app-kit';
import type { CupTheme } from '@/domain/entities/CupTheme';
import {
  freeHintsLeft,
  FRESH_WALLET,
  parseWallet,
  spendFreeHint,
  type HintWallet,
} from '@/domain/entities/Hints';
import { ALL_SKUS, PLUS_SKU } from '@/domain/entities/Products';
import { FREE_ARCHIVE_DAYS } from '@/application/levels/daily';
import { billing, rewardedAds, storage } from '@/config/container';

const KEY = 'chaisort.entitlements.v1';
const WALLET_KEY = 'chaisort.hints.v1';

export type AdOutcome = 'granted' | 'unfinished' | 'limit' | 'unavailable';

interface EntitlementsValue {
  readonly entitlements: Entitlements;
  readonly plus: boolean;
  /** Store prices by sku; empty until (and unless) the store answers. */
  readonly listings: readonly StoreListing[];
  readonly adsReady: boolean;
  /** The clock day passes are judged by; it ticks once a minute. */
  readonly now: number;
  isThemeOpen(theme: CupTheme): boolean;
  /** Hints the player can take now: free ones left today plus earned ones; Infinity with Plus. */
  hintsLeft(): number;
  freeHintsToday(): number;
  /** Uses a hint (today's free ones first). False when none is left. */
  takeHint(): boolean;
  /** Whether daily puzzle `n` can be opened when today is `today`. */
  archiveOpen(n: number, today: number): boolean;
  adsLeft(): number;
  buyPlus(): Promise<void>;
  tip(sku: string): Promise<void>;
  /** Asks the store again what this account owns; true when Plus came back. */
  restore(): Promise<boolean>;
  /** A rewarded video for one hint. */
  watchForHint(): Promise<AdOutcome>;
  /** A rewarded video for a day with one cup theme. */
  watchForTheme(theme: CupTheme): Promise<AdOutcome>;
  /** Starts ad consent and SDK setup when the player opens a video offer. */
  warmAds(): void;
}

const Ctx = createContext<EntitlementsValue | null>(null);

export function EntitlementsProvider({ children }: PropsWithChildren) {
  const [entitlements, setEntitlements] = useState<Entitlements>(NO_ENTITLEMENTS);
  const [wallet, setWallet] = useState<HintWallet>(FRESH_WALLET);
  const [listings, setListings] = useState<readonly StoreListing[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const latest = useRef(entitlements);
  const latestWallet = useRef(wallet);

  const save = useCallback((next: Entitlements) => {
    latest.current = next;
    setEntitlements(next);
    void storage.setItem(KEY, JSON.stringify(next)).catch(() => undefined);
  }, []);
  const saveWallet = useCallback((next: HintWallet) => {
    latestWallet.current = next;
    setWallet(next);
    void storage.setItem(WALLET_KEY, JSON.stringify(next)).catch(() => undefined);
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
      const [raw, rawWallet] = await Promise.all([
        storage.getItem(KEY).catch(() => null),
        storage.getItem(WALLET_KEY).catch(() => null),
      ]);
      if (!live) return;
      const stored = parseEntitlements(raw);
      latest.current = stored;
      setEntitlements(stored);
      const w = parseWallet(rawWallet);
      latestWallet.current = w;
      setWallet(w);
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
    const watch = async (grant: (e: Entitlements, at: Date) => Entitlements) => {
      if (!rewardedAds.supported()) return 'unavailable' as const;
      if (adsLeftToday(latest.current, new Date()) <= 0) return 'limit' as const;
      const finished = await rewardedAds.show();
      if (!finished) return 'unfinished' as const;
      save(grant(latest.current, new Date()));
      setNow(Date.now());
      return 'granted' as const;
    };
    return {
      entitlements,
      plus: entitlements.plus,
      listings,
      adsReady: rewardedAds.supported(),
      now,
      isThemeOpen: (f) => isOpen(entitlements, f, now),
      hintsLeft: () =>
        entitlements.plus ? Infinity : freeHintsLeft(wallet, new Date()) + entitlements.hints,
      freeHintsToday: () => freeHintsLeft(wallet, new Date()),
      takeHint() {
        if (latest.current.plus) return true;
        const free = spendFreeHint(latestWallet.current, new Date());
        if (free) {
          saveWallet(free);
          return true;
        }
        const spent = spendHint(latest.current);
        if (!spent) return false;
        save(spent);
        return true;
      },
      archiveOpen: (n, today) =>
        n >= 1 && n <= today && (entitlements.plus || today - n < FREE_ARCHIVE_DAYS),
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
      watchForHint: () => watch((e, at) => grantHint(e, at)),
      watchForTheme: (f) => watch((e, at) => grantDayPass(e, f.id, at)),
      warmAds: () => rewardedAds.prepare(),
    };
  }, [entitlements, wallet, listings, now, save, saveWallet, syncOwned]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useEntitlements(): EntitlementsValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useEntitlements must be used inside EntitlementsProvider');
  return v;
}
