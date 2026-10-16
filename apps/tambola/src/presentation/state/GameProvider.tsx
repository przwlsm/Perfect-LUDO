import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { PropsWithChildren } from 'react';
import { ALL_PRIZES, type PrizeId } from '@/domain/entities/Prize';
import type {
  GameResult,
  HostSession,
  HostWin,
  PlayerSession,
  ResultRow,
} from '@/domain/entities/Session';
import { HIGHEST } from '@/domain/entities/Ticket';
import { decodeRoom, encodeRoom, randomStripCode, SEED_COUNT } from '@/application/room';
import { parseHostSession, parsePlayerSession } from '@/application/sessions';
import { storage } from '@/config/container';

const HOST_KEY = 'tambola.host.v1';
const PLAYER_KEY = 'tambola.player.v1';

interface GameValue {
  readonly loaded: boolean;
  readonly host: HostSession | null;
  readonly player: PlayerSession | null;
  /** The last finished game, for the results screen. */
  readonly result: GameResult | null;
  hostStart(prizes: readonly PrizeId[]): HostSession;
  hostCall(): void;
  hostAward(win: HostWin): void;
  /** Ends the hosted game and keeps its results. */
  hostEnd(): void;
  join(code: string, count: number): void;
  daub(n: number): void;
  /** New tickets for the same room (only before the first daub). */
  reshuffle(): void;
  leave(): void;
  setResult(result: GameResult): void;
}

const Ctx = createContext<GameValue | null>(null);

/** Hosted games and joined tickets survive the app being closed mid-party. */
export function GameProvider({ children }: PropsWithChildren) {
  const [loaded, setLoaded] = useState(false);
  const [host, setHost] = useState<HostSession | null>(null);
  const [player, setPlayer] = useState<PlayerSession | null>(null);
  const [result, setResult] = useState<GameResult | null>(null);
  const hostRef = useRef(host);
  const playerRef = useRef(player);

  useEffect(() => {
    let live = true;
    void Promise.all([
      storage.getItem(HOST_KEY).catch(() => null),
      storage.getItem(PLAYER_KEY).catch(() => null),
    ]).then(([h, p]) => {
      if (!live) return;
      hostRef.current = parseHostSession(h);
      playerRef.current = parsePlayerSession(p);
      setHost(hostRef.current);
      setPlayer(playerRef.current);
      setLoaded(true);
    });
    return () => {
      live = false;
    };
  }, []);

  const saveHost = useCallback((next: HostSession | null) => {
    hostRef.current = next;
    setHost(next);
    void storage.setItem(HOST_KEY, next ? JSON.stringify(next) : '').catch(() => undefined);
  }, []);
  const savePlayer = useCallback((next: PlayerSession | null) => {
    playerRef.current = next;
    setPlayer(next);
    void storage.setItem(PLAYER_KEY, next ? JSON.stringify(next) : '').catch(() => undefined);
  }, []);

  const value = useMemo<GameValue>(
    () => ({
      loaded,
      host,
      player,
      result,
      hostStart(prizes) {
        const room = encodeRoom(Math.floor(Math.random() * SEED_COUNT), prizes);
        const session: HostSession = {
          code: room.code,
          called: 0,
          wins: [],
          startedAt: Date.now(),
        };
        saveHost(session);
        return session;
      },
      hostCall() {
        const h = hostRef.current;
        if (!h || h.called >= HIGHEST) return;
        saveHost({ ...h, called: h.called + 1 });
      },
      hostAward(win) {
        const h = hostRef.current;
        if (!h) return;
        saveHost({ ...h, wins: [...h.wins, win] });
      },
      hostEnd() {
        const h = hostRef.current;
        if (!h) return;
        const room = decodeRoom(h.code);
        const rows: ResultRow[] = (room?.prizes ?? ALL_PRIZES).flatMap((prize): ResultRow[] => {
          const wins = h.wins.filter((w) => w.prize === prize);
          if (wins.length === 0) return [{ prize, winner: null, you: false, bogus: false }];
          return wins.map((w): ResultRow => ({
            prize,
            winner: w.name ? `${w.name}\n${w.ticket}` : w.ticket,
            you: false,
            bogus: false,
          }));
        });
        setResult({ mode: 'party', rows, calls: h.called, code: h.code });
        saveHost(null);
      },
      join(code, count) {
        const room = decodeRoom(code);
        if (!room) return;
        savePlayer({
          code: room.code,
          strip: randomStripCode(Math.random),
          count,
          daubs: [],
          joinedAt: Date.now(),
        });
      },
      daub(n) {
        const p = playerRef.current;
        if (!p) return;
        const daubs = p.daubs.includes(n) ? p.daubs.filter((d) => d !== n) : [...p.daubs, n];
        savePlayer({ ...p, daubs });
      },
      reshuffle() {
        const p = playerRef.current;
        if (!p || p.daubs.length > 0) return;
        savePlayer({ ...p, strip: randomStripCode(Math.random) });
      },
      leave() {
        savePlayer(null);
      },
      setResult,
    }),
    [loaded, host, player, result, saveHost, savePlayer],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useGame(): GameValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useGame must be used inside GameProvider');
  return v;
}
