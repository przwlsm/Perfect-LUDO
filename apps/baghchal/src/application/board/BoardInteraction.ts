import { legalMoves, type GameState, type Move, type Node } from 'baghchal-engine';

export interface TapOutcome {
  /** The piece now picked up, or null. */
  readonly selected: Node | null;
  /** The move the tap completed, if any. */
  readonly move: Move | null;
}

/**
 * What a tap on `node` means for the side to move: place a goat from the
 * hand, pick a piece up, set it down on a legal point, or drop the
 * selection. Pure, so the whole board interaction is tested without a UI.
 */
export function interpretTap(state: GameState, selected: Node | null, node: Node): TapOutcome {
  const moves = legalMoves(state);
  const placement = moves.find((move) => move.kind === 'place' && move.to === node);
  if (placement) return { selected: null, move: placement };
  if (selected !== null) {
    const move = moves.find((m) => m.kind !== 'place' && m.from === selected && m.to === node);
    if (move) return { selected: null, move };
  }
  // One of the mover's own pieces that can go somewhere: pick it up (or put
  // it back down when it was already held). Anything else clears the selection.
  const canMove = moves.some((move) => move.kind !== 'place' && move.from === node);
  if (!canMove) return { selected: null, move: null };
  return { selected: selected === node ? null : node, move: null };
}

/** Where the held piece may go, for highlighting. */
export function targetsFrom(state: GameState, selected: Node | null): readonly Node[] {
  if (selected === null) return [];
  return legalMoves(state).flatMap((move) =>
    move.kind !== 'place' && move.from === selected ? [move.to] : [],
  );
}
