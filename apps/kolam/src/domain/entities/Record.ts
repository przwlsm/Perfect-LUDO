import { NO_PROGRESS, parseProgress, type Progress } from 'app-kit';

/** A board left part-way, to pick up where the player stopped. */
export interface SavedGame {
  /** Edge marks as text ("0" open, "1" line, "2" cross). */
  readonly marks: string;
  readonly seconds: number;
  readonly hints: number;
}

/** How a daily kolam went, for the archive and its share line. */
export interface DailyResult {
  readonly seconds: number;
  readonly hints: number;
}

/** Everything the player has done, kept on the device. */
export interface PlayRecord {
  readonly progress: Progress;
  /** The level last opened (0 before the first). */
  readonly last: number;
  /** Boards in progress by id ("12", "d215"); the most recent few are kept. */
  readonly saves: Readonly<Record<string, SavedGame>>;
  /** Solved daily kolams by number. */
  readonly dailies: Readonly<Record<number, DailyResult>>;
}

export const MAX_SAVES = 12;

export const NO_RECORD: PlayRecord = { progress: NO_PROGRESS, last: 0, saves: {}, dailies: {} };

/** Keeps a save (or drops it, with null), forgetting the oldest beyond MAX_SAVES. */
export function withSave(r: PlayRecord, id: string, save: SavedGame | null): PlayRecord {
  const saves: Record<string, SavedGame> = {};
  for (const [k, v] of Object.entries(r.saves)) if (k !== id) saves[k] = v;
  if (save) saves[id] = save;
  const keys = Object.keys(saves);
  for (const k of keys.slice(0, Math.max(0, keys.length - MAX_SAVES))) delete saves[k];
  return { ...r, saves };
}

export function parseRecord(raw: string | null): PlayRecord {
  if (!raw) return NO_RECORD;
  try {
    const v = JSON.parse(raw) as {
      progress?: unknown;
      last?: unknown;
      saves?: unknown;
      dailies?: unknown;
    };
    const progress = parseProgress(v.progress ? JSON.stringify(v.progress) : null);
    const num = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? Math.max(0, x) : 0);
    const saves: Record<string, SavedGame> = {};
    if (v.saves && typeof v.saves === 'object') {
      for (const [id, s] of Object.entries(v.saves as Record<string, Partial<SavedGame>>)) {
        if (s && typeof s.marks === 'string') {
          saves[id] = { marks: s.marks, seconds: num(s.seconds), hints: num(s.hints) };
        }
      }
    }
    const dailies: Record<number, DailyResult> = {};
    if (v.dailies && typeof v.dailies === 'object') {
      for (const [k, d] of Object.entries(v.dailies as Record<string, Partial<DailyResult>>)) {
        const n = Number(k);
        if (Number.isInteger(n) && n > 0 && d) {
          dailies[n] = { seconds: num(d.seconds), hints: num(d.hints) };
        }
      }
    }
    return { progress, last: Math.floor(num(v.last)), saves, dailies };
  } catch {
    return NO_RECORD;
  }
}
