import type { Look } from './Look';

/** How long a look stays open after the player watches a rewarded video. */
export const AD_PASS_HOURS = 24;
/** Rewarded videos a player may watch per local day. Generous, but not a grind. */
export const AD_PASSES_PER_DAY = 6;

/**
 * What this install may use. Plus is restored from the store account; day
 * passes and the tip count live on the device only.
 */
export interface Entitlements {
  readonly plus: boolean;
  /** Look id → epoch ms when its day pass ends. */
  readonly passes: Readonly<Record<string, number>>;
  /** Rewarded videos watched on `passDay` (a local `YYYY-MM-DD`). */
  readonly passesToday: number;
  readonly passDay: string;
  /** Tips given on this device, for the thank-you on the support card. */
  readonly tips: number;
}

export const NO_ENTITLEMENTS: Entitlements = {
  plus: false,
  passes: {},
  passesToday: 0,
  passDay: '',
  tips: 0,
};

export function localDay(now: Date): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isLookOpen(e: Entitlements, look: Look, now: number): boolean {
  if (!look.premium || e.plus) return true;
  return (e.passes[look.id] ?? 0) > now;
}

/** Ms left on a look's day pass, 0 when it has none. */
export function passRemaining(e: Entitlements, lookId: string, now: number): number {
  return Math.max(0, (e.passes[lookId] ?? 0) - now);
}

export function passesLeftToday(e: Entitlements, now: Date): number {
  return e.passDay === localDay(now)
    ? Math.max(0, AD_PASSES_PER_DAY - e.passesToday)
    : AD_PASSES_PER_DAY;
}

/** The entitlements after a finished rewarded video for `lookId`. */
export function grantDayPass(e: Entitlements, lookId: string, now: Date): Entitlements {
  const today = localDay(now);
  const watched = e.passDay === today ? e.passesToday : 0;
  const passes: Record<string, number> = {};
  // Expired passes are dropped so the stored object never grows.
  for (const [id, until] of Object.entries(e.passes)) {
    if (until > now.getTime()) passes[id] = until;
  }
  passes[lookId] = now.getTime() + AD_PASS_HOURS * 3_600_000;
  return { ...e, passes, passDay: today, passesToday: watched + 1 };
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
    return {
      plus: v.plus === true,
      passes,
      passesToday: typeof v.passesToday === 'number' ? Math.max(0, v.passesToday) : 0,
      passDay: typeof v.passDay === 'string' ? v.passDay : '',
      tips: typeof v.tips === 'number' ? Math.max(0, v.tips) : 0,
    };
  } catch {
    return NO_ENTITLEMENTS;
  }
}
