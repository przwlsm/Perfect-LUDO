/* eslint-disable react-hooks/set-state-in-effect -- Synchronize the external lobby lifecycle on route changes. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { challengeRepository } from '@/config/container';
import {
  agePresence,
  secondsUntil,
  serverClockOffsetMs,
  type LobbyPlayer,
  type LobbySnapshot,
} from '@/domain';
import { useSocial } from '../state/SocialProvider';

const TICK_MS = 250;

function messageFor(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

/**
 * Drives one private lobby: joins on entry, follows it over realtime, and
 * runs the countdown against the server's start time rather than this
 * device's clock so every player transitions together.
 */
export function useLobby(lobbyId: string | null) {
  const { presenceTimeoutSeconds } = useSocial();
  const [snapshot, setSnapshot] = useState<LobbySnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fatal, setFatal] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  // State rather than a ref: the countdown is rendered from it.
  const [clockOffset, setClockOffset] = useState(0);
  const starting = useRef(false);
  const mounted = useRef(true);
  const actionBusy = useRef(false);
  const joined = useRef(false);
  const latest = useRef<LobbySnapshot | null>(null);
  const scope = useRef(lobbyId);

  const nextStartAttempt = useRef(0);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const accept = useCallback((next: LobbySnapshot) => {
    if (!mounted.current || next.lobby.id !== scope.current) return;
    if (
      latest.current?.lobby.id === next.lobby.id &&
      Date.parse(latest.current.serverNow) > Date.parse(next.serverNow)
    )
      return;
    latest.current = next;
    setFatal(null);
    setClockOffset(serverClockOffsetMs(next.serverNow, Date.now()));
    setSnapshot(next);
  }, []);

  const refresh = useCallback(async () => {
    if (!challengeRepository || !lobbyId) return;
    try {
      if (joined.current) {
        accept(await challengeRepository.getLobby(lobbyId));
      } else {
        try {
          const next = await challengeRepository.joinLobby(lobbyId);
          if (scope.current !== lobbyId) return;
          joined.current = true;
          accept(next);
        } catch (joinError) {
          // Started/closed rooms cannot be joined again, but members can read them.
          const next = await challengeRepository.getLobby(lobbyId);
          if (next.lobby.status === 'WAITING' || next.lobby.status === 'COUNTDOWN') throw joinError;
          if (scope.current !== lobbyId) return;
          joined.current = true;
          accept(next);
        }
      }
    } catch (e) {
      if (mounted.current && scope.current === lobbyId) setFatal(messageFor(e));
    }
  }, [lobbyId, accept]);

  // Rejoining is idempotent. Recover missed realtime events and failed initial joins.
  useEffect(() => {
    scope.current = lobbyId;
    joined.current = false;
    latest.current = null;
    starting.current = false;
    nextStartAttempt.current = 0;
    setSnapshot(null);
    setFatal(null);
    void refresh();
    const timer = setInterval(() => {
      if (AppState.currentState !== 'background' && AppState.currentState !== 'inactive')
        void refresh();
    }, 5000);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [refresh, lobbyId]);

  useEffect(() => {
    if (!challengeRepository || !lobbyId) return;
    return challengeRepository.subscribeToLobby(lobbyId, () => void refresh());
  }, [lobbyId, refresh]);

  const status = snapshot?.lobby.status;

  useEffect(() => {
    if (status !== 'COUNTDOWN' && status !== 'WAITING') return;
    const timer = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(timer);
  }, [status]);

  const countdown = snapshot ? secondsUntil(snapshot.lobby.startAt, clockOffset, now) : 0;

  /**
   * Every client asks to start once its own countdown reaches zero, and the
   * server refuses anyone who is early. The first accepted call flips the
   * lobby and the rest observe it, so no single client is in charge.
   */
  useEffect(() => {
    if (!challengeRepository || !lobbyId) return;
    if (
      status !== 'COUNTDOWN' ||
      countdown > 0 ||
      starting.current ||
      now < nextStartAttempt.current
    )
      return;
    starting.current = true;
    void challengeRepository
      .startMatch(lobbyId)
      .then(accept)
      .catch(() => {
        // Usually "the countdown has not finished yet" from clock jitter.
        starting.current = false;
        nextStartAttempt.current = Date.now() + 2000;
        void refresh();
      });
  }, [status, countdown, lobbyId, accept, refresh, now]);

  useEffect(() => {
    if (status === 'WAITING') starting.current = false;
  }, [status]);

  const players: readonly LobbyPlayer[] = useMemo(
    () =>
      (snapshot?.players ?? []).map((player) => ({
        ...player,
        presence: agePresence(player.presence, player.lastSeen, now, presenceTimeoutSeconds),
      })),
    [snapshot, now, presenceTimeoutSeconds],
  );

  const run = useCallback(async (action: () => Promise<unknown>) => {
    if (actionBusy.current) return false;
    actionBusy.current = true;
    setBusy(true);
    setError(null);
    try {
      await action();
      return true;
    } catch (e) {
      if (mounted.current) setError(messageFor(e));
      return false;
    } finally {
      actionBusy.current = false;
      if (mounted.current) setBusy(false);
    }
  }, []);

  return {
    snapshot,
    players,
    countdown,
    busy,
    error,
    fatal: snapshot ? null : fatal,
    refresh,
    setReady: (ready: boolean) =>
      run(async () => {
        if (lobbyId) accept(await challengeRepository!.setReady(lobbyId, ready));
      }),
    moveSeat: (seat: number) =>
      run(async () => {
        if (lobbyId) accept(await challengeRepository!.moveSeat(lobbyId, seat));
      }),
    seekOpponents: (on: boolean) =>
      run(async () => {
        if (lobbyId) accept(await challengeRepository!.seekOpponents(lobbyId, on));
      }),
    leave: () => run(() => challengeRepository!.leaveLobby(lobbyId!)),
    cancel: () =>
      run(() => challengeRepository!.cancelChallenge(snapshot!.challenge.id)).then(() => refresh()),
  };
}
