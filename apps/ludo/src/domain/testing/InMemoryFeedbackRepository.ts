import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_MESSAGE_MAX,
  FeedbackRefusedError,
  FeedbackUnavailableError,
  type FeedbackInput,
} from '../entities/Feedback';
import type { IFeedbackRepository } from '../ports/IFeedbackRepository';

/** In-memory IFeedbackRepository — mirrors migration 0008's server-side checks and throttle. */
export class InMemoryFeedbackRepository implements IFeedbackRepository {
  readonly submissions: FeedbackInput[] = [];
  offline = false;
  /** uid to throttle by; null behaves like a caller with no session (never throttled). */
  uid: string | null = null;
  private readonly sentAt = new Map<string, number[]>();
  now = () => Date.now();

  async submit(input: FeedbackInput): Promise<void> {
    if (this.offline) throw new FeedbackUnavailableError('Could not reach the server.');
    if (!FEEDBACK_CATEGORIES.includes(input.category))
      throw new FeedbackRefusedError('Please choose a category.');
    if (input.message.length < 1 || input.message.length > FEEDBACK_MESSAGE_MAX)
      throw new FeedbackRefusedError(
        `Message must be between 1 and ${FEEDBACK_MESSAGE_MAX} characters.`,
      );
    if (this.uid) {
      const cutoff = this.now() - 10 * 60 * 1000;
      const recent = (this.sentAt.get(this.uid) ?? []).filter((t) => t > cutoff);
      if (recent.length >= 5)
        throw new FeedbackRefusedError(
          'You have sent several messages recently. Please wait a bit before sending more.',
        );
      this.sentAt.set(this.uid, [...recent, this.now()]);
    }
    this.submissions.push(input);
  }
}
