import { useEffect, useState } from 'react';
import { cupsRepository } from '@/config/container';
import { cupGameMinutes, type CupGameLength } from '@/domain';

/** The average moves slowly, so one read serves every screen for a while. */
const FRESH_MS = 10 * 60 * 1000;
let cached: { length: CupGameLength; at: number } | null = null;
let inFlight: Promise<CupGameLength | null> | null = null;

function fetchLength(): Promise<CupGameLength | null> {
  if (cached && Date.now() - cached.at < FRESH_MS) return Promise.resolve(cached.length);
  if (!cupsRepository) return Promise.resolve(null);
  inFlight ??= cupsRepository
    .gameLength()
    .then((length) => {
      cached = { length, at: Date.now() };
      return length;
    })
    // No average is not worth an error: the estimate is shown instead.
    .catch(() => null)
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

/**
 * Minutes for one Royal Road game and for a whole cup: the server's average
 * of recent real games once there are enough, our estimate until then.
 * Needs a signed-in session (guests count) to ask the server.
 */
export function useCupGameLength(signedIn: boolean) {
  const [length, setLength] = useState<CupGameLength | null>(cached?.length ?? null);
  useEffect(() => {
    if (!signedIn) return;
    let alive = true;
    void fetchLength().then((next) => {
      if (alive && next) setLength(next);
    });
    return () => {
      alive = false;
    };
  }, [signedIn]);
  return cupGameMinutes(length);
}
