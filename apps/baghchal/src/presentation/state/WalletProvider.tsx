import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Wallet } from '@/domain/entities/Economy';
import { walletRepository } from '@/config/container';
import { DEFAULT_LOOK, lookFor, type BoardLook } from '../theme/cosmetics';
import { useSession } from './SessionProvider';

interface WalletContextValue {
  /** Null until loaded, or in a build with no server. */
  readonly wallet: Wallet | null;
  /** The equipped board and pieces, or the default look. */
  readonly look: BoardLook;
  /** Takes the wallet a server call just returned, so every screen agrees. */
  readonly adopt: (wallet: Wallet) => void;
  readonly refresh: () => Promise<void>;
}

const WalletContext = createContext<WalletContextValue>({
  wallet: null,
  look: DEFAULT_LOOK,
  adopt: () => undefined,
  refresh: async () => undefined,
});

/** Coins and looks for the signed-in player, loaded once the session is ready. */
export function WalletProvider({ children }: { readonly children: ReactNode }) {
  const { status } = useSession();
  const [wallet, setWallet] = useState<Wallet | null>(null);

  const refresh = useCallback(async () => {
    if (!walletRepository) return;
    try {
      setWallet(await walletRepository.wallet());
    } catch {
      // Offline: the last known wallet (or the default look) stays.
    }
  }, []);

  useEffect(() => {
    if (status !== 'ready') return;
    const timer = setTimeout(() => void refresh(), 0);
    return () => clearTimeout(timer);
  }, [status, refresh]);

  const adopt = useCallback((next: Wallet) => setWallet(next), []);
  const look = useMemo(
    () => (wallet ? lookFor(wallet.equippedBoard, wallet.equippedPieces) : DEFAULT_LOOK),
    [wallet],
  );
  const value = useMemo(() => ({ wallet, look, adopt, refresh }), [wallet, look, adopt, refresh]);
  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletContextValue {
  return useContext(WalletContext);
}
