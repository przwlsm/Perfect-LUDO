import type { SupabaseClient } from '@supabase/supabase-js';
import type { IUserProgressRepository, UserProfile } from '@/domain';

const TABLE = 'profiles';
const COLUMNS = 'uid, display_name, coins, games_played, games_won, streak, best_streak';

/**
 * Rows are shaped by the database, not by us, so every read is validated
 * before becoming a domain object — schema drift or a partial row should
 * fail here, not surface as NaN coins three screens later.
 */
function toProfile(row: unknown): UserProfile {
  const r = row as Record<string, unknown> | null;
  const int = (value: unknown): number | null =>
    typeof value === 'number' && Number.isFinite(value) ? Number(value) : null;

  const coins = int(r?.coins);
  const gamesPlayed = int(r?.games_played);
  const gamesWon = int(r?.games_won);
  const streak = int(r?.streak);
  const bestStreak = int(r?.best_streak);

  if (
    !r ||
    typeof r.uid !== 'string' ||
    coins === null ||
    gamesPlayed === null ||
    gamesWon === null ||
    streak === null ||
    bestStreak === null
  ) {
    throw new Error('Received a malformed profile row from Supabase.');
  }

  return {
    uid: r.uid,
    displayName: typeof r.display_name === 'string' ? r.display_name : null,
    coins,
    gamesPlayed,
    gamesWon,
    streak,
    bestStreak,
  };
}

export class SupabaseUserProgressRepository implements IUserProgressRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getProfile(uid: string): Promise<UserProfile | null> {
    const { data, error } = await this.client
      .from(TABLE)
      .select(COLUMNS)
      .eq('uid', uid)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toProfile(data) : null;
  }

  /**
   * Only the display name: migration 0007 grants the client no other column,
   * so writing coins or stats here would be refused by the database.
   */
  async saveDisplayName(uid: string, displayName: string | null): Promise<void> {
    const { error } = await this.client
      .from(TABLE)
      .upsert({ uid, display_name: displayName }, { onConflict: 'uid' });
    if (error) throw new Error(error.message);
  }
}
