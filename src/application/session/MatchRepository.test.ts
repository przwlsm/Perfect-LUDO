import { InMemoryKeyValueStore } from '@/domain/testing/InMemoryKeyValueStore';
import { MatchRepository, newMatch, parseMatch } from './MatchRepository';
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
