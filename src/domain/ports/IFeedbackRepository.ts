import type { FeedbackInput } from '../entities/Feedback';

/**
 * Sends a bug report or suggestion to the club. Deliberately available to
 * anyone — signed in, a guest, or nobody at all — because someone should be
 * able to report a problem without first having an account. Throws
 * `FeedbackRefusedError` when the server declines and `FeedbackUnavailableError`
 * when it cannot be reached.
 */
export interface IFeedbackRepository {
  submit(input: FeedbackInput): Promise<void>;
}
