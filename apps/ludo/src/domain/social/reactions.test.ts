import { createGame } from '../services/GameEngine';
import type { GameState } from '../entities/GameState';
import {
  botReaction,
  botReply,
  isReaction,
  parseReactionMessage,
  REACTIONS,
  tableMoment,
} from './reactions';

const withProgress = (state: GameState, color: string, progress: number): GameState => ({
  ...state,
  players: state.players.map((p) =>
    p.color === color
      ? { ...p, pieces: p.pieces.map((piece, i) => (i === 0 ? { ...piece, progress } : piece)) }
      : p,
  ),
});

describe('reactions', () => {
  it('accepts only the listed emoji', () => {
    expect(REACTIONS.every(isReaction)).toBe(true);
    expect(isReaction('💩')).toBe(false);
    expect(isReaction(3)).toBe(false);
  });

  it('parses well-formed wire messages and drops the rest', () => {
    expect(parseReactionMessage({ seat: 2, emoji: '😂' })).toEqual({ seat: 2, emoji: '😂' });
    expect(parseReactionMessage({ seat: 9, emoji: '😂' })).toBeNull();
    expect(parseReactionMessage({ seat: 1.5, emoji: '😂' })).toBeNull();
    expect(parseReactionMessage({ seat: 1, emoji: '<script>' })).toBeNull();
    expect(parseReactionMessage(null)).toBeNull();
    expect(parseReactionMessage('😂')).toBeNull();
  });

  describe('tableMoment', () => {
    const start = createGame(['RED', 'GREEN', 'YELLOW', 'BLUE']);

    it('spots a capture by the player whose turn it was', () => {
      const before = withProgress({ ...start, lastRoll: 3 }, 'GREEN', 12);
      const after = withProgress(before, 'GREEN', 0);
      expect(tableMoment(before, after)).toEqual({ kind: 'capture', by: 'RED', victim: 'GREEN' });
    });

    it('spots a rolled six', () => {
      expect(tableMoment(start, { ...start, lastRoll: 6 })).toEqual({ kind: 'six', by: 'RED' });
      expect(tableMoment(start, { ...start, lastRoll: 4 })).toBeNull();
    });

    it('spots the winning move', () => {
      const after: GameState = { ...start, status: 'FINISHED', winnerColor: 'BLUE' };
      expect(tableMoment(start, after)).toEqual({ kind: 'win', by: 'BLUE' });
    });
  });

  describe('botReaction', () => {
    const isBot = (c: string) => c !== 'RED';

    it('a captured computer gets upset; a capturing one gloats', () => {
      expect(botReaction({ kind: 'capture', by: 'RED', victim: 'GREEN' }, isBot, 0.1, 0)).toEqual({
        color: 'GREEN',
        emoji: '😡',
      });
      expect(botReaction({ kind: 'capture', by: 'BLUE', victim: 'RED' }, isBot, 0.1, 0.99)).toEqual(
        { color: 'BLUE', emoji: '🔥' },
      );
    });

    it('stays quiet when luck says so, and never speaks for the player', () => {
      expect(
        botReaction({ kind: 'capture', by: 'RED', victim: 'GREEN' }, isBot, 0.9, 0),
      ).toBeNull();
      expect(botReaction({ kind: 'six', by: 'RED' }, isBot, 0, 0)).toBeNull();
      expect(botReaction({ kind: 'win', by: 'RED' }, isBot, 0, 0)).toBeNull();
    });

    it('replies to some of the player’s emoji', () => {
      expect(botReply('👏', 0.1, 0)).toBe('🙏');
      expect(botReply('👏', 0.9, 0)).toBeNull();
    });
  });
});
