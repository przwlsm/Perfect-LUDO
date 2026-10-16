import type { OccasionId } from '@/domain/entities/Occasion';

export interface MessageSet {
  /** Short greetings for the big line ("Happy Diwali"). */
  readonly headlines: readonly string[];
  /** Two or three warm lines under it. */
  readonly messages: readonly string[];
}

export interface LanguagePack {
  /** The sign-off under the message; `{name}` is the sender. */
  readonly signOff: string;
  readonly occasions: Readonly<Record<OccasionId, MessageSet>>;
}
