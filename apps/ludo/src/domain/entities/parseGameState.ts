import { getFinishProgress } from '../board';
import type { GameState } from './GameState';
import type { Piece } from './Piece';
import { ALL_PLAYER_COLORS } from './PlayerColor';

/**
 * Validates a board that came from outside this process — local storage, or
 * another player via the server — before the engine is allowed to trust it.
 *
 * Shared by both sources deliberately. A board arriving over the network is
 * no more trustworthy than one read off disk, and having one definition means
 * the two cannot drift into disagreeing about what a legal board looks like.
 */
export function isGameState(value: unknown, expectedPlayers: number): value is GameState {
  const s = value as GameState | null;
  if (!Number.isInteger(expectedPlayers) || expectedPlayers < 2 || expectedPlayers > 8)
    return false;
  if (!s || typeof s !== 'object') return false;
  if (!Array.isArray(s.players) || s.players.length !== expectedPlayers) return false;
  if (s.players.some((p) => !p || typeof p !== 'object')) return false;
  if (new Set(s.players.map((p) => p.color)).size !== s.players.length) return false;
  if (
    !Number.isInteger(s.currentPlayerIndex) ||
    s.currentPlayerIndex < 0 ||
    s.currentPlayerIndex >= s.players.length
  ) {
    return false;
  }
  if (!Number.isInteger(s.consecutiveSixes) || s.consecutiveSixes < 0 || s.consecutiveSixes > 3) {
    return false;
  }
  if (!([null, 1, 2, 3, 4, 5, 6] as unknown[]).includes(s.lastRoll)) return false;
  if (!['IN_PROGRESS', 'FINISHED'].includes(s.status)) return false;
  if (s.teams !== undefined && (s.teams !== true || s.players.length !== 4)) return false;
  if (s.goal !== undefined && s.goal !== 1 && s.goal !== 2) return false;
  if (s.killToEnter !== undefined && s.killToEnter !== true) return false;
  if (s.killToEnter && s.goal !== undefined) return false;
  if (s.killToEnter) {
    const colors = s.players.map((p) => p.color);
    if (
      !Array.isArray(s.hunters) ||
      new Set(s.hunters).size !== s.hunters.length ||
      s.hunters.some((c) => !colors.includes(c))
    )
      return false;
  } else if (s.hunters !== undefined) return false;

  const seats = s.players.length;
  const finish = getFinishProgress(seats);
  const allowed = ALL_PLAYER_COLORS.slice(0, seats > 4 ? seats : 4);
  const seatsValid = s.players.every(
    (p) =>
      allowed.includes(p.color) &&
      p.id === p.color &&
      Array.isArray(p.pieces) &&
      p.pieces.length === 4 &&
      p.pieces.every(
        (piece: Piece, index: number) =>
          piece !== null &&
          typeof piece === 'object' &&
          piece.id === `${p.color}-${index}` &&
          piece.color === p.color &&
          Number.isInteger(piece.progress) &&
          piece.progress >= 0 &&
          piece.progress <= finish,
      ),
  );
  if (!seatsValid) return false;

  // A finished board must name a winner who actually got everybody home, and
  // an unfinished one must not name a winner at all.
  const goal = s.goal ?? 4;
  const home = (index: number) =>
    s.players[index]!.pieces.filter((piece: Piece) => piece.progress === finish).length >= goal;
  if (s.status === 'IN_PROGRESS') return s.winnerColor === null;
  const winner = s.players.findIndex((p) => p.color === s.winnerColor);
  if (winner < 0) return false;
  // In a team game the winner's partner must be home too.
  return s.teams ? home(winner) && home((winner + 2) % 4) : home(winner);
}
