import { parseWalletSnapshot, WalletUnavailableError, type WalletSnapshot } from './Wallet';

/** Counts the client reports with a finished match, for missions. The server caps them. */
export interface MatchStats {
  readonly sixes: number;
  readonly captures: number;
  readonly home: number;
}
export const NO_STATS: MatchStats = { sixes: 0, captures: 0, home: 0 };

export interface Mission {
  readonly id: string;
  readonly title: string;
  readonly target: number;
  readonly progress: number;
  readonly claimed: boolean;
  readonly coins: number;
  readonly xp: number;
  readonly gems: number;
}

/** 30 tiers of 150 season XP each; seasons run for a calendar month (UTC). */
export const SEASON_TIERS = 30;
export const SEASON_TIER_XP = 150;
export const SEASON_PREMIUM_GEMS = 250;

/** Mirrors the server's season_tier_reward, so the pass can show every reward. */
export function seasonTierReward(tier: number, premium: boolean): { coins: number; gems: number } {
  return premium
    ? { coins: 150 + 15 * tier, gems: tier % 5 === 0 ? 40 : 8 }
    : { coins: 80 + 10 * tier, gems: tier % 5 === 0 ? 15 : 0 };
}

export interface SeasonState {
  readonly number: number;
  readonly endsAt: string;
  readonly xp: number;
  readonly premium: boolean;
  readonly freeClaimed: readonly number[];
  readonly premiumClaimed: readonly number[];
}

/**
 * Opt-in rewarded ads. The server enforces the same caps per UTC day; the
 * counts in the snapshot say how many of each were already claimed today.
 */
export type AdRewardKind = 'gem' | 'spin' | 'rescue-boost';
export const AD_REWARD_CAPS: Readonly<Record<AdRewardKind, number>> = {
  gem: 5,
  spin: 2,
  'rescue-boost': 1,
};
export const AD_GEM_AMOUNT = 1;
export const AD_RESCUE_BOOST_COINS = 300;
export type AdRewardCounts = Readonly<Record<AdRewardKind, number>>;

export interface RewardsSnapshot {
  readonly missions: readonly Mission[];
  readonly missionsResetAt: string;
  readonly spinsToday: number;
  readonly ads: AdRewardCounts;
  readonly season: SeasonState;
  readonly wallet: WalletSnapshot;
}

/** The lucky wheel, in the order the server's `slot` numbers them. */
export type SpinKind = 'coins' | 'gems' | 'xp';
export const SPIN_SLOTS: readonly { readonly kind: SpinKind; readonly amount: number }[] = [
  { kind: 'coins', amount: 100 },
  { kind: 'coins', amount: 250 },
  { kind: 'coins', amount: 500 },
  { kind: 'coins', amount: 1000 },
  { kind: 'gems', amount: 5 },
  { kind: 'gems', amount: 15 },
  { kind: 'xp', amount: 80 },
];
export const SPINS_PER_DAY = 4;
export const EXTRA_SPIN_GEMS = 10;
export const SPIN_STREAK_BONUS_GEMS = 25;

export interface SpinResult {
  readonly reward: {
    readonly kind: SpinKind;
    readonly amount: number;
    readonly slot: number;
    readonly streakBonus: number;
  };
  readonly spinsToday: number;
  readonly wallet: WalletSnapshot;
}

export interface TournamentEntry {
  readonly rank: number;
  readonly userId: string;
  readonly points: number;
  readonly wins: number;
  readonly username: string | null;
  readonly displayName: string | null;
  readonly avatar: string | null;
}

export interface TournamentView {
  readonly week: string;
  readonly endsAt: string;
  readonly top: readonly TournamentEntry[];
  readonly me: {
    readonly points: number;
    readonly wins: number;
    readonly games: number;
    readonly rank: number | null;
  };
  readonly lastWeek: {
    readonly week: string;
    readonly rank: number;
    readonly prize: { readonly coins: number; readonly gems: number };
    readonly claimed: boolean;
  } | null;
}

/** Tournament points: 3 for an online win, 1 for any finished online match. */
export const TOURNAMENT_WIN_POINTS = 3;
export const TOURNAMENT_PLAYED_POINTS = 1;

// --- leagues -----------------------------------------------------------------
// Weekly divisions settled from the tournament points. Mirrors the server's
// league_rules and league_promotion_gems in 0022_leagues.sql.

export const LEAGUE_DIVISIONS = ['Bronze', 'Silver', 'Gold', 'Diamond', 'Legend'] as const;
export type LeagueDivision = 1 | 2 | 3 | 4 | 5;
export const leagueName = (division: number): string =>
  LEAGUE_DIVISIONS[Math.min(Math.max(division, 1), 5) - 1]!;
/** Gems the first arrival in a division pays (index = division - 1). */
export const LEAGUE_PROMOTION_GEMS = [0, 15, 25, 40, 60] as const;
/** A Legend week at or above the promotion line pays this, every time. */
export const LEGEND_WEEKLY_GEMS = 25;
export const LEGEND_BONUS_POINTS = 30;

