import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { PropsWithChildren } from 'react';
import { dailyStreak, isLevelOpen, recordDaily, recordLevel, totalStars } from 'app-kit';
import {
  NO_RECORD,
  parseRecord,
  withSave,
  type DailyResult,
  type PlayRecord,
  type SavedGame,
} from '@/domain/entities/Record';
import { todayNumber } from '@/application/levels/daily';
import { LEVEL_COUNT } from '@/application/levels/levels';
import { storage } from '@/config/container';

const KEY = 'kolam.record.v1';

interface RecordValue {
  readonly record: PlayRecord;
  readonly loaded: boolean;
  /** Stars earned on level `n`, 0 when unsolved. */
  starsOf(n: number): number;
  isOpen(n: number): boolean;
  /** The level Continue opens: the first unsolved one after the furthest solved. */
  readonly next: number;
  readonly totalStars: number;
  readonly streak: number;
  solveLevel(n: number, stars: number): void;
  /** Records a solved daily kolam; it counts towards the streak only on its own day. */
  solveDaily(n: number, result: DailyResult): void;
  setLast(n: number): void;
  /** Keeps (or with null, drops) a board in progress. */
  keep(id: string, save: SavedGame | null): void;
}

const Ctx = createContext<RecordValue | null>(null);

export function RecordProvider({ children }: PropsWithChildren) {
  const [record, setRecord] = useState<PlayRecord>(NO_RECORD);
  const [loaded, setLoaded] = useState(false);
  const latest = useRef(record);

  useEffect(() => {
    let live = true;
    void storage
      .getItem(KEY)
      .catch(() => null)
      .then((raw) => {
        if (!live) return;
        const r = parseRecord(raw);
        latest.current = r;
        setRecord(r);
        setLoaded(true);
      });
    return () => {
      live = false;
    };
  }, []);

  const save = useCallback((next: PlayRecord) => {
    latest.current = next;
    setRecord(next);
    void storage.setItem(KEY, JSON.stringify(next)).catch(() => undefined);
  }, []);

  const value = useMemo<RecordValue>(() => {
    const now = new Date();
    const solved = Object.keys(record.progress.stars).map(Number);
    let next = 1;
    while (next < LEVEL_COUNT && record.progress.stars[next]) next++;
    if (solved.length && record.last > 0 && !record.progress.stars[record.last]) next = record.last;
    return {
      record,
      loaded,
      starsOf: (n) => record.progress.stars[n] ?? 0,
      isOpen: (n) => isLevelOpen(record.progress, n),
      next,
      totalStars: totalStars(record.progress),
      streak: dailyStreak(record.progress, now),
      solveLevel(n, stars) {
        const r = withSave(latest.current, String(n), null);
        save({ ...r, progress: recordLevel(r.progress, n, stars) });
      },
      solveDaily(n, result) {
        const at = new Date();
        let r = withSave(latest.current, `d${n}`, null);
        const prior = r.dailies[n];
        r = {
          ...r,
          dailies: { ...r.dailies, [n]: prior && prior.hints <= result.hints ? prior : result },
        };
        if (n === todayNumber(at)) r = { ...r, progress: recordDaily(r.progress, at) };
        save(r);
      },
      setLast(n) {
        if (latest.current.last !== n) save({ ...latest.current, last: n });
      },
      keep(id, game) {
        save(withSave(latest.current, id, game));
      },
    };
  }, [record, loaded, save]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRecord(): RecordValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useRecord must be used inside RecordProvider');
  return v;
}
