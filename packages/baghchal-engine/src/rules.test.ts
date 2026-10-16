import { applyMove, isLegalMove, legalMoves, moveKey, resultOf, type Move } from './rules';
import {
  GOATS_TOTAL,
  QUIET_PLY_LIMIT,
  boardFromString,
  boardToString,
  createGame,
  phaseOf,
  type GameState,
  type Side,
} from './state';

/** A position written as five rows of five, read top to bottom. */
function position(rows: string, turn: Side, extra: Partial<GameState> = {}): GameState {
  return {
    ...createGame(),
    board: boardFromString(rows.replace(/\s+/g, '')),
    turn,
    goatsInHand: 0,
    ...extra,
  };
}

function keys(moves: readonly Move[]): string[] {
  return moves.map(moveKey).sort();
}

describe('opening', () => {
  it('starts with tigers in the corners and goats to place', () => {
    const game = createGame();
    expect(boardToString(game.board)).toBe('T...T...............T...T');
    expect(game.turn).toBe('goat');
    expect(game.goatsInHand).toBe(GOATS_TOTAL);
    expect(phaseOf(game)).toBe('placement');
    expect(game.result).toBeNull();
  });

  it('lets a goat be placed on any of the 21 empty points', () => {
    const moves = legalMoves(createGame());
    expect(moves).toHaveLength(21);
    expect(moves.every((move) => move.kind === 'place')).toBe(true);
  });

  it('does not let goats move while any are still in hand', () => {
    const game = applyMove(createGame(), { kind: 'place', to: 12 });
    const afterTiger = applyMove(game, { kind: 'move', from: 0, to: 1 });
    expect(isLegalMove(afterTiger, { kind: 'move', from: 12, to: 7 })).toBe(false);
    expect(legalMoves(afterTiger).every((move) => move.kind === 'place')).toBe(true);
  });
});

describe('tiger moves', () => {
  it('moves along a line to an empty point', () => {
    const game = position(
      `T....
       .....
       .....
       .....
       .....`,
      'tiger',
    );
    expect(keys(legalMoves(game))).toEqual(['m0-1', 'm0-5', 'm0-6']);
  });

  it('jumps an adjacent goat along a line when the point beyond is empty', () => {
    const game = position(
      `TG...
       .G...
       .....
       .....
       .....`,
      'tiger',
    );
    expect(keys(legalMoves(game))).toEqual(['j0x1-2', 'j0x6-12', 'm0-5']);
    const after = applyMove(game, { kind: 'jump', from: 0, over: 6, to: 12 });
    expect(boardToString(after.board)).toBe('.G..........T............');
    expect(after.goatsCaptured).toBe(1);
    expect(after.turn).toBe('goat');
  });

  it('cannot jump when the landing point is taken or off the board', () => {
    const game = position(
      `TGG..
       .G...
       ..G..
       .....
       .....`,
      'tiger',
    );
    expect(keys(legalMoves(game))).toEqual(['m0-5']);
  });

  it('cannot jump diagonally from a point without diagonals', () => {
    const game = position(
      `.T...
       ..G..
       ...G.
       .....
       .....`,
      'tiger',
    );
    expect(keys(legalMoves(game))).toEqual(['m1-0', 'm1-2', 'm1-6']);
  });
});

describe('goat moves', () => {
  it('moves one step along a line once all goats are placed', () => {
    const game = position(
      `.....
       .....
       ..G..
       .....
       .....`,
      'goat',
    );
    expect(legalMoves(game)).toHaveLength(8);
    const game2 = position(
      `.....
       .....
       .G...
       .....
       .....`,
      'goat',
    );
    expect(keys(legalMoves(game2))).toEqual(['m11-10', 'm11-12', 'm11-16', 'm11-6']);
  });

  it('rejects an illegal move', () => {
    expect(() => applyMove(createGame(), { kind: 'place', to: 0 })).toThrow('Illegal move p0');
    expect(() => applyMove(createGame(), { kind: 'move', from: 0, to: 1 })).toThrow();
  });

  it('never mutates the state it is given', () => {
    const game = createGame();
    const snapshot = JSON.stringify(game);
    applyMove(game, { kind: 'place', to: 12 });
    expect(JSON.stringify(game)).toBe(snapshot);
  });
});

describe('results', () => {
  it('gives tigers the win at five captures', () => {
    const game = position(
      `TG...
       .....
       .....
       .....
       .....`,
      'tiger',
      { goatsCaptured: 4 },
    );
    const after = applyMove(game, { kind: 'jump', from: 0, over: 1, to: 2 });
    expect(after.result).toEqual({ kind: 'win', winner: 'tiger', reason: 'captures' });
    expect(legalMoves(after)).toEqual([]);
  });

  it('gives goats the win when no tiger can move', () => {
    const game = position(
      `TGG..
       GGG..
       G.G..
       .....
       .....`,
      'tiger',
    );
    expect(resultOf(game)).toEqual({ kind: 'win', winner: 'goat', reason: 'trapped' });
  });

  it('gives tigers the win when no goat can move', () => {
    const game = position(
      `GT...
       TT...
       .....
       .....
       .....`,
      'goat',
    );
    expect(resultOf(game)).toEqual({ kind: 'win', winner: 'tiger', reason: 'no-moves' });
  });

  it('is a draw when a position comes up a third time', () => {
    let game = position(
      `T....
       .....
       .....
       .....
       ....G`,
      'tiger',
    );
    const cycle: Move[] = [
      { kind: 'move', from: 0, to: 1 },
      { kind: 'move', from: 24, to: 23 },
      { kind: 'move', from: 1, to: 0 },
      { kind: 'move', from: 23, to: 24 },
    ];
    const plies = [...cycle, ...cycle, cycle[0]!];
    plies.forEach((move, index) => {
      game = applyMove(game, move);
      if (index < plies.length - 1) expect(game.result).toBeNull();
    });
    expect(game.result).toEqual({ kind: 'draw', reason: 'repetition' });
  });

  it('is a draw after the quiet-move limit', () => {
    const game = position(
      `T....
       .....
       .....
       .....
       ....G`,
      'tiger',
      { quietPositions: Array.from({ length: QUIET_PLY_LIMIT - 1 }, (_, i) => `k${i}`) },
    );
    const after = applyMove(game, { kind: 'move', from: 0, to: 1 });
    expect(after.result).toEqual({ kind: 'draw', reason: 'no-progress' });
  });

  it('restarts the quiet run after a placement or a capture', () => {
    const placed = applyMove(createGame(), { kind: 'place', to: 1 });
    expect(placed.quietPositions).toEqual([]);
    const moved = applyMove(placed, { kind: 'move', from: 24, to: 23 });
    expect(moved.quietPositions).toHaveLength(1);
    const placedAgain = applyMove(moved, { kind: 'place', to: 7 });
    expect(placedAgain.quietPositions).toEqual([]);
    const captured = applyMove(placedAgain, { kind: 'jump', from: 0, over: 1, to: 2 });
    expect(captured.quietPositions).toEqual([]);
  });
});
