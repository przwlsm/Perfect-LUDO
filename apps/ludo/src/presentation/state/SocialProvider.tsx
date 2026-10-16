import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { authProvider, notificationRepository } from '@/config/container';
import type { AppNotification, AuthUser, SocialIdentity } from '@/domain';
import { useNotificationInbox } from '../hooks/useNotificationInbox';
import { usePresenceHeartbeat } from '../hooks/usePresenceHeartbeat';
import { useSocialIdentity } from '../hooks/useSocialIdentity';
import { useProfile } from './ProfileProvider';

/**
 * Nobody, a temporary guest, or a full account. Guests can play online but
 * every account-only feature checks this before offering itself.
 */
export type AccountKind = 'none' | 'guest' | 'member';

interface SocialContextValue {
  /** False in builds with no backend configured; the game still plays offline. */
  enabled: boolean;
  /** Any session at all, guest included. */
  signedIn: boolean;
  userId: string | null;
  account: AccountKind;
  /** Friends, challenges, usernames: only members have these. */
  member: boolean;
  identity: SocialIdentity | null;
  setIdentity(identity: SocialIdentity): void;
  notifications: readonly AppNotification[];
  unreadCount: number;
  invite: AppNotification | null;
  dismissInvite(): void;
  refresh(): Promise<void>;
  markAllRead(): Promise<void>;
  presenceTimeoutSeconds: number;
  /** Called by the game screen so friends see "In a game" rather than "Online". */
  reportAtBoard(playing: boolean): void;
}

const SocialContext = createContext<SocialContextValue | null>(null);

function accountOf(user: AuthUser | null): AccountKind {
  if (!user) return 'none';
  return user.isGuest ? 'guest' : 'member';
}

/**
 * Composition only. Identity, presence and the inbox are three separate
 * concerns with three separate hooks; this provider exists to share one
 * instance of each with the tree, not to implement any of them.
 */
export function SocialProvider({ children }: { children: ReactNode }) {
  const { profile } = useProfile();
  const [user, setUser] = useState<AuthUser | null>(() => authProvider?.getCurrentUser() ?? null);

  useEffect(() => {
    const unsubscribe = authProvider?.onAuthStateChanged(setUser);
    return () => unsubscribe?.();
  }, []);

  const userId = user?.uid ?? null;
  const signedIn = Boolean(userId);
  const account = accountOf(user);
  // Keyed on account too: a guest who signs up keeps their uid but needs a
  // fresh identity, since the temporary handle is replaced server-side.
  const { identity, setIdentity } = useSocialIdentity(
    userId ? `${userId}:${account}` : null,
    profile.name,
  );
  const { timeoutSeconds, reportAtBoard } = usePresenceHeartbeat(signedIn);
  const inbox = useNotificationInbox(signedIn);

  return (
    <SocialContext.Provider
      value={{
        enabled: Boolean(notificationRepository),
        signedIn,
        userId,
        account,
        member: account === 'member',
        identity,
        setIdentity,
        presenceTimeoutSeconds: timeoutSeconds,
        reportAtBoard,
        ...inbox,
      }}
    >
      {children}
    </SocialContext.Provider>
  );
}

export function useSocial(): SocialContextValue {
  const value = useContext(SocialContext);
  if (!value) throw new Error('SocialProvider is required.');
  return value;
}

/** Marks the player as in a game for as long as the calling screen is mounted. */
export function useAtBoardPresence(): void {
  const { reportAtBoard } = useSocial();
  useEffect(() => {
    reportAtBoard(true);
    return () => reportAtBoard(false);
  }, [reportAtBoard]);
}
