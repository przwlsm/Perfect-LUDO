/* eslint-disable react-hooks/set-state-in-effect -- Synchronize the external room/session and foreground connection lifecycle. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { authProvider, matchSyncRepository } from '@/config/container';
import {
  applyMove,
  createGame,
  endTurnWithoutMove,
  getCurrentPlayer,
  getValidMovesForCurrentPlayer,
  rollDice,
  seatColors,
  type DieValue,
  type GameState,
  type Move,
  type OnlineMatchSnapshot,
  type PlayerColor,
  NO_STATS,
  type MatchStats,
} from '@/domain';
import { accumulateStats } from './matchStats';
import { getGameCue, type GameFeedback } from '../audio/gameFeedback';
import { useSocial } from '../state/SocialProvider';

type Connection = 'connecting' | 'live' | 'polling' | 'reconnecting';
type ViewState = { snapshot: OnlineMatchSnapshot; board: GameState };
const messageFor = (e: unknown) =>
  e instanceof Error ? e.message : 'Could not reach the table. Please retry.';

export function useOnlineMatch(lobbyId: string, paused: boolean) {
  const { signedIn } = useSocial();
  const uid = authProvider?.getCurrentUser()?.uid ?? null;
  const scope = `${lobbyId}:${uid ?? 'guest'}`;
  const scopeRef = useRef(scope);

  const [view, setView] = useState<ViewState | null>(null);
  const latest = useRef<ViewState | null>(null);
  const [seatRolls, setSeatRolls] = useState<Partial<Record<PlayerColor, DieValue>>>({});
  const [feedback, setFeedback] = useState<GameFeedback | null>(null);
  const [activity, setActivity] = useState<'rolling' | 'moving' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connection, setConnection] = useState<Connection>('connecting');
  const [foreground, setForeground] = useState(
    AppState.currentState !== 'background' && AppState.currentState !== 'inactive',
  );
  const busyRef = useRef(false),
    mounted = useRef(true),
    realtime = useRef(false);
  const autoVersion = useRef<number | null>(null),
    cue = useRef(0);
  const actionError = useRef(false);
  // This seat's sixes, captures and coins home, for the daily missions.
  const stats = useRef<MatchStats>(NO_STATS);
  // Server time minus device time, so turn deadlines count down correctly on
  // a phone whose clock is off.
  const clockOffset = useRef(0);
  const claimedVersion = useRef<number | null>(null);
  const myTurnRef = useRef(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const fresh = useCallback(() => mounted.current && scopeRef.current === scope, [scope]);

  useEffect(() => {
    scopeRef.current = scope;
    mounted.current = true;
    realtime.current = false;
    actionError.current = false;
    latest.current = null;
    busyRef.current = false;
    autoVersion.current = null;
    setView(null);
    setSeatRolls({});
    setError(null);
    setActivity(null);
    setConnection('connecting');
    return () => {
      mounted.current = false;
    };
  }, [scope]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => setForeground(state === 'active'));
    return () => sub.remove();
  }, []);

  const accept = useCallback(
    async (next: OnlineMatchSnapshot) => {
      if (!fresh() || next.match.lobbyId !== lobbyId) return;
      const serverNow = Date.parse(next.serverNow);
      if (Number.isFinite(serverNow)) clockOffset.current = serverNow - Date.now();
      const current = latest.current;
      if (
        current &&
        current.snapshot.match.id === next.match.id &&
        current.snapshot.match.version > next.match.version
      )
        return;
      const base = next.match.state ?? createGame(seatColors(next.match.playerCount));
      const board = next.match.lastRoll
        ? await rollDice(base, { nextInt: async () => next.match.lastRoll! })
        : base;
      if (!fresh()) return;
      // An RPC response and a realtime refresh can finish in either order.
      const previous = latest.current;
      if (previous && previous.snapshot.match.version > next.match.version) return;
      if (
        previous &&
        previous.snapshot.match.version === next.match.version &&
        Date.parse(previous.snapshot.serverNow) > Date.parse(next.serverNow)
      )
        return;
      const changed = !previous || previous.snapshot.match.version !== next.match.version;
      const result = { snapshot: next, board: changed ? board : previous!.board };
      latest.current = result;
      setView(result);
      setConnection(realtime.current ? 'live' : 'polling');
      if (changed && previous) {
        const sound = getGameCue(previous.board, board);
        if (sound) setFeedback({ ...sound, id: ++cue.current });
        const mine = next.mySeat === null ? null : seatColors(next.match.playerCount)[next.mySeat];
        if (mine) stats.current = accumulateStats(stats.current, previous.board, board, mine);
      }
      if (next.match.lastRoll) {
        const color = seatColors(next.match.playerCount)[next.match.turnSeat];
        if (color) setSeatRolls((rolls) => ({ ...rolls, [color]: next.match.lastRoll! }));
      }
    },
    [fresh, lobbyId],
  );

  const refresh = useCallback(async () => {
    if (!matchSyncRepository || !signedIn || !fresh()) return;
    try {
      await accept(await matchSyncRepository.getMatchForLobby(lobbyId));
      if (fresh() && !actionError.current) setError(null);
    } catch (e) {
      if (fresh()) {
        setConnection('reconnecting');
        setError(messageFor(e));
      }
    }
  }, [lobbyId, signedIn, fresh, accept]);

  useEffect(() => {
    if (!foreground) return;
    void refresh();
    // Polling also catches missed events, disconnected players and expired lobby state.
    const timer = setInterval(() => void refresh(), 5000);
    return () => clearInterval(timer);
  }, [refresh, foreground]);
  const matchId = view?.snapshot.match.id;
  useEffect(() => {
    if (!matchSyncRepository || !matchId || !foreground) return;
    return matchSyncRepository.subscribe(
      matchId,
      () => void refresh(),
      (connected) => {
        if (!fresh()) return;
        realtime.current = connected;
        setConnection((old) => (old === 'reconnecting' ? old : connected ? 'live' : 'polling'));
      },
    );
  }, [matchId, foreground, refresh, fresh]);

  const snapshot = view?.snapshot ?? null,
    board = view?.board ?? null;
  const playerCount = snapshot?.match.playerCount ?? 0;
  const colors = useMemo(() => (playerCount ? seatColors(playerCount) : []), [playerCount]);
  const mySeat = snapshot?.mySeat ?? null;
  const myColor = mySeat === null ? null : (colors[mySeat] ?? null);
  const myTurn = Boolean(
    signedIn &&
    foreground &&
    snapshot?.match.status === 'IN_PROGRESS' &&
    mySeat !== null &&
    mySeat === snapshot.match.turnSeat &&
    connection !== 'reconnecting',
  );
  const moves = useMemo(
    () => (board && myTurn ? getValidMovesForCurrentPlayer(board) : []),
    [board, myTurn],
  );
  useEffect(() => {
    myTurnRef.current = myTurn;
  }, [myTurn]);

  // The turn clock: counts down for everyone, and once it has run out on
  // somebody else's turn, asks the server to play that turn for them.
  const deadlineIso = snapshot?.match.status === 'IN_PROGRESS' ? snapshot.match.turnDeadline : null;
  const clockVersion = snapshot?.match.version ?? null;
  useEffect(() => {
    if (!deadlineIso || clockVersion === null || !foreground) {
      setSecondsLeft(null);
      return;
    }
    const deadline = Date.parse(deadlineIso) - clockOffset.current;
    const tick = () => {
      if (!fresh()) return;
      const left = (deadline - Date.now()) / 1000;
      setSecondsLeft(Math.max(0, Math.ceil(left)));
      const current = latest.current?.snapshot;
      if (
        left < -1.5 &&
        matchSyncRepository &&
        current &&
        current.mySeat !== null &&
        !myTurnRef.current &&
        current.match.version === clockVersion &&
        claimedVersion.current !== clockVersion
      ) {
        claimedVersion.current = clockVersion;
        void matchSyncRepository
          .claimTimeout(current.match.id, clockVersion)
          .then(accept)
          .catch(() => undefined);
      }
    };
    tick();
    const timer = setInterval(tick, 500);
    return () => clearInterval(timer);
  }, [deadlineIso, clockVersion, foreground, fresh, accept]);

  const guard = useCallback(
    async (kind: 'rolling' | 'moving', action: () => Promise<OnlineMatchSnapshot>) => {
      if (busyRef.current || !fresh()) return;
      busyRef.current = true;
      actionError.current = false;
      setActivity(kind);
      setError(null);
      const start = Date.now();
      try {
        await accept(await action());
      } catch (e) {
        if (fresh()) {
          actionError.current = true;
          setError(messageFor(e));
          await refresh();
        }
      } finally {
        const remaining = (kind === 'rolling' ? 480 : 660) - (Date.now() - start);
        if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
        if (fresh()) {
          busyRef.current = false;
          setActivity(null);
        }
      }
    },
    [fresh, accept, refresh],
  );

  const submit = useCallback(
    (next: GameState) => {
      const current = latest.current?.snapshot;
      if (!current || !matchSyncRepository) return;
      const winner = next.winnerColor
        ? seatColors(current.match.playerCount).indexOf(next.winnerColor)
        : -1;
      void guard('moving', () =>
        matchSyncRepository!.submitTurn(
          current.match.id,
          current.match.version,
          next,
          winner < 0 ? null : winner,
        ),
      );
    },
    [guard],
  );
  const roll = useCallback(() => {
    if (!snapshot || !myTurn || paused || snapshot.match.lastRoll !== null) return;
    void guard('rolling', () =>
      matchSyncRepository!.rollDice(snapshot.match.id, snapshot.match.version),
    );
  }, [snapshot, myTurn, paused, guard]);
  const move = useCallback(
    (selected: Move) => {
      if (!board || !myTurn || paused || busyRef.current) return;
      try {
        submit(applyMove(board, selected));
      } catch {
        setError('The board changed. Select a highlighted coin again.');
        void refresh();
      }
    },
    [board, myTurn, paused, submit, refresh],
  );

  useEffect(() => {
    if (
      !board ||
      !snapshot ||
      !myTurn ||
      paused ||
      activity ||
      error ||
      snapshot.match.lastRoll === null ||
      moves.length > 1
    )
      return;
    if (autoVersion.current === snapshot.match.version) return;
    const timer = setTimeout(
      () => {
        if (
          !fresh() ||
          busyRef.current ||
          latest.current?.snapshot.match.version !== snapshot.match.version
        )
          return;
        autoVersion.current = snapshot.match.version;
        submit(moves.length === 1 ? applyMove(board, moves[0]!) : endTurnWithoutMove(board));
      },
      moves.length === 1 ? 350 : 800,
    );
    return () => clearTimeout(timer);
  }, [board, snapshot, myTurn, paused, activity, error, moves, submit, fresh]);

  const abandon = useCallback(async () => {
    if (!snapshot || !matchSyncRepository) return;
    await guard('moving', () => matchSyncRepository!.abandon(snapshot.match.id));
  }, [snapshot, guard]);
  const match = useMemo(
    () =>
      snapshot && board
        ? {
            version: 1 as const,
            id: snapshot.match.id,
            options: {
              mode: 'online' as const,
              players: snapshot.match.playerCount as 2 | 3 | 4 | 5 | 6,
              difficulty: 'smart' as const,
            },
            state: board,
            lastDie: snapshot.match.lastRoll,
          }
        : null,
    [snapshot, board],
  );
  return {
    match,
    /** What this seat achieved so far, reported with the result for missions. */
    getStats: () => stats.current,
    players: snapshot?.players ?? [],
    myColor,
    mySeat,
    status: snapshot?.match.status ?? null,
    winnerSeat: snapshot?.match.winnerSeat ?? null,
    /** Coins each seat paid in, the pool, and what the winner collects. */
    stake: snapshot?.match.stake ?? 0,
    pool: snapshot?.match.pool ?? 0,
    prize: snapshot?.match.prize ?? 0,
    /** Whole seconds left on the current roll or move; null without a clock. */
    secondsLeft,
    busy: activity !== null,
    activity,
    feedback,
    seatRolls,
    error,
    connection,
    fatal: !signedIn
      ? 'Sign in to rejoin your online game.'
      : !matchSyncRepository
        ? 'Online play is not configured in this build.'
        : null,
    current: board ? getCurrentPlayer(board) : null,
    humanTurn: myTurn,
    moves,
    roll,
    move,
    abandon,
    retry: () => {
      actionError.current = false;
      autoVersion.current = null;
      setError(null);
      void refresh();
    },
  };
}
