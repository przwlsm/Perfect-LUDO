import { FEEDBACK_MESSAGE_MAX, feedbackValidationError, toFeedbackInput } from './Feedback';

function draft(overrides: Partial<Parameters<typeof feedbackValidationError>[0]> = {}) {
  return {
    category: 'bug' as const,
    message: 'Something is wrong.',
    contactEmail: '',
    ...overrides,
  };
}

describe('feedbackValidationError', () => {
  it('accepts a plain, valid draft', () => {
    expect(feedbackValidationError(draft())).toBeNull();
  });
  it('accepts a valid draft with a well-formed contact email', () => {
    expect(feedbackValidationError(draft({ contactEmail: 'player@example.com' }))).toBeNull();
  });
  it('rejects a blank message', () => {
    expect(feedbackValidationError(draft({ message: '   ' }))).toMatch(/write a message/i);
  });
  it('rejects a message right over the limit', () => {
    expect(
      feedbackValidationError(draft({ message: 'x'.repeat(FEEDBACK_MESSAGE_MAX + 1) })),
    ).toMatch(`${FEEDBACK_MESSAGE_MAX}`);
  });
  it('accepts a message right at the limit', () => {
    expect(
      feedbackValidationError(draft({ message: 'x'.repeat(FEEDBACK_MESSAGE_MAX) })),
    ).toBeNull();
  });
  it('rejects an unrecognized category', () => {
    // @ts-expect-error deliberately malformed input, as a client bug or a stale build might send
    expect(feedbackValidationError(draft({ category: 'complaint' }))).toMatch(/category/i);
  });
  it('rejects a malformed contact email', () => {
    expect(feedbackValidationError(draft({ contactEmail: 'not-an-email' }))).toMatch(
      /valid email/i,
    );
  });
  it('leaves a blank contact email alone, since it is optional', () => {
    expect(feedbackValidationError(draft({ contactEmail: '   ' }))).toBeNull();
  });
});

describe('toFeedbackInput', () => {
  it('trims the message and drops a blank email to null', () => {
    expect(
      toFeedbackInput(draft({ message: '  hi  ', contactEmail: '  ' }), {
        platform: 'ios',
        appVersion: '2.0.0',
      }),
    ).toEqual({
      category: 'bug',
      message: 'hi',
      contactEmail: null,
      platform: 'ios',
      appVersion: '2.0.0',
    });
  });
  it('trims a given contact email rather than dropping it', () => {
    expect(
      toFeedbackInput(draft({ contactEmail: ' player@example.com ' }), {
        platform: null,
        appVersion: null,
      }).contactEmail,
    ).toBe('player@example.com');
  });
});
