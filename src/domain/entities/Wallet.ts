/** What the club pays and gives. The server enforces the same numbers. */
export const DAILY_GIFT_COINS = 250;
/**
 * Match rewards: online pays far more than the computer, because online
 * results are verified by the server and bot games are only the device's
 * word (and capped at BOT_PAID_GAMES_PER_DAY paid games a day).
 */
export const REWARDS = {
  online: { win: { coins: 250, xp: 120 }, played: { coins: 60, xp: 50 } },
  bot: { win: { coins: 50, xp: 40 }, played: { coins: 15, xp: 15 } },
} as const;
export const BOT_PAID_GAMES_PER_DAY = 25;
/** @deprecated names kept for the offline guest ledger; see REWARDS. */
export const WIN_COINS = REWARDS.bot.win.coins;
export const PLAYED_COINS = REWARDS.bot.played.coins;

/** Where a player is on the level curve: level L needs 100 + 40*(L-1) XP to pass. */
export interface LevelInfo {
  readonly level: number;
  /** XP earned inside the current level. */
  readonly into: number;
  /** XP the current level needs in total. */
  readonly need: number;
}

/** Mirrors the server's level_info, for showing progress between refreshes. */
export function levelInfo(xp: number): LevelInfo {
  let level = 1;
  let need = 100;
  let rest = Math.max(0, Math.floor(xp));
  while (rest >= need) {
    rest -= need;
    level += 1;
    need = 100 + 40 * (level - 1);
  }
  return { level, into: rest, need };
}
/** Looks every player has without buying them, signed in or not. */
export const FREE_ITEMS: readonly string[] = ['classic', 'ivory', 'triangle-homes'];

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
  readonly gems: number;
  readonly xp: number;
  readonly level: LevelInfo;
  /** UTC day of the last free lucky spin, if any. */
  readonly lastSpin: string | null;
  /** Consecutive days with a free spin. */
  readonly spinStreak: number;
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
  // Fields added by migration 0012; an older server simply lacks them.
  const xp = count(r.xp) ?? 0;
  const lvl = r.level as Record<string, unknown> | undefined;
  const level =
    lvl && count(lvl.level) && count(lvl.into) !== null && count(lvl.need)
      ? { level: count(lvl.level)!, into: count(lvl.into)!, need: count(lvl.need)! }
      : levelInfo(xp);
  return {
    coins,
    owned: owned as string[],
    lastGift: (r.lastGift as string | null | undefined) ?? null,
    games,
    wins,
    streak,
    bestStreak,
    gems: count(r.gems) ?? 0,
    xp,
    level,
    lastSpin: typeof r.lastSpin === 'string' ? r.lastSpin : null,
    spinStreak: count(r.spinStreak) ?? 0,
  };
}
