/**
 * Writing surfaces and pens. The everyday desk and two pens are free
 * forever; the rest are Plus, or open for a day after a video the learner
 * chose to watch. Their colours live in the presentation layer.
 */
export type SurfaceId = 'desk' | 'palmLeaf' | 'kraft' | 'blackboard' | 'midnight';
export type PenId =
  'ink' | 'pencil' | 'gold' | 'fountain' | 'vermilion' | 'chalkRose' | 'chalkMint';

export interface Surface {
  readonly id: SurfaceId;
  readonly premium: boolean;
}

export interface Pen {
  readonly id: PenId;
  readonly premium: boolean;
  readonly nib: 'round' | 'broad' | 'chalk';
  /** Width relative to the chosen pen thickness. */
  readonly widthFactor: number;
}

export const SURFACES: readonly Surface[] = [
  { id: 'desk', premium: false },
  { id: 'palmLeaf', premium: true },
  { id: 'kraft', premium: true },
  { id: 'blackboard', premium: true },
  { id: 'midnight', premium: true },
];

export const PENS: readonly Pen[] = [
  { id: 'ink', premium: false, nib: 'round', widthFactor: 1 },
  { id: 'pencil', premium: false, nib: 'round', widthFactor: 0.8 },
  { id: 'gold', premium: true, nib: 'round', widthFactor: 1 },
  { id: 'fountain', premium: true, nib: 'broad', widthFactor: 1.15 },
  { id: 'vermilion', premium: true, nib: 'round', widthFactor: 1 },
  { id: 'chalkRose', premium: true, nib: 'chalk', widthFactor: 1.1 },
  { id: 'chalkMint', premium: true, nib: 'chalk', widthFactor: 1.1 },
];

export function surfaceById(id: string): Surface {
  return SURFACES.find((s) => s.id === id) ?? SURFACES[0]!;
}

export function penById(id: string): Pen {
  return PENS.find((p) => p.id === id) ?? PENS[0]!;
}

/** Day passes are kept per item; pens and surfaces share one id space. */
export function passId(kind: 'pen' | 'surface', id: string): string {
  return `${kind}.${id}`;
}
