import { useMemo, useState } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { useTranslation } from 'react-i18next';
import { feedbackRepository } from '@/config/container';
import { FEEDBACK_MESSAGE_MAX, type FeedbackCategory, type FeedbackDraft } from '@/domain';
import { FeedbackComposer } from '@/application/feedback/FeedbackComposer';
import { i18n } from '../i18n';

const INITIAL: FeedbackDraft = { category: 'bug', message: '', contactEmail: '' };

type ProblemKey = 'category' | 'empty' | 'tooLong' | 'email';

/**
 * The domain's validation messages are English; each maps to a catalogue key
 * so the player reads it in their language. An unknown one is shown as is.
 */
const PROBLEMS: Readonly<Record<string, ProblemKey>> = {
  'Please choose a category.': 'category',
  'Please write a message before sending.': 'empty',
  [`Please keep your message under ${FEEDBACK_MESSAGE_MAX} characters.`]: 'tooLong',
  'That does not look like a valid email address.': 'email',
};

/** Held as a key, so the message follows a language change; `text` is shown as written. */
type FeedbackError =
  { readonly key: ProblemKey } | { readonly key: 'sendFailed' } | { readonly text: string };

/** A mailto: link so a report can always reach someone, even with no backend or no network. */
export function feedbackMailto(draft: FeedbackDraft, supportEmail: string): string {
  const contact = draft.contactEmail.trim();
  const body = [
    draft.message.trim() || i18n.t('account:feedback.mail.bodyPlaceholder'),
    contact ? `\n${i18n.t('account:feedback.mail.replyTo', { email: contact })}` : '',
  ].join('\n');
  const subject = i18n.t(`account:feedback.mail.subject.${draft.category}`);
  return `mailto:${supportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/**
 * Thin React glue over `FeedbackComposer`: form state plus busy/error/sent,
 * nothing decided here that isn't already covered by `FeedbackComposer`'s
 * own tests. `available` is false only when this build has no backend at
 * all, in which case the screen should offer the email fallback instead.
 */
export function useFeedback() {
  const { t } = useTranslation('account');
  const [draft, setDraft] = useState<FeedbackDraft>(INITIAL);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<FeedbackError | null>(null);
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
        const key = PROBLEMS[problem];
        setError(key ? { key } : { text: problem });
        return false;
      }
      setSent(true);
      setDraft(INITIAL);
      return true;
    } catch (e) {
      setError(e instanceof Error ? { text: e.message } : { key: 'sendFailed' });
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
    error: !error
      ? null
      : 'text' in error
        ? error.text
        : error.key === 'sendFailed'
          ? t('feedback.sendFailed')
          : t(`feedback.problems.${error.key}`, { max: FEEDBACK_MESSAGE_MAX }),
    sent,
    submit,
    /** No backend configured in this build at all — offer email instead. */
    available: composer !== null,
  };
}
