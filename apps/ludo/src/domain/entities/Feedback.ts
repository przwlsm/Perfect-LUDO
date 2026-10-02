/** What a player is telling the club: a defect, an idea, or something else. */
export type FeedbackCategory = 'bug' | 'suggestion' | 'other';
export const FEEDBACK_CATEGORIES: readonly FeedbackCategory[] = ['bug', 'suggestion', 'other'];

export const FEEDBACK_MESSAGE_MAX = 2000;
/** Loose on purpose: this is a courtesy field for a reply, not a login, so a
 * false negative here would only stop someone from being reachable back. */
const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

/** What the player typed, before anything is added or checked. */
export interface FeedbackDraft {
  readonly category: FeedbackCategory;
  readonly message: string;
  /** Optional: only so the club can reply. Never required to send feedback. */
  readonly contactEmail: string;
}

/** What actually gets sent, once a draft has passed validation. */
export interface FeedbackInput {
  readonly category: FeedbackCategory;
  readonly message: string;
  readonly contactEmail: string | null;
  /** 'ios' | 'android' | 'web', best-effort — not load-bearing if it's missing. */
  readonly platform: string | null;
  readonly appVersion: string | null;
}

/**
 * The one rule both the client and the server enforce: everything else
 * (rate limits, exact character ceiling) lives on the server so a client
 * cannot be trusted to police itself, but this one is worth catching before
 * a request is even sent.
 */
export function feedbackValidationError(draft: FeedbackDraft): string | null {
  if (!FEEDBACK_CATEGORIES.includes(draft.category)) return 'Please choose a category.';
  const message = draft.message.trim();
  if (message.length === 0) return 'Please write a message before sending.';
  if (message.length > FEEDBACK_MESSAGE_MAX)
    return `Please keep your message under ${FEEDBACK_MESSAGE_MAX} characters.`;
  const email = draft.contactEmail.trim();
  if (email.length > 0 && !EMAIL_PATTERN.test(email))
    return 'That does not look like a valid email address.';
  return null;
}

/** Normalizes a validated draft into what the repository sends. */
export function toFeedbackInput(
  draft: FeedbackDraft,
  context: { platform: string | null; appVersion: string | null },
): FeedbackInput {
  const email = draft.contactEmail.trim();
  return {
    category: draft.category,
    message: draft.message.trim(),
    contactEmail: email.length > 0 ? email : null,
    platform: context.platform,
    appVersion: context.appVersion,
  };
}

/** The server declined the request (bad input, rate limit): resending as-is will not help. */
export class FeedbackRefusedError extends Error {
  readonly kind = 'refused';
  constructor(message: string) {
    super(message);
    this.name = 'FeedbackRefusedError';
  }
}

/** The server could not be reached; the message may or may not have arrived. */
export class FeedbackUnavailableError extends Error {
  readonly kind = 'unavailable';
  constructor(message: string) {
    super(message);
    this.name = 'FeedbackUnavailableError';
  }
}
