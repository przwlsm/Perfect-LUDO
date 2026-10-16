import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { ensureSignedIn, type Session } from '@/application/online/session';
import { authProvider, profileRepository } from '@/config/container';

export type SessionStatus = 'unavailable' | 'loading' | 'ready' | 'error';

interface SessionContextValue {
  readonly status: SessionStatus;
  readonly session: Session | null;
  readonly error: string | null;
  readonly retry: () => void;
}

const SessionContext = createContext<SessionContextValue>({
  status: 'unavailable',
  session: null,
  error: null,
  retry: () => undefined,
});

/**
 * Signs the device in for online play, as a guest when nothing is saved.
 * 'unavailable' means this build has no server configured at all.
 */
export function SessionProvider({ children }: { readonly children: ReactNode }) {
  const configured = authProvider !== null && profileRepository !== null;
  const [status, setStatus] = useState<SessionStatus>(configured ? 'loading' : 'unavailable');
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!authProvider || !profileRepository) return;
    let live = true;
    ensureSignedIn(authProvider, profileRepository).then(
      (result) => {
        if (!live) return;
        setSession(result);
        setStatus('ready');
      },
      (failure: unknown) => {
        if (!live) return;
        setError(failure instanceof Error ? failure.message : 'Could not sign in.');
        setStatus('error');
      },
    );
    return () => {
      live = false;
    };
  }, [attempt]);

  // Loading is set here, in the tap, rather than inside the effect.
  const retry = useCallback(() => {
    setStatus('loading');
    setError(null);
    setAttempt((n) => n + 1);
  }, []);
  const value = useMemo(() => ({ status, session, error, retry }), [status, session, error, retry]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  return useContext(SessionContext);
}
