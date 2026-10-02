import {
  feedbackValidationError,
  toFeedbackInput,
  type FeedbackDraft,
  type IFeedbackRepository,
} from '@/domain';

export interface FeedbackContext {
  /** 'ios' | 'android' | 'web', best-effort — not load-bearing if it's missing. */
  readonly platform: string | null;
  readonly appVersion: string | null;
}

/**
 * Validates a draft the same way the UI does, then sends it. Kept separate
 * from the screen so the one meaningful decision here — check a draft before
 * spending a network call on one the server will only reject anyway — is
 * unit testable without rendering anything. Repository errors
 * (`FeedbackRefusedError`/`FeedbackUnavailableError`) pass through unchanged.
 */
export class FeedbackComposer {
  constructor(
    private readonly repository: IFeedbackRepository,
    private readonly context: FeedbackContext,
  ) {}

  /** Returns a validation message and sends nothing, or sends and returns null. */
  async submit(draft: FeedbackDraft): Promise<string | null> {
    const problem = feedbackValidationError(draft);
    if (problem) return problem;
    await this.repository.submit(toFeedbackInput(draft, this.context));
    return null;
  }
}
