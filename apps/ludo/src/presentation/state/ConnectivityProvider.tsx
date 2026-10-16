import {
  createContext,
  useCallback,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { connectivityService } from '@/config/container';
import { canPlayOnline, type ConnectionState } from '@/domain';

interface ConnectivityContextValue {
  /** False in a build with no server configured: online play does not exist here. */
  readonly available: boolean;
  readonly state: ConnectionState;
  /** Shorthand for "online play may start now". */
  readonly online: boolean;
  refresh(): Promise<void>;
}

const ConnectivityContext = createContext<ConnectivityContextValue | null>(null);

const subscribe = (onChange: () => void) =>
  connectivityService ? connectivityService.subscribe(() => onChange()) : () => undefined;
const snapshot = (): ConnectionState => connectivityService?.current() ?? 'OFFLINE';

/**
 * One subscription for the whole tree, kept alive by the root layout so the
 * monitor keeps probing while the player moves between screens.
 */
export function ConnectivityProvider({ children }: { children: ReactNode }) {
  const state = useSyncExternalStore(subscribe, snapshot, snapshot);
  const refresh = useCallback(async () => {
    await connectivityService?.refresh();
  }, []);
  return (
    <ConnectivityContext.Provider
      value={{
        available: Boolean(connectivityService),
        state,
        online: Boolean(connectivityService) && canPlayOnline(state),
        refresh,
      }}
    >
      {children}
    </ConnectivityContext.Provider>
  );
}

export function useConnectivity(): ConnectivityContextValue {
  const value = useContext(ConnectivityContext);
  if (!value) throw new Error('ConnectivityProvider is required.');
  return value;
}
