/**
 * The Collection Room's achievements: twenty-four, each with four tiers.
 * Progress is counted on the server (0034) from the game's own tables; this
 * catalogue is what the room draws and names. Thresholds mirror the server's
 * `achievements` table (the rules test checks they agree).
 */
export type AchievementMode = 'sum' | 'max';

export interface AchievementDef {
  readonly id: string;
  readonly event: string;
  readonly mode: AchievementMode;
  /** Bronze, silver, gold, platinum. */
  readonly thresholds: readonly [number, number, number, number];
  /** Which shelf it sits on in the room. */
  readonly group: 'play' | 'arena' | 'club' | 'royal';
  /** An Ionicons name for the medal's face. */
  readonly icon: string;
}

export const ACHIEVEMENT_TIERS = ['bronze', 'silver', 'gold', 'platinum'] as const;
export type AchievementTier = (typeof ACHIEVEMENT_TIERS)[number];

export const ACHIEVEMENTS = [
  {
    id: 'first-blood',
    event: 'captures',
    mode: 'sum',
    thresholds: [1, 25, 100, 500],
    group: 'play',
    icon: 'flash',
  },
  {
    id: 'six-appeal',
    event: 'sixes',
    mode: 'sum',
    thresholds: [10, 100, 500, 2000],
    group: 'play',
    icon: 'dice',
  },
  {
    id: 'homecoming',
    event: 'home',
    mode: 'sum',
    thresholds: [4, 40, 200, 1000],
    group: 'play',
    icon: 'home',
  },
  {
    id: 'veteran',
    event: 'games',
    mode: 'sum',
    thresholds: [10, 100, 500, 2000],
    group: 'play',
    icon: 'medal',
  },
  {
    id: 'hot-streak',
    event: 'best_streak',
    mode: 'max',
    thresholds: [3, 5, 10, 20],
    group: 'play',
    icon: 'flame',
  },
  {
    id: 'marathon',
    event: 'daily_games',
    mode: 'max',
    thresholds: [5, 10, 20, 40],
    group: 'play',
    icon: 'infinite',
  },
  {
    id: 'champion',
    event: 'win_online',
    mode: 'sum',
    thresholds: [1, 25, 100, 500],
    group: 'arena',
    icon: 'trophy',
  },
  {
    id: 'bot-buster',
    event: 'win_bot',
    mode: 'sum',
    thresholds: [5, 50, 200, 1000],
    group: 'arena',
    icon: 'hardware-chip',
  },
  {
    id: 'full-house',
    event: 'full_house',
    mode: 'sum',
    thresholds: [1, 5, 25, 100],
    group: 'arena',
    icon: 'people',
  },
  {
    id: 'speed-demon',
    event: 'speed',
    mode: 'sum',
    thresholds: [1, 10, 50, 200],
    group: 'arena',
    icon: 'speedometer',
  },
  {
    id: 'hunter',
    event: 'hunter',
    mode: 'sum',
    thresholds: [1, 10, 50, 200],
    group: 'arena',
    icon: 'skull',
  },
  {
    id: 'team-player',
    event: 'team',
    mode: 'sum',
    thresholds: [1, 10, 50, 200],
    group: 'arena',
    icon: 'people-circle',
  },
  {
    id: 'high-roller',
    event: 'high_roller',
    mode: 'sum',
    thresholds: [1, 10, 50, 200],
    group: 'arena',
    icon: 'cash',
  },
  {
    id: 'podium-regular',
    event: 'podium',
    mode: 'sum',
    thresholds: [1, 5, 20, 50],
    group: 'arena',
    icon: 'podium',
  },
  {
    id: 'diamond-hands',
    event: 'division',
    mode: 'max',
    thresholds: [2, 3, 4, 5],
    group: 'arena',
    icon: 'diamond',
  },
  {
    id: 'crowd-favourite',
    event: 'gift_received',
    mode: 'sum',
    thresholds: [1, 25, 100, 500],
    group: 'club',
    icon: 'rose',
  },
  {
    id: 'generous-heart',
    event: 'gift_sent',
    mode: 'sum',
    thresholds: [1, 10, 50, 250],
    group: 'club',
    icon: 'heart',
  },
  {
    id: 'social-butterfly',
    event: 'friends',
    mode: 'max',
    thresholds: [1, 5, 25, 100],
    group: 'club',
    icon: 'chatbubbles',
  },
  {
    id: 'lucky-star',
    event: 'spins',
    mode: 'sum',
    thresholds: [1, 30, 150, 600],
    group: 'club',
    icon: 'star',
  },
  {
    id: 'daily-devotion',
    event: 'daily_gift',
    mode: 'sum',
    thresholds: [7, 30, 100, 365],
    group: 'club',
    icon: 'calendar',
  },
  {
    id: 'rising-star',
    event: 'level',
    mode: 'max',
    thresholds: [5, 10, 20, 30],
    group: 'club',
    icon: 'trending-up',
  },
  {
    id: 'collector',
    event: 'items',
    mode: 'max',
    thresholds: [3, 10, 25, 60],
    group: 'club',
    icon: 'color-palette',
  },
  {
    id: 'throne-collector',
    event: 'thrones',
    mode: 'max',
    thresholds: [1, 3, 5, 8],
    group: 'royal',
    icon: 'ribbon',
  },
  {
    id: 'kingmaker',
    event: 'cups_won',
    mode: 'sum',
    thresholds: [1, 10, 50, 200],
    group: 'royal',
    icon: 'sparkles',
  },
] as const satisfies readonly AchievementDef[];

export type AchievementId = (typeof ACHIEVEMENTS)[number]['id'];
export type AchievementGroup = AchievementDef['group'];
export const ACHIEVEMENT_GROUPS = ['play', 'arena', 'club', 'royal'] as const;

export function getAchievement(id: string): (typeof ACHIEVEMENTS)[number] | null {
  return ACHIEVEMENTS.find((a) => a.id === id) ?? null;
}

/** The next threshold to reach, or null once platinum is held. */
export function nextThreshold(def: AchievementDef, tier: number): number | null {
  return tier >= 4 ? null : def.thresholds[tier]!;
}

/** Progress toward the next tier as 0..1 (1 at platinum). */
export function tierProgress(def: AchievementDef, tier: number, progress: number): number {
  const target = nextThreshold(def, tier);
  if (target === null) return 1;
  const floor = tier === 0 ? 0 : def.thresholds[tier - 1]!;
  return Math.max(0, Math.min(1, (progress - floor) / Math.max(1, target - floor)));
}