export interface LeagueView {
  readonly division: number;
  readonly bestDivision: number;
  readonly week: string;
  readonly endsAt: string;
  readonly points: number;
  readonly wins: number;
  readonly games: number;
  /** Points this week that promote; null at the top. */
  readonly promoteAt: number | null;
  /** Points under which the week relegates; null at the bottom. */
  readonly demoteBelow: number | null;
  /** Filled when this read settled a finished week. */
  readonly lastResult: {
    readonly week: string;
    readonly points: number;
    readonly from: number;
    readonly to: number;
    readonly gems: number;
  } | null;
}

/** Mirrors the server's tournament_prize. */
export function tournamentPrize(rank: number): { coins: number; gems: number } {
  if (rank === 1) return { coins: 3000, gems: 60 };
  if (rank <= 3) return { coins: 1500, gems: 30 };
  if (rank <= 10) return { coins: 800, gems: 15 };
  if (rank <= 50) return { coins: 300, gems: 5 };
  return { coins: 100, gems: 0 };
}

// --- parsing: server rows are validated before the app trusts them ----------

const bad = () => new WalletUnavailableError('Received malformed rewards from the server.');
const row = (v: unknown): Record<string, unknown> => {
  if (!v || typeof v !== 'object') throw bad();
  return v as Record<string, unknown>;
};
const int = (v: unknown): number => {
  if (typeof v !== 'number' || !Number.isFinite(v)) throw bad();
  return Math.floor(v);
};
const str = (v: unknown): string => {
  if (typeof v !== 'string') throw bad();
  return v;
};
const ints = (v: unknown): number[] => (Array.isArray(v) ? v.map(int) : []);
const optStr = (v: unknown): string | null => (typeof v === 'string' ? v : null);

function parseMission(v: unknown): Mission {
  const r = row(v);
  return {
    id: str(r.id),
    title: str(r.title),
    target: int(r.target),
    progress: int(r.progress),
    claimed: r.claimed === true,
    coins: int(r.coins),
    xp: int(r.xp),
    gems: int(r.gems),
  };
}

export function parseRewards(v: unknown): RewardsSnapshot {
  const r = row(v);
  const season = row(r.season);
  const ads = (r.ads && typeof r.ads === 'object' ? r.ads : {}) as Record<string, unknown>;
  const adCount = (k: AdRewardKind) => (typeof ads[k] === 'number' ? Math.floor(ads[k]) : 0);
  return {
    missions: Array.isArray(r.missions) ? r.missions.map(parseMission) : [],
    missionsResetAt: str(r.missionsResetAt),
    spinsToday: int(r.spinsToday),
    ads: { gem: adCount('gem'), spin: adCount('spin'), 'rescue-boost': adCount('rescue-boost') },
    season: {
      number: int(season.number),
      endsAt: str(season.endsAt),
      xp: int(season.xp),
      premium: season.premium === true,
      freeClaimed: ints(season.freeClaimed),
      premiumClaimed: ints(season.premiumClaimed),
    },
    wallet: parseWalletSnapshot(r.wallet),
  };
}

export function parseSpin(v: unknown): SpinResult {
  const r = row(v);
  const reward = row(r.reward);
  const kind = str(reward.kind);
  if (kind !== 'coins' && kind !== 'gems' && kind !== 'xp') throw bad();
  return {
    reward: {
      kind,
      amount: int(reward.amount),
      slot: int(reward.slot),
      streakBonus: int(reward.streakBonus ?? 0),
    },
    spinsToday: int(r.spinsToday),
    wallet: parseWalletSnapshot(r.wallet),
  };
}

export function parseLeague(v: unknown): LeagueView {
  const r = row(v);
  const optInt = (x: unknown): number | null => (typeof x === 'number' ? Math.floor(x) : null);
  const last = r.lastResult ? row(r.lastResult) : null;
  return {
    division: int(r.division),
    bestDivision: int(r.bestDivision),
    week: str(r.week),
    endsAt: str(r.endsAt),
    points: int(r.points),
    wins: int(r.wins),
    games: int(r.games),
    promoteAt: optInt(r.promoteAt),
    demoteBelow: optInt(r.demoteBelow),
    lastResult: last
      ? {
          week: str(last.week),
          points: int(last.points),
          from: int(last.from),
          to: int(last.to),
          gems: int(last.gems),
        }
      : null,
  };
}

export function parseTournament(v: unknown): TournamentView {
  const r = row(v);
  const me = row(r.me);
  const last = r.lastWeek ? row(r.lastWeek) : null;
  return {
    week: str(r.week),
    endsAt: str(r.endsAt),
    top: (Array.isArray(r.top) ? r.top : []).map((e) => {
      const x = row(e);
      return {
        rank: int(x.rank),
        userId: str(x.userId),
        points: int(x.points),
        wins: int(x.wins),
        username: optStr(x.username),
        displayName: optStr(x.displayName),
        avatar: optStr(x.avatar),
      };
    }),
    me: {
      points: int(me.points),
      wins: int(me.wins),
      games: int(me.games),
      rank: typeof me.rank === 'number' ? me.rank : null,
    },
    lastWeek: last
      ? {
          week: str(last.week),
          rank: int(last.rank),
          prize: { coins: int(row(last.prize).coins), gems: int(row(last.prize).gems) },
          claimed: last.claimed === true,
        }
      : null,
  };
}
