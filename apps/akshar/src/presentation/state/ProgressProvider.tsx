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
import {
  freeHintsLeft,
  NO_PROGRESS,
  parseProgress,
  recordAttempt,
  spendFreeHint,
  starsOf,
  type Progress,
} from '@/domain/entities/Progress';
import type { ScriptId } from '@/domain/entities/Script';
import { storage } from '@/config/container';

const KEY = 'akshar.progress.v1';

interface ProgressValue {
  readonly progress: Progress;
  readonly loaded: boolean;
  /** Records a checked letter; returns the stars it had before. */
  record(script: ScriptId, char: string, stars: number): number;
  freeHints(): number;
  /** Uses one of today's free hints; false when none is left. */
  takeFreeHint(): boolean;
}

const Ctx = createContext<ProgressValue | null>(null);

export function ProgressProvider({ children }: PropsWithChildren) {
  const [progress, setProgress] = useState<Progress>(NO_PROGRESS);
  const [loaded, setLoaded] = useState(false);
  const latest = useRef(progress);

  useEffect(() => {
    let live = true;
    void storage
      .getItem(KEY)
      .catch(() => null)
      .then((raw) => {
        if (!live) return;
        latest.current = parseProgress(raw);
        setProgress(latest.current);
        setLoaded(true);
      });
    return () => {
      live = false;
    };
  }, []);

  const commit = useCallback((next: Progress) => {
    latest.current = next;
    setProgress(next);
    void storage.setItem(KEY, JSON.stringify(next)).catch(() => undefined);
  }, []);

  const value = useMemo<ProgressValue>(
    () => ({
      progress,
      loaded,
      record(script, char, stars) {
        const before = starsOf(latest.current, script, char);
        commit(recordAttempt(latest.current, script, char, stars, new Date()));
        return before;
      },
      freeHints: () => freeHintsLeft(progress, new Date()),
      takeFreeHint() {
        const next = spendFreeHint(latest.current, new Date());
        if (!next) return false;
        commit(next);
        return true;
      },
    }),
    [progress, loaded, commit],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useProgress(): ProgressValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useProgress must be used inside ProgressProvider');
  return v;
}
