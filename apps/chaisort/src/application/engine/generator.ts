import { random } from 'app-kit';
import { PLAIN_COUNT, SPICES } from '@/domain/entities/Ingredient';
import {
  CUP_SIZE,
  HIDDEN,
  TALL_SIZE,
  UNITS,
  type CupSpec,
  type Lesson,
  type Level,
} from '@/domain/entities/Level';
import { route } from './solver';
import { positionOf } from './state';

/** What a level should be like. The generator meets it from a seed, or says it cannot. */
export interface LevelSpec {
  /** Ordinary ingredients on the counter. */
  readonly ingredients: number;
  /** Chosen from the first `pool` ingredients (players meet them in order). */
  readonly pool: number;
  /** Spice ingredients added (0–2). */
  readonly spices: number;
  /** Empty cups to work with. */
  readonly spares: number;
  /** Tall glasses on the counter (they hold TALL_SIZE layers). */
  readonly tall: number;
  /** Layers a tall glass starts with: a deeper mix, with room to spare above it. */
  readonly tallFill: number;
  /** Layers hidden under froth until uncovered. */
  readonly froth: number;
  /** Full cups under a lid, and how many pours it takes to lift. */
  readonly lids: number;
  readonly lidPours: readonly [number, number];
  /** At most this many layers of one ingredient in a starting cup. */
  readonly maxSame: number;
  /** The route length (pours) aimed for; the closest candidate wins. */
  readonly target: number;
  /** Solvable candidates to compare. */
  readonly candidates: number;
  /** Solver effort allowed per candidate (positions). */
  readonly budget: number;
}

/** A little room above the solver's best route: par is what a good player manages. */
export function parFor(best: number): number {
  return best + Math.max(1, Math.round(best * 0.15));
}

function shuffle<T>(items: T[], r: () => number): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [items[i], items[j]] = [items[j]!, items[i]!];
  }
  return items;
}

/** The cups a seed deals for a spec, before checking they can be sorted. */
export function deal(spec: LevelSpec, r: () => number): CupSpec[] | null {
  const pool = Math.min(PLAIN_COUNT, Math.max(spec.ingredients, spec.pool));
  const plain = shuffle(
    Array.from({ length: pool }, (_, i) => i),
    r,
  ).slice(0, spec.ingredients);
  const spices = shuffle([...SPICES], r).slice(0, spec.spices);
  const ings = [...plain, ...spices];
  const units = shuffle(
    ings.flatMap((i) => Array.from({ length: UNITS }, () => i)),
    r,
  );
  // Tall glasses first (a deeper mix with headroom), then cups of four; any
  // remainder makes one part-filled cup.
  const filled: number[][] = [];
  const caps: number[] = [];
  for (let t = 0; t < spec.tall; t++) {
    filled.push(units.splice(0, Math.min(spec.tallFill, TALL_SIZE)));
    caps.push(TALL_SIZE);
  }
  for (let i = 0; i < units.length; i += CUP_SIZE) {
    filled.push(units.slice(i, i + CUP_SIZE));
    caps.push(CUP_SIZE);
  }
  for (const cup of filled) {
    const counts = new Map<number, number>();
    for (const l of cup) counts.set(l, (counts.get(l) ?? 0) + 1);
    if (Math.max(...counts.values()) > spec.maxSame) return null;
  }
  // A spice can only land on its own kind, so one must start at the bottom of a cup.
  for (const s of spices) if (!filled.some((c) => c[0] === s)) return null;

  // Froth hides layers just under the top first, spread over different cups,
  // so it is uncovered soon after play begins.
  let hidden = 0;
  for (let depth = 1; depth < TALL_SIZE && hidden < spec.froth; depth++) {
    for (const c of shuffle(
      filled.map((_, i) => i),
      r,
    )) {
      const cup = filled[c]!;
      const at = cup.length - 1 - depth;
      if (at < 0 || hidden >= spec.froth) continue;
      cup[at] = cup[at]! | HIDDEN;
      hidden++;
    }
  }

  // Lids go on full ordinary cups.
  const lidable = filled.flatMap((c, i) =>
    caps[i] === CUP_SIZE && c.length === CUP_SIZE ? [i] : [],
  );
  const lidded = new Set(shuffle(lidable, r).slice(0, spec.lids));
  const [lo, hi] = spec.lidPours;
  // A tall glass stands among the others rather than always at one end.
  const order = filled.map((_, i) => i).slice(spec.tall);
  for (let t = 0; t < spec.tall; t++) {
    order.splice(Math.floor(r() * (order.length + 1)), 0, t);
  }
  const cups: CupSpec[] = order.map((i) => ({
    cap: caps[i]!,
    lid: lidded.has(i) ? lo + Math.floor(r() * (hi - lo + 1)) : 0,
    layers: filled[i]!,
  }));
  for (let i = 0; i < spec.spares; i++) cups.push({ cap: CUP_SIZE, lid: 0, layers: [] });
  return cups;
}

export interface Generated {
  readonly level: Level;
  /** Positions the solver expanded for the winning candidate. */
  readonly effort: number;
  readonly shortest: boolean;
}

/**
 * Builds a level from a seed: deals cups, keeps only the deals the solver
 * can sort, and of those picks the one whose best route is closest to the
 * spec's target. Deterministic: the same spec and seed give the same level.
 */
export function generate(
  spec: LevelSpec,
  seed: number,
  id: string,
  lesson?: Lesson,
): Generated | null {
  const r = random(seed);
  let chosen: { cups: CupSpec[]; best: number; effort: number; shortest: boolean } | null = null;
  let found = 0;
  const tries = spec.candidates * 40;
  for (let attempt = 0; attempt < tries && found < spec.candidates; attempt++) {
    const cups = deal(spec, r);
    if (!cups) continue;
    const result = route(positionOf({ cups }), spec.budget);
    if (result.status !== 'solved') continue;
    found++;
    const best = result.path.length;
    if (!chosen || Math.abs(best - spec.target) < Math.abs(chosen.best - spec.target)) {
      chosen = { cups, best, effort: result.expanded, shortest: result.shortest };
    }
  }
  if (!chosen) return null;
  return {
    level: { id, cups: chosen.cups, best: chosen.best, par: parFor(chosen.best), lesson },
    effort: chosen.effort,
    shortest: chosen.shortest,
  };
}
