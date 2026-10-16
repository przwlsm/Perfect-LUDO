/**
 * The kolam puzzle: a grid of rice-flour dots (pulli). Some cells hold a
 * number, 0 to 3, telling how many of that cell's four sides the line uses.
 * The player draws one closed loop along the dots, with no branches and no
 * crossings, that satisfies every number.
 *
 * Each side between two neighbouring dots is an edge, and an edge is in one
 * of three states: not decided yet, part of the line, or crossed out
 * ("no line here").
 */
export const UNKNOWN = 0;
export const LINE = 1;
export const CROSS = 2;
export type Mark = typeof UNKNOWN | typeof LINE | typeof CROSS;

/** A cell without a number. */
export const NO_CLUE = -1;

export interface Puzzle {
  readonly rows: number;
  readonly cols: number;
  /** Row-major, one per cell: 0–3, or NO_CLUE. */
  readonly clues: readonly number[];
}

/**
 * How much thinking a board needs, by the hardest idea its solution uses:
 * 1 counting and dots, 2 corner and pair patterns, 3 looking a few moves
 * ahead, 4 guessing (never shipped).
 */
export type Tier = 1 | 2 | 3 | 4;

/** The ideas the first levels teach, one at a time. */
export type Lesson = 'loop' | 'zero' | 'cross' | 'corner' | 'dots' | 'closing' | 'threes' | 'ahead';

export interface Level {
  /** "12" for level 12, "d215" for daily puzzle #215. */
  readonly id: string;
  readonly puzzle: Puzzle;
  readonly tier: Tier;
  readonly lesson?: Lesson;
}

export function sizeLabel(p: Puzzle): string {
  return `${p.cols}×${p.rows}`;
}

/** Stars for a solve: three without hints, two with one, one otherwise. */
export function starsFor(hintsUsed: number): 1 | 2 | 3 {
  return hintsUsed <= 0 ? 3 : hintsUsed === 1 ? 2 : 1;
}

/** Puzzles travel as text: "rows;cols;tier;clues", clues row-major with '.' for none. */
export function encodePuzzle(p: Puzzle, tier: Tier): string {
  const clues = p.clues.map((c) => (c === NO_CLUE ? '.' : String(c))).join('');
  return `${p.rows};${p.cols};${tier};${clues}`;
}

export function decodePuzzle(text: string): { puzzle: Puzzle; tier: Tier } {
  const [rows, cols, tier, clues] = text.split(';');
  const r = Number(rows);
  const c = Number(cols);
  const tierNumber = Number(tier);
  if (!Number.isInteger(r) || !Number.isInteger(c) || r < 1 || c < 1 || !clues) {
    throw new Error(`Bad puzzle: ${text}`);
  }
  if (clues.length !== r * c) throw new Error(`Bad clue count: ${text}`);
  const list = Array.from(clues, (ch) => (ch === '.' ? NO_CLUE : Number(ch)));
  if (list.some((v) => !(v === NO_CLUE || (v >= 0 && v <= 3)))) {
    throw new Error(`Bad clue: ${text}`);
  }
  return {
    puzzle: { rows: r, cols: c, clues: list },
    tier: (tierNumber >= 1 && tierNumber <= 4 ? tierNumber : 1) as Tier,
  };
}
