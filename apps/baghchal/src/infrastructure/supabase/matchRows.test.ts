import { parseMatchSnapshot } from './matchRows';

const wire = {
  serverNow: '2026-10-02T10:00:00+00:00',
  mySide: 'goat',
  match: {
    id: 'm1',
    code: 'ABCDEF',
    status: 'FINISHED',
    hostId: 'a',
    tigerId: 'b',
    goatId: 'a',
    state: {
      board: 'T...T...............T...T'.split(''),
      turn: 'tiger',
      goatsInHand: 19,
      goatsCaptured: 0,
      plies: 1,
      quietPositions: [],
      result: { kind: 'win', winner: 'goat', reason: 'timeout' },
    },
    version: 3,
    turnSeconds: 45,
    turnDeadline: null,
    lastMove: { kind: 'place', to: 12 },
  },
  players: { tiger: { id: 'b', username: 'player_b', displayName: null }, goat: null },
};

describe('parseMatchSnapshot', () => {
  it('keeps a timeout as the outcome but not as the board’s result', () => {
    const snapshot = parseMatchSnapshot(wire);
    expect(snapshot.match.outcome).toEqual({ kind: 'win', winner: 'goat', reason: 'timeout' });
    expect(snapshot.match.state.result).toBeNull();
    expect(snapshot.match.lastMove).toEqual({ kind: 'place', to: 12 });
    expect(snapshot.players.tiger?.username).toBe('player_b');
    expect(snapshot.players.goat).toBeNull();
  });

  it('passes a rules result through to the board', () => {
    const result = { kind: 'win', winner: 'tiger', reason: 'captures' };
    const snapshot = parseMatchSnapshot({
      ...wire,
      match: { ...wire.match, state: { ...wire.match.state, result } },
    });
    expect(snapshot.match.state.result).toEqual(result);
    expect(snapshot.match.outcome).toEqual(result);
  });

  it('refuses a malformed answer', () => {
    expect(() => parseMatchSnapshot({ ...wire, match: { ...wire.match, status: 'LOST' } })).toThrow(
      'Bad match status',
    );
    expect(() =>
      parseMatchSnapshot({
        ...wire,
        match: { ...wire.match, state: { ...wire.match.state, board: ['X'] } },
      }),
    ).toThrow('Bad board');
  });
});
