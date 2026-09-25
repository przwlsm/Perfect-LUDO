import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { friendsRepository } from '@/config/container';
import {
  agePresence,
  countOnline,
  type Friend,
  type FriendRequest,
  type PublicUser,
} from '@/domain';
import { useSocial } from '../state/SocialProvider';
import { useUserSearch } from './useUserSearch';

/** How often stored heartbeats are re-checked for staleness on this device. */
const AGE_TICK_MS = 15_000;

const NO_FRIENDS: readonly Friend[] = [];
const NO_REQUESTS: readonly FriendRequest[] = [];

interface Lists {
  readonly friends: readonly Friend[];
  readonly incoming: readonly FriendRequest[];
  readonly sent: readonly FriendRequest[];
}
const EMPTY: Lists = { friends: NO_FRIENDS, incoming: NO_REQUESTS, sent: NO_REQUESTS };

function messageFor(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

/**
 * The friends list and the actions that change it. Discovery lives in
 * useUserSearch; this hook only ages and exposes what that returns.
 */
export function useFriends() {
  const { signedIn, presenceTimeoutSeconds } = useSocial();
  const enabled = Boolean(friendsRepository) && signedIn;
  const [lists, setLists] = useState<Lists>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const mounted = useRef(true);
  const search = useUserSearch(enabled);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const reload = useCallback((): Promise<void> => {
    const repository = friendsRepository;
    if (!repository || !signedIn) return Promise.resolve();
    return Promise.all([
      repository.listFriends(),
      repository.listIncomingRequests(),
      repository.listSentRequests(),
    ])
      .then(([friends, incoming, sent]) => {
        if (!mounted.current) return;
        setLists({ friends, incoming, sent });
        setError(null);
      })
      .catch((e: unknown) => {
        if (mounted.current) setError(messageFor(e));
      })
      .finally(() => {
        if (mounted.current) setLoaded(true);
      });
  }, [signedIn]);

  useEffect(() => {
    void reload();
  }, [reload]);

  // One subscription covers requests, friendships and friends' heartbeats,
  // so the list stays current without the player pulling to refresh.
  useEffect(() => {
    if (!friendsRepository || !signedIn) return;
    return friendsRepository.subscribe(() => void reload());
  }, [signedIn, reload]);

  // No event fires when somebody simply stops sending heartbeats, so the
  // staleness rule is re-applied here on a timer.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), AGE_TICK_MS);
    return () => clearInterval(timer);
  }, []);

  const age = useCallback(
    <T extends PublicUser>(user: T): T => ({
      ...user,
      presence: agePresence(user.presence, user.lastSeen, now, presenceTimeoutSeconds),
    }),
    [now, presenceTimeoutSeconds],
  );

  const visible = enabled ? lists : EMPTY;
  const friends = useMemo(() => visible.friends.map(age), [visible, age]);
  const incoming = useMemo(
    () => visible.incoming.map((request) => ({ ...request, user: age(request.user) })),
    [visible, age],
  );
  const sent = useMemo(
    () => visible.sent.map((request) => ({ ...request, user: age(request.user) })),
    [visible, age],
  );
  const results = useMemo(() => search.results.map(age), [search.results, age]);

  const run = useCallback(
    async (id: string, action: () => Promise<void>, success?: string) => {
      setBusyId(id);
      setError(null);
      setNotice(null);
      try {
        await action();
        if (success && mounted.current) setNotice(success);
        await reload();
      } catch (e) {
        if (mounted.current) setError(messageFor(e));
      } finally {
        if (mounted.current) setBusyId(null);
      }
    },
    [reload],
  );

  return {
    friends,
    incoming,
    sent,
    results,
    onlineCount: countOnline(friends),
    query: search.query,
    setQuery: search.setQuery,
    searching: search.searching,
    isSearching: search.active,
    loading: enabled && !loaded,
    error: error ?? search.error,
    notice,
    busyId,
    clearMessages: () => {
      setError(null);
      setNotice(null);
    },
    reload,
    sendRequest: (userId: string) =>
      run(userId, () => friendsRepository!.sendRequest(userId), 'Friend request sent.'),
    acceptRequest: (requestId: string) =>
      run(
        requestId,
        () => friendsRepository!.respondToRequest(requestId, true),
        'You are friends!',
      ),
    declineRequest: (requestId: string) =>
      run(requestId, () => friendsRepository!.respondToRequest(requestId, false)),
    cancelRequest: (requestId: string) =>
      run(requestId, () => friendsRepository!.cancelRequest(requestId), 'Request cancelled.'),
    removeFriend: (userId: string) =>
      run(userId, () => friendsRepository!.removeFriend(userId), 'Friend removed.'),
  };
}
