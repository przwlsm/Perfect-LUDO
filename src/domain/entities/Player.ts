import type { Piece } from './Piece';
import type { PlayerColor } from './PlayerColor';

export interface Player {
  readonly id: string;
  readonly color: PlayerColor;
  readonly pieces: readonly Piece[];
}

export function hasPlayerWon(player: Player): boolean {
  return player.pieces.every((piece) => piece.progress === 57);
}
