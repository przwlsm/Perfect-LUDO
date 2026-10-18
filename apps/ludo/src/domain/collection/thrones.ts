/**
 * The Royal Road: the eight cups and the throne each one awards. The cups
 * themselves arrive with 0035; the Collection Room already shows every
 * throne, lit once won and a dim silhouette until then.
 */
export interface CupDef {
  readonly id: string;
  /** Coins to enter; 0 is free. */
  readonly entry: number;
  /** Winner's prize (3x entry) and the runner-up's (entry back). */
  readonly prize: number;
  readonly runnerUp: number;
  /** The game mode the hall plays. Every hall plays Quick 2 for now (0041): a cup is two games back to back. */
  readonly variant: 'quick1' | 'quick2' | 'classic';
  /**
   * Whether friends can open a private cup here. Halls 1 to 5 only (0042):
   * in the top halls friends could agree who takes a big pot.
   */
  readonly friends: boolean;
  /** The throne's look: a base and a highlight. */
  readonly throne: { readonly base: string; readonly light: string; readonly gem: string | null };
}

export const CUPS = [
  {
    id: 'village',
    entry: 0,
    prize: 300,
    runnerUp: 100,
    variant: 'quick2',
    friends: true,
    throne: { base: '#8b5a2b', light: '#c98f55', gem: null },
  },
  {
    id: 'merchant',
    entry: 250,
    prize: 750,
    runnerUp: 250,
    variant: 'quick2',
    friends: true,
    throne: { base: '#a05a2c', light: '#e08b4f', gem: null },
  },
  {
    id: 'knight',
    entry: 1000,
    prize: 3000,
    runnerUp: 1000,
    variant: 'quick2',
    friends: true,
    throne: { base: '#8a94a6', light: '#dfe5ee', gem: '#5b6b8a' },
  },
  {
    id: 'baron',
    entry: 5000,
    prize: 15000,
    runnerUp: 5000,
    variant: 'quick2',
    friends: true,
    throne: { base: '#b8860b', light: '#ffd76a', gem: '#c0392b' },
  },
  {
    id: 'duke',
    entry: 25000,
    prize: 75000,
    runnerUp: 25000,
    variant: 'quick2',
    friends: true,
    throne: { base: '#1f4e9c', light: '#6fa3ff', gem: '#2563eb' },
  },
  {
    id: 'king',
    entry: 75000,
    prize: 225000,
    runnerUp: 75000,
    variant: 'quick2',
    friends: false,
    throne: { base: '#9b1c31', light: '#ff6b81', gem: '#e11d48' },
  },
  {
    id: 'emperor',
    entry: 200000,
    prize: 600000,
    runnerUp: 200000,
    variant: 'quick2',
    friends: false,
    throne: { base: '#4b5563', light: '#e5f6ff', gem: '#a5f3fc' },
  },
  {
    id: 'legends',
    entry: 500000,
    prize: 1500000,
    runnerUp: 500000,
    variant: 'quick2',
    friends: false,
    throne: { base: '#111827', light: '#fbbf24', gem: '#f59e0b' },
  },
] as const satisfies readonly CupDef[];

export type CupId = (typeof CUPS)[number]['id'];

export function getCup(id: string): (typeof CUPS)[number] | null {
  return CUPS.find((c) => c.id === id) ?? null;
}
