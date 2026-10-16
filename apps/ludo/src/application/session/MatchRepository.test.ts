import { InMemoryKeyValueStore } from '@/domain/testing/InMemoryKeyValueStore';
import { cleanSeatNames, MatchRepository, newMatch, parseMatch } from './MatchRepository';
describe('saved matches', () => {
  it('restores a match including a pending dice roll', async () => {
    const storage = new InMemoryKeyValueStore();
    const repository = new MatchRepository(storage);
    const m = newMatch({ mode: 'local', players: 2, difficulty: 'easy' });
    const pending = {
      ...m,
      state: { ...m.state, lastRoll: 6 as const, consecutiveSixes: 1 },
      lastDie: 6 as const,
    };
    await repository.save(pending);
    expect(await new MatchRepository(storage).load()).toEqual(pending);
    expect(m.state.players.map((p) => p.color)).toEqual(['RED', 'YELLOW']);
  });
  it('rejects corrupted piece positions', () => {
    const m = newMatch({ mode: 'ai', players: 4, difficulty: 'smart' });
    const raw = JSON.parse(JSON.stringify(m));
    raw.state.players[0].pieces[0].progress = 100;
    expect(() => parseMatch(JSON.stringify(raw))).toThrow('could not be restored');
  });
  it('rejects invalid winners', () => {
    const m = newMatch({ mode: 'ai', players: 4, difficulty: 'smart' });
    expect(() =>
      parseMatch(
        JSON.stringify({ ...m, state: { ...m.state, status: 'FINISHED', winnerColor: 'RED' } }),
      ),
    ).toThrow();
  });
});

describe('seat names', () => {
  it('keeps trimmed names for real seats and drops everything else', () => {
    expect(
      cleanSeatNames(
        { RED: '  Priya ', GREEN: '', YELLOW: 'A very long player name', PURPLE: 'Ghost', BLUE: 7 },
        4,
      ),
    ).toEqual({ RED: 'Priya', YELLOW: 'A very long pl' });
  });
  it('strips control characters and never throws on junk', () => {
    expect(cleanSeatNames({ RED: 'Ra\u0000vi\n' }, 2)).toEqual({ RED: 'Ravi' });
    expect(cleanSeatNames('nonsense', 6)).toEqual({});
    expect(cleanSeatNames(null, 6)).toEqual({});
  });
  it('restores a saved match with its names, dropping a damaged one instead of failing', () => {
    const match = newMatch({
      mode: 'local',
      players: 6,
      difficulty: 'smart',
      names: { RED: 'Asha', ORANGE: 'Dev' },
    });
    const raw = JSON.stringify({
      ...match,
      options: { ...match.options, names: { RED: 'Asha', ORANGE: 42 } },
    });
    expect(parseMatch(raw).options.names).toEqual({ RED: 'Asha' });
  });
});
