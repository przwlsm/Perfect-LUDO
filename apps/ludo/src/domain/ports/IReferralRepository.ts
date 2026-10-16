import type { ReferralView } from '../entities/Referral';

/** Invite a friend: naming who invited you, and seeing who you brought in. */
export interface IReferralRepository {
  get(): Promise<ReferralView>;
  /** Names the inviter by their 8-digit User ID; the server validates and pays later. */
  setReferrer(publicId: string): Promise<ReferralView>;
}
