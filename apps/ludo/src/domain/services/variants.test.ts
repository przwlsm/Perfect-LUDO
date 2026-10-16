import type { GameState } from '../entities/GameState';
import { isGameState } from '../entities/parseGameState';
import { coinsHome, standings, variantOf, type GameVariant } from '../entities/Variant';
import { applyMove, createGame, getValidMovesForCurrentPlayer } from './GameEngine';

function board(
  variant: GameVariant,
  red: number[],
  roll: 1 | 2 | 3 | 4 | 5 | 6,
  yellow: number[] = [],
  extra: Partial<GameState> = {},
): GameState {
  const start = createGame(['RED', 'YELLOW'], { variant });
  const set = (values: number[]) => (p: GameState['players'][number]) => ({
    ...p,
    pieces: p.pieces.map((piece, i) => ({ ...piece, progress: values[i] ?? 0 })),
  });
  return {
    ...start,
    ...extra,
    lastRoll: roll,
    players: [set(red)(start.players[0]!), set(yellow)(start.players[1]!)],
  };
}

describe('game variants', () => {
  it('each variant starts with its own rules and is recognised again', () => {
    for (const v of ['classic', 'quick1', 'quick2', 'kill'] as const)
      expect(variantOf(createGame(['RED', 'YELLOW'], { variant: v }))).toBe(v);
    expect(createGame(['RED', 'YELLOW'])).not.toHaveProperty('goal');
    expect(createGame(['RED', 'YELLOW'], { variant: 'kill' }).hunters).toEqual([]);
  });

  it('Quick 1: the first coin home wins', () => {
    const state = board('quick1', [55], 2);
    const after = applyMove(state, getValidMovesForCurrentPlayer(state)[0]!);
    expect(after.status).toBe('FINISHED');
    expect(after.winnerColor).toBe('RED');
    expect(isGameState(after, 2)).toBe(true);
  });

  it('Quick 2: one coin home is not enough, two is', () => {
    const one = board('quick2', [55], 2);
    expect(applyMove(one, getValidMovesForCurrentPlayer(one)[0]!).status).toBe('IN_PROGRESS');
    const two = board('quick2', [57, 55], 2);
    const move = getValidMovesForCurrentPlayer(two).find((m) => m.fromProgress === 55)!;
    expect(applyMove(two, move).winnerColor).toBe('RED');
  });

  it('Kill & Go: no entering the home path before a capture', () => {
    // Red on 50 rolling 4 would reach 54, inside the home path.
    expect(getValidMovesForCurrentPlayer(board('kill', [50], 4))).toEqual([]);
    expect(getValidMovesForCurrentPlayer(board('classic', [50], 4))).toHaveLength(1);
    // Moves that stay on the shared track are still fine.
    expect(getValidMovesForCurrentPlayer(board('kill', [40], 4))).toHaveLength(1);
  });

  it('Kill & Go: a capture unlocks the home path for that player only', () => {
    // Red at 28 rolls 3 onto square 30 where yellow's lone coin (progress 5) sits.
    const state = board('kill', [28], 3, [5]);
    const after = applyMove(state, getValidMovesForCurrentPlayer(state)[0]!);
    expect(after.hunters).toEqual(['RED']);
    expect(isGameState(after, 2)).toBe(true);
    const unlocked = board('kill', [50], 4, [], { hunters: ['RED'] });
    expect(getValidMovesForCurrentPlayer(unlocked)).toHaveLength(1);
  });

  it('rejects boards with impossible rule fields', () => {
    const base = createGame(['RED', 'YELLOW']);
    expect(isGameState({ ...base, goal: 3 }, 2)).toBe(false);
    expect(isGameState({ ...base, hunters: [] }, 2)).toBe(false);
    expect(isGameState({ ...base, killToEnter: true }, 2)).toBe(false);
    expect(isGameState({ ...base, killToEnter: true, hunters: ['BLUE'] }, 2)).toBe(false);
    expect(isGameState({ ...base, killToEnter: true, hunters: ['RED'] }, 2)).toBe(true);
  });
});

describe('standings', () => {
  it('puts the winner first, then coins home, then progress', () => {
    const start = createGame(['RED', 'GREEN', 'YELLOW', 'BLUE']);
    const set = (values: Record<string, number[]>) => ({
      ...start,
      status: 'FINISHED' as const,
      winnerColor: 'BLUE' as const,
      players: start.players.map((p) => ({
        ...p,
        pieces: p.pieces.map((piece, i) => ({ ...piece, progress: values[p.color]?.[i] ?? 0 })),
      })),
    });
    const state = set({ BLUE: [57, 57, 57, 57], RED: [57, 10], GREEN: [57, 40], YELLOW: [30] });
    expect(standings(state)).toEqual(['BLUE', 'GREEN', 'RED', 'YELLOW']);
    expect(coinsHome(state, 'RED')).toBe(1);
  });
});
