import { nodeName, type Move } from 'baghchal-engine';

/**
 * A move as players write it: a placed goat by its point ("C3"), a move by
 * its two points ("A1-B2"), a jump by where the tiger left and landed with
 * an × for the goat taken between ("A1xC1").
 */
export function describeMove(move: Move): string {
  switch (move.kind) {
    case 'place':
      return nodeName(move.to);
    case 'move':
      return `${nodeName(move.from)}-${nodeName(move.to)}`;
    case 'jump':
      return `${nodeName(move.from)}x${nodeName(move.to)}`;
  }
}
