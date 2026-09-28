import { useCallback, useEffect, useRef, useState } from 'react';
import { matchmakingRepository } from '@/config/container';
import type { QuickMatchPlayerCount, QuickMatchTicket, Stake, Unsubscribe } from '@/domain';
import { useSocial } from '../state/SocialProvider';

/** How often a waiting ticket is refreshed; the server drops tickets quiet for 45 s. */
export const HEARTBEAT_MS = 5000;

export type QuickMatchPhase = 'idle' | 'searching' | 'matched';

export interface QuickMatchState {
  readonly phase: QuickMatchPhase;
  readonly ticket: QuickMatchTicket | null;
  readonly error: string | null;
  readonly available: boolean;
  start(playerCount: QuickMatchPlayerCount, stake?: Stake): Promise<void>;
  cancel(): Promise<void>;
}

function messageFor(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

/**
 * Drives one quick-play search. Joining is also the heartbeat, so the same
 * call both keeps the ticket alive and learns when a table has been seated;
 * realtime on the caller's own row makes that news arrive sooner.
 */
export function useQuickMatch(): QuickMatchState {
  const { userId } = useSocial();
  const [phase, setPhase] = useState<QuickMatchPhase>('idle');
  const [ticket, setTicket] = useState<QuickMatchTicket | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);
  const searching = useRef(false);
  const playerCount = useRef<QuickMatchPlayerCount>(2);
  const stake = useRef<Stake>(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const unsubscribe = useRef<Unsubscribe | null>(null);
  const inFlight = useRef(false);

  const stopWatching = useCallback(() => {
    searching.current = false;
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    unsubscribe.current?.();
    unsubscribe.current = null;
  }, []);

  const accept = useCallback(
    (next: QuickMatchTicket) => {
      if (!mounted.current || !searching.current) return;
      setTicket(next);
      if (next.status === 'MATCHED') {
        stopWatching();
        setPhase('matched');
      }
    },
    [stopWatching],
  );

  const heartbeat = useCallback(async () => {
    if (!matchmakingRepository || !searching.current || inFlight.current) return;
    inFlight.current = true;
    try {
      accept(await matchmakingRepository.join(playerCount.current, stake.current));
    } catch (e) {
      // One missed beat is not a failure; the server tolerates several.
      if (mounted.current && searching.current) setError(messageFor(e));
    } finally {
      inFlight.current = false;
    }
  }, [accept]);

  const start = useCallback(
    async (count: QuickMatchPlayerCount, entry: Stake = 0) => {
      if (!matchmakingRepository || !userId || searching.current) return;
      playerCount.current = count;
      stake.current = entry;
      searching.current = true;
      setError(null);
      setTicket(null);
      setPhase('searching');
      try {
        accept(await matchmakingRepository.join(count, entry));
      } catch (e) {
        stopWatching();
        if (mounted.current) {
          setPhase('idle');
          setError(messageFor(e));
        }
        return;
      }
      if (!searching.current) return;
      unsubscribe.current = matchmakingRepository.subscribe(userId, () => void heartbeat());
      timer.current = setInterval(() => void heartbeat(), HEARTBEAT_MS);
    },
    [userId, accept, heartbeat, stopWatching],
  );

  const cancel = useCallback(async () => {
    const wasSearching = searching.current;
    stopWatching();
    if (mounted.current) {
      setPhase('idle');
      setTicket(null);
    }
    if (wasSearching || ticket?.status === 'MATCHED') {
      try {
        await matchmakingRepository?.leave();
      } catch {
        // Leaving is best-effort: an unrefreshed ticket expires on its own.
      }
    }
  }, [stopWatching, ticket?.status]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      const wasSearching = searching.current;
      stopWatching();
      if (wasSearching) void matchmakingRepository?.leave().catch(() => undefined);
    };
  }, [stopWatching]);

  return {
    phase,
    ticket,
    error,
    available: Boolean(matchmakingRepository) && Boolean(userId),
    start,
    cancel,
  };
}
