import { InMemoryFeedbackRepository } from '@/domain/testing/InMemoryFeedbackRepository';
import { FeedbackUnavailableError } from '@/domain';
import { FeedbackComposer } from './FeedbackComposer';

function setup() {
  const repository = new InMemoryFeedbackRepository();
  const composer = new FeedbackComposer(repository, { platform: 'android', appVersion: '1.0.0' });
  return { repository, composer };
}

describe('FeedbackComposer', () => {
  it('sends a valid draft with the message trimmed and the context attached', async () => {
    const { repository, composer } = setup();
    const result = await composer.submit({
      category: 'bug',
      message: '  The dice froze after a six.  ',
      contactEmail: '',
    });
    expect(result).toBeNull();
    expect(repository.submissions).toEqual([
      {
        category: 'bug',
        message: 'The dice froze after a six.',
        contactEmail: null,
        platform: 'android',
        appVersion: '1.0.0',
      },
    ]);
  });

  it('keeps a trimmed contact email when one is given', async () => {
    const { repository, composer } = setup();
    await composer.submit({
      category: 'suggestion',
      message: 'Add a rematch button.',
      contactEmail: ' player@example.com ',
    });
    expect(repository.submissions[0]?.contactEmail).toBe('player@example.com');
  });

  it('rejects an empty message before spending a network call', async () => {
    const { repository, composer } = setup();
    expect(await composer.submit({ category: 'bug', message: '   ', contactEmail: '' })).toMatch(
      /write a message/i,
    );
    expect(repository.submissions).toHaveLength(0);
  });

  it('rejects an over-length message before spending a network call', async () => {
    const { repository, composer } = setup();
    const problem = await composer.submit({
      category: 'other',
      message: 'x'.repeat(2001),
      contactEmail: '',
    });
    expect(problem).toMatch(/2000 characters/);
    expect(repository.submissions).toHaveLength(0);
  });

  it('rejects a malformed contact email before spending a network call', async () => {
    const { repository, composer } = setup();
    const problem = await composer.submit({
      category: 'bug',
      message: 'Something broke.',
      contactEmail: 'not-an-email',
    });
    expect(problem).toMatch(/valid email/i);
    expect(repository.submissions).toHaveLength(0);
  });

  it('lets a blank contact email through, since it is optional', async () => {
    const { composer } = setup();
    expect(
      await composer.submit({ category: 'bug', message: 'Fine either way.', contactEmail: '   ' }),
    ).toBeNull();
  });

  it('passes a repository refusal straight through, unconverted', async () => {
    const { repository, composer } = setup();
    repository.uid = 'player-1';
    for (let i = 0; i < 5; i++)
      await composer.submit({ category: 'bug', message: `report ${i}`, contactEmail: '' });
    await expect(
      composer.submit({ category: 'bug', message: 'one more', contactEmail: '' }),
    ).rejects.toThrow(/wait a bit/i);
  });

  it('passes an unreachable-server failure straight through', async () => {
    const { repository, composer } = setup();
    repository.offline = true;
    await expect(
      composer.submit({ category: 'bug', message: 'hello', contactEmail: '' }),
    ).rejects.toBeInstanceOf(FeedbackUnavailableError);
  });
});
