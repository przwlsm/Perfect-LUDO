import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GOATS_TOTAL, type Node } from 'baghchal-engine';
import { interpretTap, targetsFrom } from '@/application/board/BoardInteraction';
import { moveFeedback, resultSound } from '@/application/board/feedback';
import { piecesFromBoard, trackPieces, type PieceView } from '@/application/board/PieceTracker';
import { canClaimTimeout, isMyTurn, secondsLeft } from '@/application/online/matchView';
import type { MatchOutcome, OnlineMatchSnapshot } from '@/domain/entities/OnlineMatch';
import type { IOnlineMatchRepository } from '@/domain/ports/IOnlineMatchRepository';
import type { GameFeedback } from './useLocalGame';

/** Realtime is the fast path; this catches anything it drops. */
const POLL_MS = 6000;
const RESULT_SOUND_DELAY_MS = 350;

interface Received {
  readonly snapshot: OnlineMatchSnapshot;
  readonly at: number;
  readonly pieces: readonly PieceView[];
}

/**
 * A match on the server as this device sees it. The server decides every
 * move; this holds the latest snapshot, the selection, and a clock.
 */
export function useOnlineMatch(
  repo: IOnlineMatchRepository,
  matchId: string,
  feedback: GameFeedback,
) {
  const [received, setReceived] = useState<Received | null>(null);
  const [selected, setSelected] = useState<Node | null>(null);
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const { haptics, sounds } = feedback;

  // A newer snapshot replaces the old; one move newer slides the piece that moved.
  const accept = useCallback(
    (snapshot: OnlineMatchSnapshot) => {
      setReceived((previous) => {
        const at = Date.now();
        if (previous && snapshot.match.version < previous.snapshot.match.version) return previous;
        if (previous && snapshot.match.version === previous.snapshot.match.version) {
          return { snapshot, at, pieces: previous.pieces };
        }
        const move = snapshot.match.lastMove;
        const consecutive =
          previous &&
          move &&
          snapshot.match.state.plies === previous.snapshot.match.state.plies + 1;
        if (consecutive && previous) {
          const { haptic, sound } = moveFeedback(move);
          haptics[haptic]();
          sounds.play(sound);
          const placed = GOATS_TOTAL - previous.snapshot.match.state.goatsInHand;
          return { snapshot, at, pieces: trackPieces(previous.pieces, move, placed) };
        }
        return { snapshot, at, pieces: piecesFromBoard(snapshot.match.state.board) };
      });
      setError(null);
    },
    [haptics, sounds],
  );

  const load = useCallback(async () => {
    try {
      accept(await repo.get(matchId));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not load the match.');
    }
  }, [repo, matchId, accept]);

  useEffect(() => {
    // The first load right away (after this render commits), then on every
    // server change, with a slow poll in case Realtime drops one.
    const initial = setTimeout(() => void load(), 0);
    const unsubscribe = repo.subscribe(matchId, () => void load(), setConnected);
    const poll = setInterval(() => void load(), POLL_MS);
    return () => {
      clearTimeout(initial);
      unsubscribe();
      clearInterval(poll);
    };
  }, [repo, matchId, load]);

  const snapshot = received?.snapshot ?? null;
  const active = snapshot?.match.status === 'ACTIVE';
  useEffect(() => {
    if (!active) return;
    const ticker = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(ticker);
  }, [active]);

  const announced = useRef<MatchOutcome | null>(null);
  useEffect(() => {
    const outcome = snapshot?.match.outcome ?? null;
    if (!outcome || announced.current === outcome) return;
    announced.current = outcome;
    const cue = resultSound(outcome, snapshot?.mySide ?? null);
    if (!cue) return;
    const timer = setTimeout(() => sounds.play(cue), RESULT_SOUND_DELAY_MS);
    return () => clearTimeout(timer);
  }, [snapshot, sounds]);

  const myTurn = snapshot ? isMyTurn(snapshot) : false;

  const send = useCallback(
    (action: () => Promise<OnlineMatchSnapshot>) => {
      setSending(true);
      action()
        .then(accept)
        .catch((failure: unknown) => {
          setError(failure instanceof Error ? failure.message : 'The server refused that.');
          void load();
        })
        .finally(() => setSending(false));
    },
    [accept, load],
  );

  const tap = useCallback(
    (node: Node) => {
      if (!snapshot || !myTurn || sending) return;
      const outcome = interpretTap(snapshot.match.state, selected, node);
      if (!outcome.move) {
        if (outcome.selected !== null) {
          haptics.select();
          sounds.play('select');
        }
        setSelected(outcome.selected);
        return;
      }
      const move = outcome.move;
      setSelected(null);
      send(() => repo.submitMove(matchId, snapshot.match.version, move));
    },
    [snapshot, myTurn, sending, selected, haptics, sounds, send, repo, matchId],
  );

  const claim = useCallback(() => {
    if (snapshot) send(() => repo.claimTimeout(matchId, snapshot.match.version));
  }, [snapshot, send, repo, matchId]);

  const resign = useCallback(() => send(() => repo.resign(matchId)), [send, repo, matchId]);

  const targets = useMemo(
    () => (snapshot && myTurn ? targetsFrom(snapshot.match.state, selected) : []),
    [snapshot, myTurn, selected],
  );
  const clock = received ? secondsLeft(received.snapshot, received.at, now) : null;
  const canClaim = received ? canClaimTimeout(received.snapshot, received.at, now) : false;

  return {
    snapshot,
    pieces: received?.pieces ?? [],
    selected,
    targets,
    myTurn,
    clock,
    canClaim,
    sending,
    connected,
    error,
    tap,
    claim,
    resign,
    reload: load,
  };
}
