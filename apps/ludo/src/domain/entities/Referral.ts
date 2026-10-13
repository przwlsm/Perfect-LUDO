import { WalletUnavailableError } from './Wallet';

/** The invite-a-friend state for the signed-in player. */
export interface ReferralView {
  /** Coins each side gets. */
  readonly reward: number;
  /** The friend this player named, if any. */
  readonly inviter: {
    readonly username: string | null;
    readonly publicId: string | null;
    readonly paid: boolean;
  } | null;
  /** Whether this player may still name an inviter. */
  readonly canEnter: boolean;
  /** Friends this player invited who have finished their first online game. */
  readonly invited: number;
  /** Friends who named this player but have not finished a game yet. */
  readonly pending: number;
}

const int = (v: unknown): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.floor(v) : 0;

export function parseReferral(v: unknown): ReferralView {
  if (!v || typeof v !== 'object')
    throw new WalletUnavailableError('Received a malformed invite record from the server.');
  const r = v as Record<string, unknown>;
  const inviter =
    r.inviter && typeof r.inviter === 'object' ? (r.inviter as Record<string, unknown>) : null;
  return {
    reward: int(r.reward),
    inviter: inviter
      ? {
          username: typeof inviter.username === 'string' ? inviter.username : null,
          publicId: typeof inviter.publicId === 'string' ? inviter.publicId : null,
          paid: inviter.paid === true,
        }
      : null,
    canEnter: r.canEnter === true,
    invited: int(r.invited),
    pending: int(r.pending),
  };
}
