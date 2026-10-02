/** What the club pays and gives. The server enforces the same numbers. */

/** Flat daily gift for the offline guest ledger; members get the streak calendar. */
export const DAILY_GIFT_COINS = 250;
/** The member streak calendar: day 1..7 coins, then the cycle repeats. */
export const GIFT_CYCLE_COINS = [100, 150, 200, 300, 400, 500, 750] as const;
/** Day 7 of the calendar also pays this many gems. */
export const GIFT_STREAK_GEMS = 25;
/** The comeback rescue: once a day, below the threshold, members only. */
export const RESCUE_COINS = 300;
export const RESCUE_THRESHOLD = 100;
/** The piggy bank fills 1:1 with granted XP, up to this many coins. */
export const PIGGY_CAP = 15000;
/** What Ludo Club adds to the daily gift, every day of membership. */
export const CLUB_DAILY_GEMS = 10;

/**
 * The guest vault: everything a guest earns waits in a locked vault and is
 * paid onto the account they eventually create. The server accepts the
 * claim once per account, capped, so the client-held number stays honest.
 */
export const GUEST_VAULT_CAP = 5000;
export const GUEST_VAULT_WIN = 50;
export const GUEST_VAULT_PLAYED = 0;
export const GUEST_VAULT_AD_COINS = 150;
export const GUEST_VAULT_ADS_PER_DAY = 3;
/** How long a guest's watch-an-ad board trial lasts. */
export const TRIAL_HOURS = 24;

/** Where the streak calendar stands: which day pays next (or paid today). */
export function giftCalendar(
  lastGift: string | null,
  giftStreak: number,
  todayUtc: string,
): { day: number; claimedToday: boolean } {
  const claimedToday = lastGift !== null && lastGift >= todayUtc;
  if (claimedToday) return { day: ((Math.max(giftStreak, 1) - 1) % 7) + 1, claimedToday };
  const yesterday = new Date(new Date(`${todayUtc}T00:00:00Z`).getTime() - 86400000)
    .toISOString()
    .slice(0, 10);
  const continues = lastGift === yesterday;
  return { day: continues ? (giftStreak % 7) + 1 : 1, claimedToday };
}
/**
 * Match rewards: winning is what pays. Free online tables pay by finishing
 * place (see placementCoins); merely finishing pays XP but no coins. Bot
 * games are the device's word, so their pay is small and capped at
 * BOT_PAID_GAMES_PER_DAY paid games a day.
 */
export const REWARDS = {
  online: { win: { coins: 100, xp: 120 }, played: { coins: 0, xp: 50 } },
  bot: { win: { coins: 50, xp: 40 }, played: { coins: 0, xp: 15 } },
} as const;
export const BOT_PAID_GAMES_PER_DAY = 25;

/**
 * What a finishing place pays at a free online table. Second place needs at
 * least three seats, third at least four; last takes nothing, and neither
 * do quitters. Mirrors the server's placement_coins.
 */
export function placementCoins(rank: number, players: number): number {
  if (rank === 1) return 100;
  if (rank === 2 && players >= 3) return 50;
  if (rank === 3 && players >= 4) return 20;
  return 0;
}
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
  /** Consecutive days the gift was claimed; positions the 7-day calendar. */
  readonly giftStreak: number;
  /** UTC day of the last comeback rescue, if any. */
  readonly lastRescue: string | null;
  /** What the piggy bank holds right now. */
  readonly piggyCoins: number;
  /** When the Ludo Club membership runs out, if it was ever bought. */
  readonly clubUntil: string | null;
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
    giftStreak: count(r.giftStreak) ?? 0,
    lastRescue: typeof r.lastRescue === 'string' ? r.lastRescue : null,
    piggyCoins: count(r.piggyCoins) ?? 0,
    clubUntil: typeof r.clubUntil === 'string' ? r.clubUntil : null,
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
