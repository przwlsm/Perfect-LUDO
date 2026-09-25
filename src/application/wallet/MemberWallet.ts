import { WalletRefusedError, type IWalletRepository } from '@/domain';
import { getCosmetic } from '@/domain/cosmetics/catalog';
import type { IProfileService, Profile } from '../store/ProfileService';

/**
 * The account-backed wallet for a signed-in member.
 *
 * Every operation asks the server first and only then updates the device
 * mirror, so the device can never show coins the account does not have. The
 * server is idempotent per item and per match, which is what makes every
 * interrupted path safe:
 *   - app killed between the server charging and the mirror saving: the
 *     next `refresh` shows the item as owned, nothing is charged again;
 *   - a retry of a purchase whose response was lost: the server sees the
 *     item is owned and returns the wallet unchanged;
 *   - a match finished while offline: it is queued and replayed later, and
 *     a replay after a crash cannot pay twice.
 */
export class MemberWallet {
  constructor(
    private readonly profiles: IProfileService,
    private readonly wallet: IWalletRepository,
  ) {}

  /** Re-reads the account wallet, then delivers any results still waiting. */
  async refresh(): Promise<Profile> {
    await this.profiles.mirrorWallet(await this.wallet.getWallet());
    return this.flushPending();
  }

  async purchase(id: string): Promise<Profile> {
    const item = getCosmetic(id);
    if (item.productId) throw new Error('This item requires a verified store purchase.');
    const local = await this.profiles.load();
    if (local.owned.includes(id)) return this.profiles.equip(id);
    // The catalog price travels with the request; a stale client is refused
    // rather than charged a different amount.
    await this.profiles.mirrorWallet(await this.wallet.purchase(id, item.price));
    return this.profiles.equip(id);
  }

  async claimGift(): Promise<Profile> {
    return this.profiles.mirrorWallet(await this.wallet.claimGift());
  }

  /**
   * Records a finished match. Reaches the account when it can; otherwise the
   * result is counted on the device and queued. A refusal (bad id, guest
   * session) is surfaced rather than queued, since retrying cannot fix it.
   */
  async recordMatch(id: string, won: boolean, rewardEligible: boolean): Promise<Profile> {
    const local = await this.profiles.load();
    const queued = local.pendingRewards.some((r) => r.matchId === id);
    if (local.rewardedMatches.includes(id) && !queued) return local;
    if (queued) return this.flushPending();
    try {
      const snapshot = await this.wallet.awardMatch(id, won, rewardEligible);
      // Mark it settled locally too, so a later flush does not resend it.
      await this.profiles.queueReward(id, won, rewardEligible);
      await this.profiles.settleReward(id);
      return this.profiles.mirrorWallet(snapshot);
    } catch (e) {
      if (e instanceof WalletRefusedError) throw e;
      return this.profiles.queueReward(id, won, rewardEligible);
    }
  }

  /** Replays queued results in order, stopping at the first the server cannot take right now. */
  async flushPending(): Promise<Profile> {
    let profile = await this.profiles.load();
    for (const reward of profile.pendingRewards) {
      try {
        const snapshot = await this.wallet.awardMatch(
          reward.matchId,
          reward.won,
          reward.rewardEligible,
        );
        await this.profiles.settleReward(reward.matchId);
        profile = await this.profiles.mirrorWallet(snapshot);
      } catch (e) {
        if (e instanceof WalletRefusedError) {
          // The account will never take this one; keep the rest moving.
          profile = await this.profiles.settleReward(reward.matchId);
          continue;
        }
        break;
      }
    }
    return profile;
  }
}
