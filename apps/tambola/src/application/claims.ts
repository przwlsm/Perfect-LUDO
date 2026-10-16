import type { PrizeId } from '@/domain/entities/Prize';
import { rowNumbers, ticketNumbers, type TicketGrid } from '@/domain/entities/Ticket';

export const EARLY_FIVE = 5;

/**
 * The numbers a prize asks for on a ticket. Early Five asks for any five of
 * the fifteen, so it returns all fifteen and `needed` says how many count.
 */
export function prizeNumbers(
  grid: TicketGrid,
  prize: PrizeId,
): { numbers: number[]; needed: number } {
  switch (prize) {
    case 'early5':
      return { numbers: ticketNumbers(grid), needed: EARLY_FIVE };
    case 'top':
      return all(rowNumbers(grid, 0));
    case 'middle':
      return all(rowNumbers(grid, 1));
    case 'bottom':
      return all(rowNumbers(grid, 2));
    case 'corners': {
      const top = rowNumbers(grid, 0);
      const bottom = rowNumbers(grid, 2);
      return all([top[0]!, top[top.length - 1]!, bottom[0]!, bottom[bottom.length - 1]!]);
    }
    case 'full':
      return all(ticketNumbers(grid));
  }
}

function all(numbers: number[]) {
  return { numbers, needed: numbers.length };
}

export interface ClaimCheck {
  readonly valid: boolean;
  /** Required numbers that have been called. */
  readonly matched: readonly number[];
  /** Required numbers not called yet (for Early Five: every uncalled number on the ticket). */
  readonly missing: readonly number[];
  /** How many more calls the claim still needs (0 when valid). */
  readonly short: number;
}

/** A claim is valid only when every number it needs has been called. Anything else is bogus. */
export function checkClaim(
  grid: TicketGrid,
  prize: PrizeId,
  called: ReadonlySet<number>,
): ClaimCheck {
  const { numbers, needed } = prizeNumbers(grid, prize);
  const matched = numbers.filter((n) => called.has(n));
  const missing = numbers.filter((n) => !called.has(n));
  const short = Math.max(0, needed - matched.length);
  return { valid: short === 0, matched, missing, short };
}

/**
 * The call (0-based position in `order`) on which a ticket completes a prize,
 * or -1 if it never does (it always does by the 90th call).
 */
export function completesAt(grid: TicketGrid, prize: PrizeId, order: readonly number[]): number {
  const { numbers, needed } = prizeNumbers(grid, prize);
  const wanted = new Set(numbers);
  let got = 0;
  for (let i = 0; i < order.length; i++) {
    if (wanted.has(order[i]!) && ++got >= needed) return i;
  }
  return -1;
}

/** The best of several tickets: the first call on which any of them completes the prize. */
export function firstCompletion(
  grids: readonly TicketGrid[],
  prize: PrizeId,
  order: readonly number[],
): number {
  let best = -1;
  for (const g of grids) {
    const at = completesAt(g, prize, order);
    if (at >= 0 && (best < 0 || at < best)) best = at;
  }
  return best;
}
