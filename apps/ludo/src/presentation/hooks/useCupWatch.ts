import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { cupsRepository } from '@/config/container';
import {
  createGame,
  rollDice,
  seatColors,
  type GameState,
  type OnlineMatchSnapshot,
} from '@/domain';
import { i18n } from '../i18n';

/** How often a watched table is read; each read also plays a computer table's due turns. */
export const WATCH_POLL_MS = 1200;

export interface WatchedTable {
  readonly snapshot: OnlineMatchSnapshot;
  /** The board as the players see it, the rolled die included. */
  readonly board: GameState;
}

const message = (e: unknown) => (e instanceof Error ? e.message : i18n.t('common:errors.generic'));

async function boardOf(next: OnlineMatchSnapshot): Promise<GameState> {
  const base =
    next.match.state ??
    createGame(seatColors(next.match.playerCount), {
      variant: next.match.variant,
      teams: next.match.teams,
    });
  return next.match.lastRoll ? rollDice(base, { nextInt: async () => next.match.lastRoll! }) : base;
}

/**
 * Watches one table of the player's cup, read-only, until it is decided.
 * Reads pause while the app is in the background and stop once the table
 * has finished, keeping the final board on screen.
 */
export function useCupWatch(lobbyId: string | undefined) {
  const [table, setTable] = useState<WatchedTable | null>(null);
  const [error, setError] = useState<string | null>(null);
  const version = useRef(-1);

  useEffect(() => {
    if (!lobbyId || !cupsRepository) return;
    const repo = cupsRepository;
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let active = AppState.currentState === 'active';
    let reading = false;

    const read = async () => {
      timer = null;
      if (!alive || reading) return;
      reading = true;
      try {
        const next = await repo.watch(lobbyId);
        if (!alive) return;
        if (next.match.version !== version.current) {
          version.current = next.match.version;
          const board = await boardOf(next);
          if (!alive) return;
          setTable({ snapshot: next, board });
        }
        setError(null);
        if (next.match.status !== 'IN_PROGRESS') return; // decided: nothing more to watch
      } catch (e) {
        if (alive) setError(message(e));
      } finally {
        reading = false;
      }
      if (alive && active) timer = setTimeout(() => void read(), WATCH_POLL_MS);
    };

    const app = AppState.addEventListener('change', (state) => {
      const wasActive = active;
      active = state === 'active';
      if (active && !wasActive && !timer) void read();
      if (!active && timer) {
        clearTimeout(timer);
        timer = null;
      }
    });
    void read();
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
      app.remove();
    };
  }, [lobbyId]);

  return { table, error };
}
