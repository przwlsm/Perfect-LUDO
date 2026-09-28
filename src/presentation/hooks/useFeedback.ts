import { useMemo, useState } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { feedbackRepository } from '@/config/container';
import type { FeedbackCategory, FeedbackDraft } from '@/domain';
import { FeedbackComposer } from '@/application/feedback/FeedbackComposer';

const INITIAL: FeedbackDraft = { category: 'bug', message: '', contactEmail: '' };

/** A mailto: link so a report can always reach someone, even with no backend or no network. */
export function feedbackMailto(draft: FeedbackDraft, supportEmail: string): string {
  const label =
    draft.category === 'bug'
      ? 'bug report'
      : draft.category === 'suggestion'
        ? 'suggestion'
        : 'feedback';
  const contact = draft.contactEmail.trim();
  const body = [
    draft.message.trim() || '(describe what happened here)',
    contact ? `\nReply to: ${contact}` : '',
  ].join('\n');
  return `mailto:${supportEmail}?subject=${encodeURIComponent(`Ludo Club ${label}`)}&body=${encodeURIComponent(body)}`;
}

/**
 * Thin React glue over `FeedbackComposer`: form state plus busy/error/sent,
 * nothing decided here that isn't already covered by `FeedbackComposer`'s
 * own tests. `available` is false only when this build has no backend at
 * all, in which case the screen should offer the email fallback instead.
 */
export function useFeedback() {
  const [draft, setDraft] = useState<FeedbackDraft>(INITIAL);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const composer = useMemo(
    () =>
      feedbackRepository
        ? new FeedbackComposer(feedbackRepository, {
            platform: Platform.OS,
            appVersion: Constants.expoConfig?.version ?? null,
          })
        : null,
    [],
  );

  function setCategory(category: FeedbackCategory) {
    setSent(false);
    setDraft((d) => ({ ...d, category }));
  }
  function setMessage(message: string) {
    setSent(false);
    setDraft((d) => ({ ...d, message }));
  }
  function setContactEmail(contactEmail: string) {
    setSent(false);
    setDraft((d) => ({ ...d, contactEmail }));
  }

  async function submit(): Promise<boolean> {
    if (busy || !composer) return false;
    setBusy(true);
    setError(null);
    try {
      const problem = await composer.submit(draft);
      if (problem) {
        // The draft is kept exactly as typed: a validation miss should never
        // cost the player their message.
        setError(problem);
        return false;
      }
      setSent(true);
      setDraft(INITIAL);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send your message. Please try again.');
      return false;
    } finally {
      setBusy(false);
    }
  }

  return {
    draft,
    setCategory,
    setMessage,
    setContactEmail,
    busy,
    error,
    sent,
    submit,
    /** No backend configured in this build at all — offer email instead. */
    available: composer !== null,
  };
}
