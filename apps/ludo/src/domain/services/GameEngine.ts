import { getFinishProgress } from '../board';
import type { GameState } from '../entities/GameState';
import { getCurrentPlayer, isTeamGame, partnerOf } from '../entities/GameState';
import { hasPlayerWon } from '../entities/Player';
import { coinsToWin, mayEnterHome, variantRules, type GameVariant } from '../entities/Variant';
import type { Player } from '../entities/Player';
import { ALL_PLAYER_COLORS, type DieValue, type PlayerColor } from '../entities/PlayerColor';
import type { IRandomProvider } from '../ports/IRandomProvider';
import { getValidMoves as computeValidMoves, type Move } from './MoveValidator';
import { findWinner } from './WinConditionChecker';

const PIECES_PER_PLAYER = 4;
const MAX_CONSECUTIVE_SIXES = 3;

export function createGame(
  colors: readonly PlayerColor[],
  options: { teams?: boolean; variant?: GameVariant } = {},
): GameState {
  if (
    colors.length < 2 ||
    colors.length > 8 ||
    new Set(colors).size !== colors.length ||
    colors.some(
      (color) => !ALL_PLAYER_COLORS.slice(0, colors.length > 4 ? colors.length : 4).includes(color),
    )
  ) {
    throw new Error('Ludo requires 2 to 8 distinct players');
  }

  const players: Player[] = colors.map((color) => ({
    id: color,
    color,
    pieces: Array.from({ length: PIECES_PER_PLAYER }, (_, index) => ({
      id: `${color}-${index}`,
      color,
      progress: 0,
    })),
  }));

  return {
    players,
    currentPlayerIndex: 0,
    lastRoll: null,
    consecutiveSixes: 0,
    status: 'IN_PROGRESS',
    winnerColor: null,
    ...(options.teams && colors.length === 4 ? { teams: true } : {}),
    ...variantRules(options.variant ?? 'classic'),
  };
}

/**
 * Whose coins the player on turn moves: their own, or — in a team game once
 * all of theirs are home — their partner's.
 */
export function controlledColor(state: GameState): PlayerColor {
  const player = getCurrentPlayer(state);
  const partner = partnerOf(state, player.color);
  if (partner && hasPlayerWon(player, state.players.length)) return partner;
  return player.color;
}

/** The mover's side: themselves and, in a team game, their partner. */
function friendsOf(state: GameState, color: PlayerColor): PlayerColor[] {
  const partner = partnerOf(state, color);
  return partner ? [partner] : [];
}

export async function rollDice(state: GameState, random: IRandomProvider): Promise<GameState> {
  if (state.status !== 'IN_PROGRESS') {
    throw new Error('Cannot roll dice: game has already finished');
  }
  if (state.lastRoll !== null) {
    throw new Error('Cannot roll dice: previous roll has not been resolved yet');
  }

  const value = (await random.nextInt(1, 6)) as DieValue;
  const consecutiveSixes = value === 6 ? state.consecutiveSixes + 1 : 0;

  return { ...state, lastRoll: value, consecutiveSixes };
}

/**
 * Rolling three 6s in a row voids the turn entirely — no move is allowed
 * even though a 6 always unlocks a piece from the yard. Modelling this as
 * "no valid moves" (rather than a special case in applyMove) means callers
 * only ever need one branch: no moves -> endTurnWithoutMove.
 */
export function getValidMovesForCurrentPlayer(state: GameState): Move[] {
  if (state.lastRoll === null) return [];
  if (state.consecutiveSixes >= MAX_CONSECUTIVE_SIXES) return [];
  const color = controlledColor(state);
  return computeValidMoves(
    state.players,
    color,
    state.lastRoll,
    friendsOf(state, color),
    !mayEnterHome(state, color),
  );
}

export function endTurnWithoutMove(state: GameState): GameState {
  const nextIndex = (state.currentPlayerIndex + 1) % state.players.length;
  return { ...state, currentPlayerIndex: nextIndex, lastRoll: null, consecutiveSixes: 0 };
}

export function applyMove(state: GameState, move: Move): GameState {
  if (state.status !== 'IN_PROGRESS') {
    throw new Error('Cannot apply move: game has already finished');
  }

  // Never trust a caller-supplied move: recompute what's actually legal
  // right now and reject anything that doesn't match. This is the one
  // function that must stay airtight, since it's also what a future
  // server-authoritative backend would reuse to validate a remote player's
  // claimed move.
  const legalMoves = getValidMovesForCurrentPlayer(state);
  const legalMove = legalMoves.find(
    (legal) => legal.pieceId === move.pieceId && legal.toProgress === move.toProgress,
  );
  if (!legalMove) {
    throw new Error(`Illegal move: ${JSON.stringify(move)}`);
  }

  const rolledSix = state.lastRoll === 6;
  const capturedIds = new Set(legalMove.capturedPieceIds);

  const players = state.players.map((player) => ({
    ...player,
    pieces: player.pieces.map((piece) => {
      if (piece.id === move.pieceId) {
        return { ...piece, progress: move.toProgress };
      }
      if (capturedIds.has(piece.id)) {
        return { ...piece, progress: 0 };
      }
      return piece;
    }),
  }));

  // Kill & Go: a first capture unlocks this colour's home path for good.
  const moverColor = state.players
    .flatMap((p) => p.pieces)
    .find((p) => p.id === move.pieceId)!.color;
  const unlocked =
    state.killToEnter && capturedIds.size > 0 && !(state.hunters ?? []).includes(moverColor)
      ? { hunters: [...(state.hunters ?? []), moverColor] }
      : {};

  const winnerColor = findWinner(
    players,
    isTeamGame(state),
    getCurrentPlayer(state).color,
    coinsToWin(state),
  );
  if (winnerColor) {
    return { ...state, ...unlocked, players, status: 'FINISHED', winnerColor, lastRoll: null };
  }

  const earnedBonusTurn =
    state.consecutiveSixes < MAX_CONSECUTIVE_SIXES &&
    (rolledSix ||
      capturedIds.size > 0 ||
      move.toProgress === getFinishProgress(state.players.length));

  if (earnedBonusTurn) {
    return { ...state, ...unlocked, players, lastRoll: null };
  }

  const nextIndex = (state.currentPlayerIndex + 1) % state.players.length;
  return {
    ...state,
    ...unlocked,
    players,
    currentPlayerIndex: nextIndex,
    lastRoll: null,
    consecutiveSixes: 0,
  };
}
