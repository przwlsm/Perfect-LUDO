/** What the club pays and gives. The server enforces the same numbers. */
export const DAILY_GIFT_COINS = 250;
export const WIN_COINS = 150;
export const PLAYED_COINS = 40;
/** Looks every player has without buying them, signed in or not. */
export const FREE_ITEMS: readonly string[] = ['classic', 'ivory'];

/**
 * An account's wallet as the server holds it. Coins, inventory, the daily
 * gift and the stats live here for signed-in members; the device only keeps
 * a mirror of the last snapshot it saw.
 */
export interface WalletSnapshot {
  readonly coins: number;
  readonly owned: readonly string[];
  /** Calendar day (UTC, `YYYY-MM-DD`) of the last claimed gift, if any. */
  readonly lastGift: string | null;
  readonly games: number;
  readonly wins: number;
  readonly streak: number;
  readonly bestStreak: number;
}

/**
 * The server answered and said no: wrong price, not enough coins, gift
 * already claimed, guest session, unknown item. Retrying the same request
 * will not help, so callers show the message and stop.
 */
export class WalletRefusedError extends Error {
  readonly kind = 'refused';
  constructor(message: string) {
    super(message);
    this.name = 'WalletRefusedError';
  }
}

/**
 * The server could not be reached or the session needs refreshing. Nothing
 * is known about whether the request went through, so a caller either
 * retries later (rewards are idempotent) or re-reads the wallet.
 */
export class WalletUnavailableError extends Error {
  readonly kind = 'unavailable';
  constructor(message: string) {
    super(message);
    this.name = 'WalletUnavailableError';
  }
}

/** Coins need an account: guests and signed-out players are sent to sign in. */
export class SignInRequiredError extends Error {
  readonly kind = 'sign_in_required';
  constructor(message = 'Sign in to use coins and unlock new looks.') {
    super(message);
    this.name = 'SignInRequiredError';
  }
}

const count = (value: unknown): number | null =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;

/** Validates a wallet row from the server before the app trusts it. */
export function parseWalletSnapshot(raw: unknown): WalletSnapshot {
  const r = raw as Record<string, unknown> | null;
  const coins = count(r?.coins);
  const games = count(r?.games);
  const wins = count(r?.wins);
  const streak = count(r?.streak);
  const bestStreak = count(r?.bestStreak);
  const owned = Array.isArray(r?.owned) ? (r.owned as unknown[]) : null;
  if (
    !r ||
    coins === null ||
    games === null ||
    wins === null ||
    streak === null ||
    bestStreak === null ||
    owned === null ||
    !owned.every((id) => typeof id === 'string') ||
    (r.lastGift !== null &&
      r.lastGift !== undefined &&
      !(typeof r.lastGift === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.lastGift)))
  ) {
    throw new WalletUnavailableError('Received a malformed wallet from the server.');
  }
  return {
    coins,
    owned: owned as string[],
    lastGift: (r.lastGift as string | null | undefined) ?? null,
    games,
    wins,
    streak,
    bestStreak,
  };
}
