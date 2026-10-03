import { applyMove, boardFromString, createGame, type GameState } from 'baghchal-engine';
import { interpretTap, targetsFrom } from './BoardInteraction';

const movement: GameState = {
  ...createGame(),
  board: boardFromString('TG..................G..T.'),
  goatsInHand: 0,
  turn: 'tiger',
};

describe('interpretTap', () => {
  it('places a goat from the hand on an empty point', () => {
    expect(interpretTap(createGame(), null, 12)).toEqual({
      selected: null,
      move: { kind: 'place', to: 12 },
    });
  });

  it('ignores a tap on a tiger while goats are placing', () => {
    expect(interpretTap(createGame(), null, 0)).toEqual({ selected: null, move: null });
  });

  it('picks a tiger up, then moves it to a tapped target', () => {
    const game = applyMove(createGame(), { kind: 'place', to: 12 });
    expect(interpretTap(game, null, 0)).toEqual({ selected: 0, move: null });
    expect(interpretTap(game, 0, 1)).toEqual({
      selected: null,
      move: { kind: 'move', from: 0, to: 1 },
    });
  });

  it('completes a jump when the landing point is tapped', () => {
    expect(interpretTap(movement, 0, 2)).toEqual({
      selected: null,
      move: { kind: 'jump', from: 0, over: 1, to: 2 },
    });
  });

  it('puts a held piece down when tapped again and switches to another own piece', () => {
    expect(interpretTap(movement, 0, 0)).toEqual({ selected: null, move: null });
    expect(interpretTap(movement, 0, 23)).toEqual({ selected: 23, move: null });
  });

  it('drops the selection on a tap that is not a legal target', () => {
    expect(interpretTap(movement, 0, 24)).toEqual({ selected: null, move: null });
    expect(interpretTap(movement, 0, 20)).toEqual({ selected: null, move: null });
  });

  it('does nothing once the game is over', () => {
    const over: GameState = { ...movement, result: { kind: 'draw', reason: 'no-progress' } };
    expect(interpretTap(over, null, 0)).toEqual({ selected: null, move: null });
  });
});

describe('targetsFrom', () => {
  it('lists the held piece’s destinations, including jump landings', () => {
    expect([...targetsFrom(movement, 0)].sort((a, b) => a - b)).toEqual([2, 5, 6]);
    expect(targetsFrom(movement, null)).toEqual([]);
  });
});
