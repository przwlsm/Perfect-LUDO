/** How long an item stays open after the player watches a rewarded video. */
export const AD_PASS_HOURS = 24;
/** Rewarded videos a player may watch per local day. Generous, but not a grind. */
export const DEFAULT_ADS_PER_DAY = 6;

/**
 * What this install may use. Plus is restored from the store account; day
 * passes, ad counts, hint credit and the tip count live on the device only.
 */
export interface Entitlements {
  readonly plus: boolean;
  /** Item id → epoch ms when its day pass ends. */
  readonly passes: Readonly<Record<string, number>>;
  /** Rewarded videos watched on `adDay` (a local `YYYY-MM-DD`). */
  readonly adsToday: number;
  readonly adDay: string;
  /** Hints earned and not yet used (puzzle apps). */
  readonly hints: number;
  /** Tips given on this device, for the thank-you on the support screen. */
  readonly tips: number;
}

export const NO_ENTITLEMENTS: Entitlements = {
  plus: false,
  passes: {},
  adsToday: 0,
  adDay: '',
  hints: 0,
  tips: 0,
};

export function localDay(now: Date): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Free items are always open; premium ones need Plus or a live day pass. */
export function isOpen(e: Entitlements, item: { id: string; premium: boolean }, now: number): boolean {
  if (!item.premium || e.plus) return true;
  return (e.passes[item.id] ?? 0) > now;
}

/** Ms left on an item's day pass, 0 when it has none. */
export function passRemaining(e: Entitlements, id: string, now: number): number {
  return Math.max(0, (e.passes[id] ?? 0) - now);
}

export function adsLeftToday(e: Entitlements, now: Date, perDay = DEFAULT_ADS_PER_DAY): number {
  return e.adDay === localDay(now) ? Math.max(0, perDay - e.adsToday) : perDay;
}

/** Counts one finished rewarded video against today. */
function countAd(e: Entitlements, now: Date): Entitlements {
  const today = localDay(now);
  return { ...e, adDay: today, adsToday: (e.adDay === today ? e.adsToday : 0) + 1 };
}

/** The entitlements after a finished rewarded video for item `id`: a day pass. */
export function grantDayPass(e: Entitlements, id: string, now: Date): Entitlements {
  const passes: Record<string, number> = {};
  // Expired passes are dropped so the stored object never grows.
  for (const [key, until] of Object.entries(e.passes)) {
    if (until > now.getTime()) passes[key] = until;
  }
  passes[id] = now.getTime() + AD_PASS_HOURS * 3_600_000;
  return { ...countAd(e, now), passes };
}

/** The entitlements after a finished rewarded video for a hint. */
export function grantHint(e: Entitlements, now: Date, count = 1): Entitlements {
  return { ...countAd(e, now), hints: e.hints + count };
}

/** Uses one hint; Plus players have unlimited hints. Returns null when none is left. */
export function spendHint(e: Entitlements): Entitlements | null {
  if (e.plus) return e;
  if (e.hints <= 0) return null;
  return { ...e, hints: e.hints - 1 };
}

/** Parses what was stored, falling back to nothing for anything malformed. */
export function parseEntitlements(raw: string | null): Entitlements {
  if (!raw) return NO_ENTITLEMENTS;
  try {
    const v = JSON.parse(raw) as Partial<Entitlements>;
    const passes: Record<string, number> = {};
    if (v.passes && typeof v.passes === 'object') {
      for (const [id, until] of Object.entries(v.passes)) {
        if (typeof until === 'number' && Number.isFinite(until)) passes[id] = until;
      }
    }
    const count = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) ? Math.max(0, n) : 0);
    return {
      plus: v.plus === true,
      passes,
      adsToday: count(v.adsToday),
      adDay: typeof v.adDay === 'string' ? v.adDay : '',
      hints: count(v.hints),
      tips: count(v.tips),
    };
  } catch {
    return NO_ENTITLEMENTS;
  }
}
