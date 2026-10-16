/**
 * A Tambola (Housie) ticket: 3 rows by 9 columns, 15 numbers, exactly five
 * in every row. Column c holds numbers from its range (1–9, 10–19, …,
 * 80–90), one to three of them, ascending from top to bottom. Empty cells
 * are null.
 */
export type Cell = number | null;
export type TicketRow = readonly Cell[];
export type TicketGrid = readonly TicketRow[];

export const ROWS = 3;
export const COLUMNS = 9;
export const NUMBERS_PER_TICKET = 15;
export const NUMBERS_PER_ROW = 5;
export const HIGHEST = 90;

/** The column a number belongs to: 1–9 → 0, 10–19 → 1, …, 80–90 → 8. */
export function columnOf(n: number): number {
  return n === HIGHEST ? COLUMNS - 1 : Math.floor(n / 10);
}

/** The numbers a column may hold, lowest first. */
export function columnRange(c: number): readonly [number, number] {
  if (c === 0) return [1, 9];
  if (c === COLUMNS - 1) return [80, 90];
  return [c * 10, c * 10 + 9];
}

/** The ticket's numbers in reading order (row by row, left to right). */
export function ticketNumbers(grid: TicketGrid): number[] {
  const out: number[] = [];
  for (const row of grid) for (const cell of row) if (cell !== null) out.push(cell);
  return out;
}

export function rowNumbers(grid: TicketGrid, row: number): number[] {
  return (grid[row] ?? []).filter((c): c is number => c !== null);
}

/** Checks every rule of a standard ticket; used by tests and as a guard on generated tickets. */
export function isValidTicket(grid: TicketGrid): boolean {
  if (grid.length !== ROWS) return false;
  const seen = new Set<number>();
  for (const row of grid) {
    if (row.length !== COLUMNS) return false;
    if (row.filter((c) => c !== null).length !== NUMBERS_PER_ROW) return false;
  }
  for (let c = 0; c < COLUMNS; c++) {
    const [lo, hi] = columnRange(c);
    const column = grid.map((row) => row[c] ?? null).filter((v): v is number => v !== null);
    if (column.length < 1 || column.length > 3) return false;
    for (let i = 0; i < column.length; i++) {
      const v = column[i]!;
      if (!Number.isInteger(v) || v < lo || v > hi || seen.has(v)) return false;
      if (i > 0 && v <= column[i - 1]!) return false;
      seen.add(v);
    }
  }
  return seen.size === NUMBERS_PER_TICKET;
}
