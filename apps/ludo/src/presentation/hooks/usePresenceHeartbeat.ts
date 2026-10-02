import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { presenceService } from '@/config/container';
import type { PresenceStatus } from '@/domain';

/** Comfortably inside the server's staleness window, without chattering. */
const HEARTBEAT_MS = 30_000;
const DEFAULT_TIMEOUT_SECONDS = 75;

export interface PresenceHeartbeat {
  /** Mirrors the server rule, so lists can age friends out between reads. */
  readonly timeoutSeconds: number;
  /** Reports entering or leaving a board, so friends see "In a game". */
  reportAtBoard(playing: boolean): void;
}

/**
 * Owns one thing: telling the server this player is still here.
 *
 * Presence is a heartbeat rather than a session flag, so going quiet is what
 * marks somebody offline. A crash, a closed tab or a dead radio therefore
 * resolves itself with nothing needing to notice.
 */
export function usePresenceHeartbeat(signedIn: boolean): PresenceHeartbeat {
  const [timeoutSeconds, setTimeoutSeconds] = useState(DEFAULT_TIMEOUT_SECONDS);

  /**
   * A ref, not state: this feeds the heartbeat rather than the render, so a
   * screen can report it from an effect without causing a re-render or
   * restarting the interval below.
   */
  const atBoard = useRef(false);

  const statusNow = useCallback((): PresenceStatus => {
    if (AppState.currentState !== 'active') return 'AWAY';
    return atBoard.current ? 'IN_GAME' : 'ONLINE';
  }, []);

  const reportAtBoard = useCallback(
    (playing: boolean) => {
      atBoard.current = playing;
      if (!presenceService || !signedIn) return;
      // Beat immediately so friends see the change now, not an interval later.
      void presenceService.heartbeat(statusNow()).catch(() => undefined);
    },
    [signedIn, statusNow],
  );

  useEffect(() => {
    if (!presenceService || !signedIn) return;
    let active = true;
    void presenceService
      .getTimeoutSeconds()
      .then((seconds) => {
        if (active) setTimeoutSeconds(seconds);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [signedIn]);

  useEffect(() => {
    if (!presenceService || !signedIn) return;
    const service = presenceService;
    let active = true;
    const beat = (status: PresenceStatus) => {
      if (!active) return;
      void service.heartbeat(status).catch(() => undefined);
    };

    beat(statusNow());
    const timer = setInterval(() => beat(statusNow()), HEARTBEAT_MS);
    const listener = AppState.addEventListener('change', () => beat(statusNow()));
    return () => {
      active = false;
      clearInterval(timer);
      listener.remove();
      // Best effort: the staleness window covers us if this never lands.
      void service.heartbeat('OFFLINE').catch(() => undefined);
    };
  }, [signedIn, statusNow]);

  return { timeoutSeconds, reportAtBoard };
}
