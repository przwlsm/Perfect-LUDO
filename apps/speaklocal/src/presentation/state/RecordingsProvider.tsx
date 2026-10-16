import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { FREE_TAKES, PLUS_TAKES, takesToPrune, type Recording } from '@/domain/entities/Recording';
import { recordings as store } from '@/config/container';
import { useEntitlements } from './EntitlementsProvider';

interface RecordingsValue {
  readonly all: readonly Recording[];
  /** A phrase's takes, newest first. */
  takesFor(key: string): Recording[];
  /** Keeps a finished take; prunes old ones beyond what the learner keeps. */
  add(tempUri: string, key: string, durationMs: number): Promise<Recording | null>;
  remove(r: Recording): Promise<void>;
  removeAll(): Promise<void>;
}

const Ctx = createContext<RecordingsValue | null>(null);

/** The learner's own takes. They never leave the phone. */
export function RecordingsProvider({ children }: PropsWithChildren) {
  const { plus } = useEntitlements();
  const [all, setAll] = useState<readonly Recording[]>([]);

  const refresh = useCallback(async () => setAll(await store.list()), []);
  useEffect(() => {
    let live = true;
    void store.list().then((list) => {
      if (live) setAll(list);
    });
    return () => {
      live = false;
    };
  }, []);

  const value = useMemo<RecordingsValue>(
    () => ({
      all,
      takesFor: (key) => all.filter((r) => r.phraseKey === key),
      async add(tempUri, key, durationMs) {
        const saved = await store.save(tempUri, key, durationMs, Date.now());
        const list = await store.list();
        for (const old of takesToPrune(list, key, plus ? PLUS_TAKES : FREE_TAKES)) {
          await store.remove(old);
        }
        await refresh();
        return saved;
      },
      async remove(r) {
        await store.remove(r);
        await refresh();
      },
      async removeAll() {
        await store.removeAll();
        await refresh();
      },
    }),
    [all, plus, refresh],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRecordings(): RecordingsValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useRecordings must be used inside RecordingsProvider');
  return v;
}
