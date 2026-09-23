import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { DICE_ROLL_MS, PIECE_SETTLE_MS } from '../board/pieceMotion';
import { HeuristicMoveStrategy } from '@/application/ai/HeuristicMoveStrategy';
import {
  newMatch,
  type MatchOptions,
  type SavedMatch,
} from '@/application/session/MatchRepository';
import { matchRepository, randomProvider } from '@/config/container';
import {
  applyMove,
  endTurnWithoutMove,
  getCurrentPlayer,
  getValidMovesForCurrentPlayer,
  rollDice,
  type Move,
} from '@/domain';

export function useMatch(options: MatchOptions, resume: boolean, paused: boolean, animate = false) {
  const [match, setMatch] = useState<SavedMatch | null>(null);
  const [busy, setBusy] = useState(false);
  const [activity, setActivity] = useState<'rolling' | 'moving' | null>(null);
  const finishFeedback = useRef<(() => void) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [foreground, setForeground] = useState(AppState.currentState !== 'background');
  const lock = useRef(false);
  const alive = useRef(false);
  const { mode, players, difficulty } = options;
  useEffect(() => {
    alive.current = true;
    let cancelled = false;
    void (async () => {
      try {
        const loaded = resume ? await matchRepository.load() : null;
        if (cancelled) return;
        const next = loaded ?? newMatch({ mode, players, difficulty });
        await matchRepository.save(next);
        if (!cancelled) setMatch(next);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load match.');
      }
    })();
    const listener = AppState.addEventListener('change', (state) =>
      setForeground(state === 'active'),
    );
    return () => {
      cancelled = true;
      alive.current = false;
      finishFeedback.current?.();
      listener.remove();
    };
  }, [resume, mode, players, difficulty]);

  const transition = useCallback(
    async (next: () => Promise<SavedMatch> | SavedMatch, kind: 'rolling' | 'moving') => {
      if (lock.current || !alive.current) return;
      lock.current = true;
      setBusy(true);
      setActivity(kind);
      setError(null);
      try {
        const updated = await next();
        // A delayed RNG response from an abandoned screen must not overwrite a new match.
        if (!alive.current) return;
        await matchRepository.save(updated);
        if (alive.current) setMatch(updated);
        if (alive.current && animate)
          await new Promise<void>((resolve) => {
            const timer = setTimeout(
              () => {
                finishFeedback.current = null;
                resolve();
              },
              kind === 'rolling' ? DICE_ROLL_MS : PIECE_SETTLE_MS,
            );
            finishFeedback.current = () => {
              clearTimeout(timer);
              finishFeedback.current = null;
              resolve();
            };
          });
      } catch (e) {
        if (alive.current)
          setError(e instanceof Error ? e.message : 'Could not save your move. Try again.');
      } finally {
        lock.current = false;
        if (alive.current) {
          setBusy(false);
          setActivity(null);
        }
      }
    },
    [animate],
  );
  const current = match ? getCurrentPlayer(match.state) : null;
  const humanTurn = match?.options.mode === 'local' || current?.color === 'RED';
  const moves = match ? getValidMovesForCurrentPlayer(match.state) : [];
  const roll = useCallback(() => {
    if (
      !match ||
      paused ||
      !foreground ||
      match.state.status === 'FINISHED' ||
      match.state.lastRoll !== null
    )
      return;
    void transition(async () => {
      const state = await rollDice(match.state, randomProvider);
      return { ...match, state, lastDie: state.lastRoll };
    }, 'rolling');
  }, [match, paused, foreground, transition]);
  const move = useCallback(
    (selected: Move) => {
      if (!match || !humanTurn || paused || !foreground) return;
      void transition(() => ({ ...match, state: applyMove(match.state, selected) }), 'moving');
    },
    [match, humanTurn, paused, foreground, transition],
  );

  useEffect(() => {
    if (!match || busy || paused || !foreground || error || match.state.status === 'FINISHED')
      return;
    const legalMoves = getValidMovesForCurrentPlayer(match.state);
    if (match.state.lastRoll === null && humanTurn) return;
    if (match.state.lastRoll !== null && legalMoves.length > 0 && humanTurn) return;
    const timer = setTimeout(
      () => {
        if (match.state.lastRoll === null) {
          roll();
          return;
        }
        void transition(async () => {
          if (legalMoves.length === 0) return { ...match, state: endTurnWithoutMove(match.state) };
          const selected =
            match.options.difficulty === 'smart'
              ? new HeuristicMoveStrategy().selectMove(match.state, legalMoves)
              : legalMoves[await randomProvider.nextInt(0, legalMoves.length - 1)]!;
          return { ...match, state: applyMove(match.state, selected) };
        }, 'moving');
      },
      match.state.lastRoll === null ? 850 : 1000,
    );
    return () => clearTimeout(timer);
  }, [match, busy, paused, foreground, error, humanTurn, roll, transition]);
  return {
    match,
    busy,
    activity,
    error,
    current,
    humanTurn,
    moves: humanTurn ? moves : [],
    roll,
    move,
    retry: () => setError(null),
  };
}
