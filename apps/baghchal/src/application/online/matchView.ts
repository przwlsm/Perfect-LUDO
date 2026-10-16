import { opponent, type Side } from 'baghchal-engine';
import type { OnlineMatchSnapshot } from '@/domain/entities/OnlineMatch';

export function isMyTurn(snapshot: OnlineMatchSnapshot): boolean {
  const { match, mySide } = snapshot;
  return match.status === 'ACTIVE' && mySide !== null && match.state.turn === mySide;
}

export function opponentSide(snapshot: OnlineMatchSnapshot): Side | null {
  return snapshot.mySide === null ? null : opponent(snapshot.mySide);
}

/**
 * Seconds left on the move clock, or null when no clock runs. Measured from
 * the server's clock at the moment the snapshot was received, so a device
 * whose clock is wrong still counts down correctly.
 */
export function secondsLeft(
  snapshot: OnlineMatchSnapshot,
  receivedAt: number,
  now: number,
): number | null {
  const { match } = snapshot;
  if (match.status !== 'ACTIVE' || !match.turnDeadline) return null;
  const serverNow = Date.parse(snapshot.serverNow);
  const deadline = Date.parse(match.turnDeadline);
  if (Number.isNaN(serverNow) || Number.isNaN(deadline)) return null;
  // `now` may come from a ticker that last fired before the snapshot arrived.
  const elapsed = Math.max(0, now - receivedAt);
  const remaining = deadline - serverNow - elapsed;
  return Math.max(0, Math.ceil(remaining / 1000));
}

/** Whether this device may claim the game because the opponent's clock has run out. */
export function canClaimTimeout(
  snapshot: OnlineMatchSnapshot,
  receivedAt: number,
  now: number,
): boolean {
  const { match, mySide } = snapshot;
  if (match.status !== 'ACTIVE' || mySide === null || match.state.turn === mySide) return false;
  return secondsLeft(snapshot, receivedAt, now) === 0;
}
