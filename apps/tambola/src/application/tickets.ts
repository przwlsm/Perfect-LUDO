import {
  COLUMNS,
  columnRange,
  NUMBERS_PER_ROW,
  ROWS,
  type Cell,
  type TicketGrid,
} from '@/domain/entities/Ticket';
import { random, shuffled } from './seed';

export const STRIP_SIZE = 6;
/** Numbers in each column beyond the one every ticket of a strip gets (9, 10×7, 11 numbers). */
const EXTRAS: readonly number[] = [3, 4, 4, 4, 4, 4, 4, 4, 5];
const EXTRA_PER_TICKET = 6;

/**
 * A traditional strip of six tickets: together they hold every number from
 * 1 to 90 exactly once, so every call lands on exactly one ticket. Each
 * ticket is a standard ticket on its own. The same seed always gives the
 * same strip.
 */
export function generateStrip(seed: number): TicketGrid[] {
  const rng = random(seed);
  const counts = columnCounts(rng);
  const layouts = counts.map((k) => rowLayout(k, rng));
  const grids: Cell[][][] = layouts.map(() =>
    Array.from({ length: ROWS }, () => Array<Cell>(COLUMNS).fill(null)),
  );
  for (let c = 0; c < COLUMNS; c++) {
    const [lo, hi] = columnRange(c);
    const pool = shuffled(
      Array.from({ length: hi - lo + 1 }, (_, i) => lo + i),
      rng,
    );
    let next = 0;
    for (let t = 0; t < STRIP_SIZE; t++) {
      const k = counts[t]![c]!;
      const mine = pool.slice(next, next + k).sort((a, b) => a - b);
      next += k;
      let i = 0;
      for (let r = 0; r < ROWS; r++) {
        if (layouts[t]![r]![c]) grids[t]![r]![c] = mine[i++]!;
      }
    }
  }
  return grids;
}

/** One standard ticket from a seed. */
export function generateTicket(seed: number): TicketGrid {
  return generateStrip(seed)[0]!;
}

/**
 * How many numbers each ticket gets in each column: one each to start, then
 * the column's extras dealt out so every ticket ends with fifteen and no
 * column of a ticket holds more than three.
 */
function columnCounts(rng: () => number): number[][] {
  for (let attempt = 0; attempt < 40; attempt++) {
    const counts = Array.from({ length: STRIP_SIZE }, () => Array<number>(COLUMNS).fill(1));
    const need = Array<number>(STRIP_SIZE).fill(EXTRA_PER_TICKET);
    let ok = true;
    for (const c of shuffled([...Array(COLUMNS).keys()], rng)) {
      for (let e = 0; e < EXTRAS[c]! && ok; e++) {
        const open = [...Array(STRIP_SIZE).keys()].filter(
          (t) => need[t]! > 0 && counts[t]![c]! < 3,
        );
        const total = open.reduce((s, t) => s + need[t]!, 0);
        if (total === 0) {
          ok = false;
          break;
        }
        // Weighted by what each ticket still needs, so the deal stays balanced.
        let pick = rng() * total;
        let chosen = open[open.length - 1]!;
        for (const t of open) {
          pick -= need[t]!;
          if (pick < 0) {
            chosen = t;
            break;
          }
        }
        counts[chosen]![c]!++;
        need[chosen]!--;
      }
      if (!ok) break;
    }
    if (ok && need.every((n) => n === 0)) return counts;
  }
  return greedyCounts(rng);
}

/**
 * The deal that always works (at most two numbers per column of a ticket):
 * the biggest columns first, each extra to the tickets that need the most.
 */
function greedyCounts(rng: () => number): number[][] {
  const counts = Array.from({ length: STRIP_SIZE }, () => Array<number>(COLUMNS).fill(1));
  const need = Array<number>(STRIP_SIZE).fill(EXTRA_PER_TICKET);
  const columns = shuffled([...Array(COLUMNS).keys()], rng).sort((a, b) => EXTRAS[b]! - EXTRAS[a]!);
  for (const c of columns) {
    const tickets = shuffled([...Array(STRIP_SIZE).keys()], rng)
      .sort((a, b) => need[b]! - need[a]!)
      .slice(0, EXTRAS[c]!);
    for (const t of tickets) {
      counts[t]![c]!++;
      need[t]!--;
    }
  }
  return counts;
}

/**
 * Which rows of a ticket each column's numbers sit in, so every row holds
 * exactly five. Fullest columns first, each into the rows with the most room
 * (ties broken at random): with these sizes it always fits.
 */
function rowLayout(k: readonly number[], rng: () => number): boolean[][] {
  const layout = Array.from({ length: ROWS }, () => Array<boolean>(COLUMNS).fill(false));
  const room = Array<number>(ROWS).fill(NUMBERS_PER_ROW);
  const columns = shuffled([...Array(COLUMNS).keys()], rng).sort((a, b) => k[b]! - k[a]!);
  for (const c of columns) {
    const rows = shuffled([...Array(ROWS).keys()], rng)
      .sort((a, b) => room[b]! - room[a]!)
      .slice(0, k[c]!);
    for (const r of rows) {
      layout[r]![c] = true;
      room[r]!--;
    }
  }
  return layout;
}
