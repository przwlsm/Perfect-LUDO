import { useState } from 'react';
import { GUEST_VAULT_AD_COINS, GUEST_VAULT_ADS_PER_DAY, GUEST_VAULT_CAP } from '@/domain';
import { rewardedAds } from '@/config/container';
import { i18n } from '../i18n';
import { useProfile } from '../state/ProfileProvider';

/** What happened after the last ad: a catalogue key, or the server's own text. */
type Notice = { key: 'adAdded' | 'adNotFinished' | 'addFailed' } | { text: string };

/**
 * A guest's opt-in rewarded ads: each finished ad puts coins in the locked
 * vault that signing in pays out, up to a few a day and up to the vault's cap.
 * Shared by Home and Rewards so both show the same counts and messages.
 */
export function useGuestAdReward() {
  const { profile, claimGuestAd } = useProfile();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const todayUtc = new Date().toISOString().slice(0, 10);
  const used = profile.vaultAdDay === todayUtc ? profile.vaultAdsToday : 0;
  const left = Math.max(0, GUEST_VAULT_ADS_PER_DAY - used);
  const full = profile.vaultCoins >= GUEST_VAULT_CAP;

  async function watch() {
    setBusy(true);
    setNotice(null);
    try {
      if (!(await rewardedAds.show())) {
        setNotice({ key: 'adNotFinished' });
        return;
      }
      await claimGuestAd();
      setNotice({ key: 'adAdded' });
    } catch (e) {
      setNotice(e instanceof Error ? { text: e.message } : { key: 'addFailed' });
    } finally {
      setBusy(false);
    }
  }

  return {
    /** False in builds without ads (Expo Go, no ad unit configured): hide the offer. */
    available: rewardedAds.supported(),
    coinsPerAd: GUEST_VAULT_AD_COINS,
    left,
    total: GUEST_VAULT_ADS_PER_DAY,
    full,
    busy,
    canWatch: left > 0 && !full && !busy,
    /** The message for the last ad, in the current language; null before any. */
    noticeText:
      notice === null
        ? null
        : 'text' in notice
          ? notice.text
          : notice.key === 'adAdded'
            ? i18n.t('rewards:guest.adAdded', { coins: GUEST_VAULT_AD_COINS })
            : i18n.t(`rewards:errors.${notice.key}`),
    /** True when the last message reports success (shown in green). */
    succeeded: notice !== null && 'key' in notice && notice.key === 'adAdded',
    watch,
  };
}
