/**
 * Entry stakes for online tables. Mirrors `valid_stake`, `stake_prize` and
 * `turn_seconds` in supabase/migrations/0013_stakes_and_timers.sql.
 */
export const STAKES = [0, 100, 500, 2000, 10000, 50000] as const;
export type Stake = (typeof STAKES)[number];

export function isStake(value: unknown): value is Stake {
  return typeof value === 'number' && (STAKES as readonly number[]).includes(value);
}

/** The level a seat at `stake` needs. Mirrors the server's stake_min_level. */
export function stakeMinLevel(stake: number): number {
  return stake >= 50000 ? 20 : stake >= 10000 ? 10 : 1;
}

/** Private link rooms are capped so big sums cannot be funnelled to a chosen account. */
export const MAX_PRIVATE_STAKE = 2000;

/** The winner's share of a pool: 90%, the rest leaves the economy. */
export function stakePrize(pool: number): number {
  return Math.floor(Math.max(0, pool) * 0.9);
}

/** What the winner of a full table at `stake` collects. */
export function tablePrize(stake: number, players: number): number {
  return stakePrize(stake * players);
}

/** Seconds a player has for each roll and each move in an online match. */
export const TURN_SECONDS = 20;
