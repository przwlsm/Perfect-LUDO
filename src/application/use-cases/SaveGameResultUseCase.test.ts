import { InMemoryUserProgressRepository } from '@/domain/testing/InMemoryUserProgressRepository';
import { saveGameResult } from './SaveGameResultUseCase';

describe('saveGameResult', () => {
  it('records a win when the human color matches the winner', async () => {
    const progress = new InMemoryUserProgressRepository();
    await progress.createProfile('uid-1', 'Alice');

    const profile = await saveGameResult(progress, 'uid-1', 'RED', 'RED');

    expect(profile.stats).toEqual({ gamesPlayed: 1, gamesWon: 1 });
  });

  it('records a loss when the human color does not match the winner', async () => {
    const progress = new InMemoryUserProgressRepository();
    await progress.createProfile('uid-1', 'Alice');

    const profile = await saveGameResult(progress, 'uid-1', 'RED', 'GREEN');

    expect(profile.stats).toEqual({ gamesPlayed: 1, gamesWon: 0 });
  });
});
