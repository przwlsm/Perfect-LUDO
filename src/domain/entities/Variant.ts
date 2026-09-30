import { getFinishProgress } from '../board';
import type { GameState } from './GameState';
import type { Player } from './Player';
import type { PlayerColor } from './PlayerColor';

/**
 * The ways to play. Classic is the full game; Quick ends as soon as one
 * player has 1 (or 2) coins home; Kill & Go keeps each player's coins out
 * of their home path until that player has captured an opponent's coin.
 * Mirrors `valid_variant` / `ludo_opening` in the 0014 migration.
 */
export const GAME_VARIANTS = ['classic', 'quick1', 'quick2', 'kill'] as const;
export type GameVariant = (typeof GAME_VARIANTS)[number];

export function isGameVariant(value: unknown): value is GameVariant {
  return typeof value === 'string' && (GAME_VARIANTS as readonly string[]).includes(value);
}

export const VARIANT_INFO: Record<
  GameVariant,
  { readonly title: string; readonly short: string; readonly description: string }
> = {
  classic: {
    title: 'Classic',
    short: 'CLASSIC',
    description: 'The full game: bring all four coins home to win.',
  },
  quick1: {
    title: 'Quick · 1 coin',
    short: 'QUICK 1',
    description: 'A fast game: the first coin home wins it.',
  },
  quick2: {
    title: 'Quick · 2 coins',
    short: 'QUICK 2',
    description: 'A short game: the first player with two coins home wins.',
  },
  kill: {
    title: 'Kill & Go',
    short: 'KILL & GO',
    description:
      'Capture at least one opponent coin before any of your coins can enter your home path.',
  },
};

/** The rule fields a new board starts with for this variant (classic adds none). */
export function variantRules(
  variant: GameVariant,
): Pick<GameState, 'goal' | 'killToEnter' | 'hunters'> {
  switch (variant) {
    case 'quick1':
      return { goal: 1 };
    case 'quick2':
      return { goal: 2 };
    case 'kill':
      return { killToEnter: true, hunters: [] };
    default:
      return {};
  }
}

/** Which variant a board is being played as. */
export function variantOf(state: Pick<GameState, 'goal' | 'killToEnter'>): GameVariant {
  if (state.killToEnter) return 'kill';
  if (state.goal === 1) return 'quick1';
  if (state.goal === 2) return 'quick2';
  return 'classic';
}

/** Coins a player needs home to win this board. */
export function coinsToWin(state: Pick<GameState, 'goal'>): number {
  return state.goal ?? 4;
}

/** In Kill & Go, whether `color` has already captured (and so may go home). */
export function mayEnterHome(
  state: Pick<GameState, 'killToEnter' | 'hunters'>,
  color: PlayerColor,
): boolean {
  return !state.killToEnter || (state.hunters ?? []).includes(color);
}

/** How a finished board was won, e.g. "All four coins home" or "First coin home". */
export function winLine(state: Pick<GameState, 'goal' | 'teams'>): string {
  const goal = coinsToWin(state);
  if (state.teams)
    return goal === 4 ? 'All eight coins home' : `Both partners reached ${goal} home`;
  return goal === 1 ? 'First coin home' : goal === 2 ? 'Two coins home' : 'All four coins home';
}

/**
 * Finishing order for the results podium: the winner first (and, in a team
 * game, their partner), then everyone else by coins home and, between
 * equals, by how far their coins have got.
 */
export function standings(state: GameState): PlayerColor[] {
  const finish = getFinishProgress(state.players.length);
  const home = (p: Player) => p.pieces.filter((piece) => piece.progress === finish).length;
  const total = (p: Player) => p.pieces.reduce((sum, piece) => sum + piece.progress, 0);
  const winnerIndex = state.players.findIndex((p) => p.color === state.winnerColor);
  const partner =
    state.teams && winnerIndex >= 0 ? state.players[(winnerIndex + 2) % 4]?.color : undefined;
  const rank = (c: PlayerColor) => (c === state.winnerColor ? 0 : c === partner ? 1 : 2);
  return [...state.players]
    .sort((a, b) => rank(a.color) - rank(b.color) || home(b) - home(a) || total(b) - total(a))
    .map((p) => p.color);
}

/** Coins `color` has home on this board. */
export function coinsHome(state: GameState, color: PlayerColor): number {
  const finish = getFinishProgress(state.players.length);
  return (
    state.players
      .find((p) => p.color === color)
      ?.pieces.filter((piece) => piece.progress === finish).length ?? 0
  );
}
