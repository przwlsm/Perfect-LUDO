import { localDay } from 'app-kit';

/**
 * Free help every player gets each day: a hint (the next good pour) or an
 * extra cup both use one. More come from a video (one each) or Plus
 * (unlimited).
 */
export const FREE_HINTS_PER_DAY = 3;

export interface HintWallet {
  /** Local day (`YYYY-MM-DD`) the free hints were last counted on. */
  readonly day: string;
  readonly used: number;
}

export const FRESH_WALLET: HintWallet = { day: '', used: 0 };

export function freeHintsLeft(w: HintWallet, now: Date): number {
  return w.day === localDay(now) ? Math.max(0, FREE_HINTS_PER_DAY - w.used) : FREE_HINTS_PER_DAY;
}

/** Uses one of today's free hints; null when they are gone. */
export function spendFreeHint(w: HintWallet, now: Date): HintWallet | null {
  if (freeHintsLeft(w, now) <= 0) return null;
  const today = localDay(now);
  return { day: today, used: (w.day === today ? w.used : 0) + 1 };
}

export function parseWallet(raw: string | null): HintWallet {
  if (!raw) return FRESH_WALLET;
  try {
    const v = JSON.parse(raw) as Partial<HintWallet>;
    return {
      day: typeof v.day === 'string' ? v.day : '',
      used: typeof v.used === 'number' && Number.isFinite(v.used) ? Math.max(0, v.used) : 0,
    };
  } catch {
    return FRESH_WALLET;
  }
}
