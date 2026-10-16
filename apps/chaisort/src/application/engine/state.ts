import { isSpice } from '@/domain/entities/Ingredient';
import { HIDDEN, ingOf, isHidden, UNITS, type Level } from '@/domain/entities/Level';

/**
 * A position on the counter: what every cup holds (bottom first), how much
 * it can hold, and how many pours each lid still needs before it lifts.
 * Immutable: a pour returns a new position.
 */
export interface Pos {
  readonly cups: readonly (readonly number[])[];
  readonly caps: readonly number[];
  readonly lids: readonly number[];
}

/** A pour: `amount` layers of ingredient `ing` from cup `from` into cup `to`. */
export interface Pour {
  readonly from: number;
  readonly to: number;
  readonly ing: number;
  readonly amount: number;
}

/** Why a pour cannot happen, so the game can say so kindly. */
export type Refusal =
  'same' | 'empty' | 'lidFrom' | 'lidTo' | 'served' | 'full' | 'mismatch' | 'spice';

export type Check =
  { readonly ok: true; readonly pour: Pour } | { readonly ok: false; readonly why: Refusal };

export function positionOf(level: Pick<Level, 'cups'>): Pos {
  return {
    cups: level.cups.map((c) => [...c.layers]),
    caps: level.cups.map((c) => c.cap),
    lids: level.cups.map((c) => c.lid),
  };
}

/** The top run: the ingredient on top and how many visible layers of it sit together there. */
export function topRun(cup: readonly number[]): { ing: number; n: number } | null {
  const top = cup[cup.length - 1];
  if (top === undefined) return null;
  const ing = ingOf(top);
  let n = 0;
  for (let i = cup.length - 1; i >= 0; i--) {
    const l = cup[i]!;
    if (isHidden(l) || ingOf(l) !== ing) break;
    n++;
  }
  // The top layer is always in view, even if the data says otherwise.
  return { ing, n: Math.max(1, n) };
}

/** A served cup: every layer of one ingredient, gathered. It steams and stays put. */
export function isServed(cup: readonly number[]): boolean {
  if (cup.length !== UNITS) return false;
  const ing = ingOf(cup[0]!);
  for (const l of cup) if (ingOf(l) !== ing) return false;
  return true;
}

export function check(pos: Pos, from: number, to: number): Check {
  if (from === to) return { ok: false, why: 'same' };
  const src = pos.cups[from];
  const dst = pos.cups[to];
  if (!src || !dst || src.length === 0) return { ok: false, why: 'empty' };
  if ((pos.lids[from] ?? 0) > 0) return { ok: false, why: 'lidFrom' };
  if ((pos.lids[to] ?? 0) > 0) return { ok: false, why: 'lidTo' };
  if (isServed(src)) return { ok: false, why: 'served' };
  const room = (pos.caps[to] ?? 0) - dst.length;
  if (room <= 0) return { ok: false, why: 'full' };
  const run = topRun(src)!;
  if (dst.length === 0) {
    if (isSpice(run.ing)) return { ok: false, why: 'spice' };
  } else if (ingOf(dst[dst.length - 1]!) !== run.ing) {
    return { ok: false, why: 'mismatch' };
  }
  return { ok: true, pour: { from, to, ing: run.ing, amount: Math.min(run.n, room) } };
}

/** The position after a legal pour. Uncovered froth is revealed; lids count down. */
export function applyPour(pos: Pos, p: Pour): Pos {
  const cups = pos.cups.slice();
  const src = pos.cups[p.from]!.slice(0, pos.cups[p.from]!.length - p.amount);
  const dst = pos.cups[p.to]!.slice();
  for (let i = 0; i < p.amount; i++) dst.push(p.ing);
  if (src.length > 0) src[src.length - 1] = src[src.length - 1]! & ~HIDDEN;
  cups[p.from] = reveal(src);
  cups[p.to] = reveal(dst);
  const lids = pos.lids.some((l) => l > 0) ? pos.lids.map((l) => Math.max(0, l - 1)) : pos.lids;
  return { cups, caps: pos.caps, lids };
}

/** A cup that just became served shows every layer. */
function reveal(cup: number[]): number[] {
  if (!isServed(cup) || !cup.some(isHidden)) return cup;
  return cup.map((l) => l & ~HIDDEN);
}

/** Pours `from` into `to` if it is legal; null otherwise. */
export function tryPour(pos: Pos, from: number, to: number): { pos: Pos; pour: Pour } | null {
  const c = check(pos, from, to);
  return c.ok ? { pos: applyPour(pos, c.pour), pour: c.pour } : null;
}

/** Every legal pour, in cup order. */
export function legalPours(pos: Pos): Pour[] {
  const out: Pour[] = [];
  for (let from = 0; from < pos.cups.length; from++) {
    for (let to = 0; to < pos.cups.length; to++) {
      const c = check(pos, from, to);
      if (c.ok) out.push(c.pour);
    }
  }
  return out;
}

/** Sorted: every cup is empty or served. */
export function isSolved(pos: Pos): boolean {
  return pos.cups.every((c) => c.length === 0 || isServed(c));
}

export function servedCount(pos: Pos): number {
  return pos.cups.reduce((n, c) => n + (isServed(c) ? 1 : 0), 0);
}

/** Cups that make up the order: one per ingredient on the counter. */
export function orderSize(pos: Pos): number {
  const seen = new Set<number>();
  for (const c of pos.cups) for (const l of c) seen.add(ingOf(l));
  return seen.size;
}

/**
 * The position's identity, the same however the cups are arranged: cups of
 * the same size and lid are interchangeable, so the solver never visits a
 * reshuffle of a position it has already seen.
 */
export function keyOf(pos: Pos): string {
  const parts: string[] = new Array(pos.cups.length);
  for (let i = 0; i < pos.cups.length; i++) {
    let s = String.fromCharCode(48 + pos.caps[i]!, 48 + (pos.lids[i] ?? 0));
    const cup = pos.cups[i]!;
    for (let j = 0; j < cup.length; j++) s += String.fromCharCode(65 + cup[j]!);
    parts[i] = s;
  }
  parts.sort();
  return parts.join('|');
}

/** Adds an empty cup (the "extra cup" assist). */
export function withExtraCup(pos: Pos, cap: number): Pos {
  return { cups: [...pos.cups, []], caps: [...pos.caps, cap], lids: [...pos.lids, 0] };
}
