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
import { AppState } from 'react-native';
import { ink, parsePassport, recordVisit, type Passport } from '@/domain/entities/Passport';
import type { ToyId } from '@/domain/entities/Toy';
import { storage } from '@/config/container';

const KEY = 'quietatlas.passport.v1';

interface PassportValue {
  readonly passport: Passport;
  /** Inks the toy's stamp if it is new; true when it was. */
  ink(toy: ToyId): boolean;
  record(toy: ToyId, seconds: number): void;
}

const Ctx = createContext<PassportValue | null>(null);

export function PassportProvider({ children }: PropsWithChildren) {
  const [passport, setPassport] = useState<Passport>({});
  const latest = useRef(passport);

  useEffect(() => {
    let live = true;
    void storage
      .getItem(KEY)
      .catch(() => null)
      .then((raw) => {
        if (!live) return;
        latest.current = parsePassport(raw);
        setPassport(latest.current);
      });
    return () => {
      live = false;
    };
  }, []);

  const commit = useCallback((next: Passport) => {
    latest.current = next;
    setPassport(next);
    void storage.setItem(KEY, JSON.stringify(next)).catch(() => undefined);
  }, []);

  const value = useMemo<PassportValue>(
    () => ({
      passport,
      ink(toy) {
        const next = ink(latest.current, toy, Date.now());
        if (next === latest.current) return false;
        commit(next);
        return true;
      },
      record(toy, seconds) {
        commit(recordVisit(latest.current, toy, seconds, Date.now()));
      },
    }),
    [passport, commit],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePassport(): PassportValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('usePassport must be used inside PassportProvider');
  return v;
}

/** Seconds after arriving at a toy that its stamp is inked. */
export const STAMP_AFTER_SECONDS = 12;

/**
 * Times a visit to a toy for the passport. Time in the background does not
 * count. Calls `onStamp` once if this visit inked a new stamp.
 */
export function useVisit(toy: ToyId, onStamp: () => void): void {
  const { ink: inkStamp, record } = usePassport();
  const latest = useRef({ inkStamp, record, onStamp });
  useEffect(() => {
    latest.current = { inkStamp, record, onStamp };
  });

  useEffect(() => {
    let activeSince: number | null = Date.now();
    let seconds = 0;
    const pause = () => {
      if (activeSince !== null) seconds += (Date.now() - activeSince) / 1000;
      activeSince = null;
    };
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') activeSince ??= Date.now();
      else pause();
    });
    const stampTimer = setTimeout(() => {
      if (latest.current.inkStamp(toy)) latest.current.onStamp();
    }, STAMP_AFTER_SECONDS * 1000);
    return () => {
      clearTimeout(stampTimer);
      sub.remove();
      pause();
      latest.current.record(toy, seconds);
    };
  }, [toy]);
}
