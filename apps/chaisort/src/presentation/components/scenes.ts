import { HIDDEN } from '@/domain/entities/Level';
import type { PreviewCup } from '../counter/CounterPreview';

/** Little counters for the home screen, cup themes and how to play. */
export const HERO: readonly PreviewCup[] = [
  { layers: [0, 0, 0, 0] },
  { layers: [1, 2, 3, 1] },
  { layers: [3, 2, 1] },
  { layers: [2, 3] },
  { layers: [] },
];

export const SCENES = {
  pour: [{ layers: [0, 1, 1] }, { layers: [2, 1] }, { layers: [] }],
  serve: [{ layers: [4, 4, 4, 4] }, { layers: [5, 5, 5, 5] }, { layers: [] }],
  froth: [{ layers: [2, 3 | HIDDEN, 6 | HIDDEN, 1] }, { layers: [6, 6, 3] }, { layers: [] }],
  lid: [{ layers: [7, 1, 7, 8], lid: 3 }, { layers: [8, 8] }, { layers: [1, 7] }],
  tall: [{ layers: [5, 9, 9, 0, 5], cap: 6 }, { layers: [0, 0, 9] }, { layers: [] }],
  spice: [{ layers: [11, 2, 11] }, { layers: [11, 11] }, { layers: [] }],
} as const satisfies Record<string, readonly PreviewCup[]>;
