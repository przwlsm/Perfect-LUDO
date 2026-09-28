import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { DICE_ROLL_MS, PIECE_SETTLE_MS } from '../board/pieceMotion';
import { getGameCue, type GameFeedback } from '../audio/gameFeedback';
import { HeuristicMoveStrategy } from '@/application/ai/HeuristicMoveStrategy';
import {
  newMatch,
  type MatchOptions,
  type SeatNames,
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
  type PlayerColor,
  type DieValue,
  NO_STATS,
  type MatchStats,
} from '@/domain';
import { accumulateStats } from './matchStats';

export function useMatch(options: MatchOptions, resume: boolean, paused: boolean, animate = false) {
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [match, setMatch] = useState<SavedMatch | null>(null);
  const [busy, setBusy] = useState(false);
  const [activity, setActivity] = useState<'rolling' | 'moving' | null>(null);
  const [feedback, setFeedback] = useState<GameFeedback | null>(null);
  const [seatRolls, setSeatRolls] = useState<Partial<Record<PlayerColor, DieValue>>>({});
  const sequence = useRef(0);
  const finishFeedback = useRef<(() => void) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [foreground, setForeground] = useState(AppState.currentState !== 'background');
  const lock = useRef(false);
  // The human seat's sixes, captures and coins home, for the daily missions.
  const stats = useRef<{ id: string | null; value: MatchStats }>({ id: null, value: NO_STATS });
  const alive = useRef(false);
  const { mode, players, difficulty } = options;
  const teams = options.teams === true;
  // Compared by value: the options object is rebuilt on every render.
  const namesKey = JSON.stringify(options.names ?? {});
  useEffect(() => {
    alive.current = true;
    let cancelled = false;
    void (async () => {
      try {
        const loaded = resume ? await matchRepository.load() : null;
        if (cancelled) return;
        if (resume && !loaded)
          throw new Error('No saved match was found. Start a new game from the lobby.');
        const next =
          loaded ??
          newMatch({
            mode,
            players,
            difficulty,
            names: JSON.parse(namesKey) as SeatNames,
            ...(teams ? { teams: true } : {}),
          });
        await matchRepository.save(next);
        if (!cancelled) {
          setMatch(next);
          if (next.state.lastRoll)
            setSeatRolls({ [getCurrentPlayer(next.state).color]: next.state.lastRoll });
        }
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
  }, [resume, mode, players, difficulty, namesKey, teams, loadAttempt]);

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
        if (alive.current) {
          setMatch(updated);
          if (kind === 'rolling' && match && updated.state.lastRoll)
            setSeatRolls((previous) => ({
              ...previous,
              [getCurrentPlayer(match.state).color]: updated.state.lastRoll!,
            }));
          const cue = match ? getGameCue(match.state, updated.state) : null;
          if (match) {
            if (stats.current.id !== updated.id)
              stats.current = { id: updated.id, value: NO_STATS };
            stats.current.value = accumulateStats(
              stats.current.value,
              match.state,
              updated.state,
              'RED',
            );
          }
          if (cue) setFeedback({ ...cue, id: ++sequence.current });
        }
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
    [animate, match],
  );
  const current = match ? getCurrentPlayer(match.state) : null;
  const humanTurn = match?.options.mode === 'local' || current?.color === 'RED';
  // Pass & play has no single local player to favour; vs-AI always seats the human as RED.
  const myColor: PlayerColor | null = match && match.options.mode !== 'local' ? 'RED' : null;
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
    // A single legal move isn't a decision, so play it instead of making the
    // player tap the only option they have. Two or more still waits for them.
    if (match.state.lastRoll !== null && legalMoves.length > 1 && humanTurn) return;
    const timer = setTimeout(
      () => {
        if (match.state.lastRoll === null) {
          roll();
          return;
        }
        void transition(async () => {
          if (legalMoves.length === 0) return { ...match, state: endTurnWithoutMove(match.state) };
          const selected =
            legalMoves.length === 1
              ? legalMoves[0]!
              : match.options.difficulty === 'smart'
                ? new HeuristicMoveStrategy().selectMove(match.state, legalMoves)
                : legalMoves[await randomProvider.nextInt(0, legalMoves.length - 1)]!;
          return { ...match, state: applyMove(match.state, selected) };
        }, 'moving');
      },
      match.state.lastRoll === null ? 850 : humanTurn && legalMoves.length === 1 ? 350 : 1000,
    );
    return () => clearTimeout(timer);
  }, [match, busy, paused, foreground, error, humanTurn, roll, transition]);
  return {
    match,
    /** What the human (red) seat achieved this session, reported with the result. */
    getStats: () => stats.current.value,
    busy,
    activity,
    feedback,
    seatRolls,
    error,
    current,
    humanTurn,
    myColor,
    moves: humanTurn ? moves : [],
    roll,
    move,
    retry: () => {
      setError(null);
      if (!match) setLoadAttempt((attempt) => attempt + 1);
    },
  };
}
