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
  recordDailyResult,
  type DailyResult,
  type PlayerRecord,
} from '@/domain/entities/Record';
import { todayNumber } from '@/application/levels/daily';
import { storage } from '@/config/container';

const KEY = 'monsoon.record.v1';

interface RecordValue {
  readonly record: PlayerRecord;
  readonly loaded: boolean;
  /** Stars earned on level `n`, 0 when unsolved. */
  starsOf(n: number): number;
  isOpen(n: number): boolean;
  readonly totalStars: number;
  readonly streak: number;
  solveLevel(n: number, stars: number): void;
  /** Records a solved daily; it counts towards the streak only on its own day. */
  solveDaily(n: number, result: DailyResult): void;
  setLast(n: number): void;
}

const Ctx = createContext<RecordValue | null>(null);

export function RecordProvider({ children }: PropsWithChildren) {
  const [record, setRecord] = useState<PlayerRecord>(NO_RECORD);
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

  const save = useCallback((next: PlayerRecord) => {
    latest.current = next;
    setRecord(next);
    void storage.setItem(KEY, JSON.stringify(next)).catch(() => undefined);
  }, []);

  const value = useMemo<RecordValue>(() => {
    const now = new Date();
    return {
      record,
      loaded,
      starsOf: (n) => record.progress.stars[n] ?? 0,
      isOpen: (n) => isLevelOpen(record.progress, n),
      totalStars: totalStars(record.progress),
      streak: dailyStreak(record.progress, now),
      solveLevel(n, stars) {
        const r = latest.current;
        save({ ...r, progress: recordLevel(r.progress, n, stars) });
      },
      solveDaily(n, result) {
        const at = new Date();
        let r = recordDailyResult(latest.current, n, result);
        if (n === todayNumber(at)) r = { ...r, progress: recordDaily(r.progress, at) };
        save(r);
      },
      setLast(n) {
        if (latest.current.last !== n) save({ ...latest.current, last: n });
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
