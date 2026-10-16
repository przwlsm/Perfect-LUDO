import { AI_LEVELS, chooseMove, evaluate, type AiLevel } from './index';
import { isLegalMove, moveKey } from '../rules';
import { boardFromString, createGame, type GameState, type Side } from '../state';

const LEVELS = Object.keys(AI_LEVELS) as AiLevel[];
const steady = () => 0.5;

function position(rows: string, turn: Side, extra: Partial<GameState> = {}): GameState {
  return {
    ...createGame(),
    board: boardFromString(rows.replace(/\s+/g, '')),
    turn,
    goatsInHand: 0,
    ...extra,
  };
}

describe('chooseMove', () => {
  it.each(LEVELS)('%s plays a legal move from the opening', (level) => {
    const game = createGame();
    const choice = chooseMove(game, { level, random: steady });
    expect(isLegalMove(game, choice.move)).toBe(true);
    expect(choice.depth).toBeGreaterThanOrEqual(1);
  });

  it('takes a goat that is there for the taking', () => {
    const game = position(
      `TG...
       .....
       .....
       .....
       ....G`,
      'tiger',
    );
    expect(moveKey(chooseMove(game, { level: 'tactician', random: steady }).move)).toBe('j0x1-2');
  });

  it('finds the move that traps the tigers', () => {
    const game = position(
      `TGG..
       G.G..
       G.G..
       .....
       .....`,
      'goat',
    );
    expect(moveKey(chooseMove(game, { level: 'tactician', random: steady }).move)).toBe('m7-6');
    const deep = chooseMove(game, { level: 'grandmaster', random: steady });
    expect(moveKey(deep.move)).toBe('m7-6');
    expect(deep.score).toBeGreaterThan(90_000);
  });

  it('does not place a goat where the tiger takes it next move', () => {
    const game = position(
      `T....
       .....
       .....
       .....
       .....`,
      'goat',
      { goatsInHand: 20 },
    );
    const { move } = chooseMove(game, { level: 'tactician', random: steady });
    expect(move.kind).toBe('place');
    expect(move.kind === 'place' && [1, 5, 6].includes(move.to)).toBe(false);
  });

  it('plays the only move at once', () => {
    const game = position(
      `TGG..
       G.G..
       G.G..
       .....
       .....`,
      'tiger',
    );
    expect(chooseMove(game, { level: 'grandmaster' })).toMatchObject({
      move: { kind: 'move', from: 0, to: 6 },
      depth: 0,
      nodes: 0,
    });
  });

  it('is repeatable for the same randomness', () => {
    const game = createGame();
    const a = chooseMove(game, { level: 'novice', random: steady, now: () => 0 });
    const b = chooseMove(game, { level: 'novice', random: steady, now: () => 0 });
    expect(moveKey(a.move)).toBe(moveKey(b.move));
  });

  it('stops when the clock runs out and keeps the last finished pass', () => {
    let ticks = 0;
    // Each check costs 100ms, so the grandmaster's 1200ms runs out quickly.
    const now = () => (ticks += 100);
    const choice = chooseMove(createGame(), { level: 'grandmaster', now, random: steady });
    expect(isLegalMove(createGame(), choice.move)).toBe(true);
    expect(choice.depth).toBeLessThan(AI_LEVELS.grandmaster.maxDepth);
  });

  it('keeps the grandmaster within its budget on a real clock', () => {
    const start = Date.now();
    const choice = chooseMove(createGame(), { level: 'grandmaster' });
    expect(Date.now() - start).toBeLessThan(AI_LEVELS.grandmaster.timeMs * 2.5);
    expect(choice.depth).toBeGreaterThanOrEqual(2);
  });
});

describe('evaluate', () => {
  it('scores captures above everything else', () => {
    const quiet = position(
      `T....
       .....
       .....
       .....
       ....G`,
      'tiger',
    );
    expect(evaluate({ ...quiet, goatsCaptured: 1 }) - evaluate(quiet)).toBeGreaterThan(1000);
  });

  it('dislikes a trapped tiger', () => {
    const free = createGame();
    const trapped = position(
      `TGG..
       GGG..
       G.G..
       .....
       .....`,
      'tiger',
    );
    expect(evaluate(trapped)).toBeLessThan(evaluate(free));
  });
});
