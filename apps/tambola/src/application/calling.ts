import { HIGHEST } from '@/domain/entities/Ticket';
import { random, shuffled } from './seed';

/** The order all 90 numbers are called in: a fixed shuffle of the game's seed. */
export function callOrder(seed: number): number[] {
  return shuffled(
    Array.from({ length: HIGHEST }, (_, i) => i + 1),
    random(seed ^ 0x5eed7a8b),
  );
}

/** The numbers called so far, as a set, after `count` calls. */
export function calledSet(order: readonly number[], count: number): Set<number> {
  return new Set(order.slice(0, Math.max(0, Math.min(order.length, count))));
}

/**
 * Numbers on the player's tickets that were probably called while they
 * looked away. A player's phone does not know how far the host has got, but
 * it knows the call order (it is in the room code): every number they have
 * daubed must have been called, so anything that comes earlier in the order
 * was called too. A mis-tapped daub can make it guess ahead, which is why
 * the screen says "might have missed" and the helper is off by default.
 */
export function missedNumbers(
  order: readonly number[],
  daubed: ReadonlySet<number>,
  onTickets: readonly number[],
): Set<number> {
  const position = new Map(order.map((n, i) => [n, i] as const));
  let furthest = -1;
  for (const n of daubed) {
    if (!onTickets.includes(n)) continue;
    furthest = Math.max(furthest, position.get(n) ?? -1);
  }
  const missed = new Set<number>();
  for (const n of onTickets) {
    if (!daubed.has(n) && (position.get(n) ?? Infinity) < furthest) missed.add(n);
  }
  return missed;
}
