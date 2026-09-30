import {
  ALL_PLAYER_COLORS,
  applyMove,
  createGame,
  getBoardPosition,
  getFinishProgress,
  getTrackLength,
  getValidMovesForCurrentPlayer,
  isSafeSquare,
  type GameState,
} from '@/domain';
import { newMatch, parseMatch } from './MatchRepository';

describe.each([5, 6, 7, 8] as const)('%i-player games', (count) => {
  it('uses equally spaced entries and restores all players', () => {
    const m = newMatch({ mode: 'local', players: count, difficulty: 'smart' });
    expect(parseMatch(JSON.stringify(m))).toEqual(m);
    expect(m.state.players).toHaveLength(count);
    for (let seat = 0; seat < count; seat++) {
      const color = ALL_PLAYER_COLORS[seat]!;
      expect(getBoardPosition(color, 1, count)).toEqual({
        zone: 'SHARED_TRACK',
        square: seat * 13,
      });
      expect(isSafeSquare(seat * 13, count)).toBe(true);
      expect(getBoardPosition(color, getTrackLength(count), count)).toEqual({
        zone: 'HOME_COLUMN',
        color,
        step: 1,
      });
    }
  });
  it('captures the extra color on the longer shared track', () => {
    const initial = createGame(ALL_PLAYER_COLORS.slice(0, count));
    const state: GameState = {
      ...initial,
      lastRoll: 2,
      players: initial.players.map((p) => ({
        ...p,
        pieces: p.pieces.map((piece, i) =>
          i ? piece : { ...piece, progress: p.color === 'RED' ? 52 : p.color === 'PURPLE' ? 2 : 0 },
        ),
      })),
    };
    const move = getValidMovesForCurrentPlayer(state)[0]!;
    expect(move.capturedPieceIds).toEqual(['PURPLE-0']);
    const after = applyMove(state, move);
    expect(after.players[4]!.pieces[0]!.progress).toBe(0);
    expect(after.currentPlayerIndex).toBe(0);
  });
  it('requires an exact finish and awards the extra player the win', () => {
    const initial = createGame(ALL_PLAYER_COLORS.slice(0, count));
    const finish = getFinishProgress(count);
    const state: GameState = {
      ...initial,
      currentPlayerIndex: count - 1,
      lastRoll: 2,
      players: initial.players.map((p, i) =>
        i === count - 1
          ? {
              ...p,
              pieces: p.pieces.map((piece, j) => ({ ...piece, progress: j ? finish : finish - 1 })),
            }
          : p,
      ),
    };
    expect(getValidMovesForCurrentPlayer(state)).toHaveLength(0);
    const exact = { ...state, lastRoll: 1 as const };
    const after = applyMove(exact, getValidMovesForCurrentPlayer(exact)[0]!);
    expect(after.status).toBe('FINISHED');
    expect(after.winnerColor).toBe(ALL_PLAYER_COLORS[count - 1]);
  });
});
