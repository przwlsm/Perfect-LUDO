import { NO_PROGRESS, parseProgress, type Progress } from 'app-kit';

/** A daily puzzle's best result on this device. */
export interface DailyResult {
  readonly seconds: number;
  readonly hints: number;
  readonly moves: number;
  /** Lamps on that day's board, for the share text. */
  readonly lamps: number;
}

/**
 * The player's record: stars per level and the daily streak (app-kit's
 * Progress), plus every daily puzzle solved here, archive ones included,
 * and the level they were last on.
 */
export interface PlayerRecord {
  readonly progress: Progress;
  readonly dailies: Readonly<Record<number, DailyResult>>;
  readonly last: number;
}

export const NO_RECORD: PlayerRecord = { progress: NO_PROGRESS, dailies: {}, last: 1 };

/** Keeps the better of two results: fewer hints first, then the faster time. */
export function recordDailyResult(r: PlayerRecord, n: number, result: DailyResult): PlayerRecord {
  const prev = r.dailies[n];
  const better =
    !prev ||
    result.hints < prev.hints ||
    (result.hints === prev.hints && result.seconds < prev.seconds);
  return better ? { ...r, dailies: { ...r.dailies, [n]: result } } : r;
}

export function parseRecord(raw: string | null): PlayerRecord {
  if (!raw) return NO_RECORD;
  try {
    const v = JSON.parse(raw) as { progress?: unknown; dailies?: unknown; last?: unknown };
    const num = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? Math.max(0, x) : 0);
    const dailies: Record<number, DailyResult> = {};
    if (v.dailies && typeof v.dailies === 'object') {
      for (const [k, d] of Object.entries(v.dailies as Record<string, Partial<DailyResult>>)) {
        const n = Number(k);
        if (!Number.isInteger(n) || n < 1 || !d || typeof d !== 'object') continue;
        dailies[n] = {
          seconds: num(d.seconds),
          hints: num(d.hints),
          moves: num(d.moves),
          lamps: num(d.lamps) || 1,
        };
      }
    }
    return {
      progress: parseProgress(JSON.stringify(v.progress ?? null)),
      dailies,
      last: typeof v.last === 'number' && v.last >= 1 ? Math.floor(v.last) : 1,
    };
  } catch {
    return NO_RECORD;
  }
}
