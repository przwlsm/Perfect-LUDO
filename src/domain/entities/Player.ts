import { getFinishProgress } from '../board';
import type { Piece } from './Piece';
import type { PlayerColor } from './PlayerColor';

export interface Player {
  readonly id: string;
  readonly color: PlayerColor;
  readonly pieces: readonly Piece[];
}

export function hasPlayerWon(player: Player, playerCount = 4): boolean {
  return player.pieces.every((piece) => piece.progress === getFinishProgress(playerCount));
}
