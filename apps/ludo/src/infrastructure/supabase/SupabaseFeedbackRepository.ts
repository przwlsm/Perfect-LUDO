import type { SupabaseClient } from '@supabase/supabase-js';
import {
  FeedbackRefusedError,
  FeedbackUnavailableError,
  type FeedbackInput,
  type IFeedbackRepository,
} from '@/domain';
import { toFriendlyError } from './socialRows';

/**
 * A Postgres SQLSTATE (5 characters, e.g. `22023`, `P0001`) means the server
 * ran the request and declined it. Anything else — a failed fetch, a
 * timeout, a missing function (PGRST202) — means the request may never have
 * run at all.
 */
function classify(error: { message?: string; code?: string }): Error {
  const friendly = toFriendlyError(error);
  const declined = /^[0-9A-Z]{5}$/.test(error.code ?? '');
  return declined
    ? new FeedbackRefusedError(friendly.message)
    : new FeedbackUnavailableError(friendly.message);
}

export class SupabaseFeedbackRepository implements IFeedbackRepository {
  constructor(private readonly client: SupabaseClient) {}

  async submit(input: FeedbackInput): Promise<void> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const { error } = await this.client
        .rpc('submit_feedback', {
          p_category: input.category,
          p_message: input.message,
          p_contact_email: input.contactEmail,
          p_platform: input.platform,
          p_app_version: input.appVersion,
        })
        .abortSignal(controller.signal);
      if (error) throw classify(error);
    } catch (e) {
      if (e instanceof FeedbackRefusedError || e instanceof FeedbackUnavailableError) throw e;
      throw new FeedbackUnavailableError(
        'Could not reach the server. Check your connection and try again.',
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}
