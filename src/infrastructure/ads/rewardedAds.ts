import type { IRewardedAdsService } from '@/domain';

/**
 * Opt-in rewarded video ads (AdMob). The native module only exists in a
 * development or store build, never in Expo Go, so it is loaded lazily and
 * every caller must handle `supported() === false` by hiding the button.
 *
 * Consent comes first: Google's User Messaging Platform asks players in
 * regions that require it (EEA, UK, Switzerland) before any ad is requested,
 * and the SDK is only initialized once ads may be requested.
 *
 * Development uses Google's test ad unit. A release build without
 * EXPO_PUBLIC_ADMOB_REWARDED_ID reports `supported() === false` rather than
 * ever showing test ads to real players.
 */
type AdsModule = typeof import('react-native-google-mobile-ads');

let mod: AdsModule | null | undefined;
function ads(): AdsModule | null {
  if (mod === undefined) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- optional native module
      mod = require('react-native-google-mobile-ads') as AdsModule;
    } catch {
      mod = null;
    }
  }
  return mod;
}

function rewardedUnitId(m: AdsModule): string | null {
  if (__DEV__) return m.TestIds.REWARDED;
  return process.env.EXPO_PUBLIC_ADMOB_REWARDED_ID || null;
}

/**
 * Resolves true once ads may be requested and the SDK is initialized.
 * Shared by every caller; a failure is not cached so a later tap retries.
 */
let ready: Promise<boolean> | null = null;
function prepareAds(m: AdsModule): Promise<boolean> {
  ready ??= (async () => {
    try {
      // Shows the consent form only where the law requires it, and only when
      // the player has not already answered it.
      await m.AdsConsent.gatherConsent();
    } catch {
      // Fall through: a previous answer may still allow ads.
    }
    const { canRequestAds } = await m.AdsConsent.getConsentInfo();
    if (!canRequestAds) return false;
    await m.default().initialize();
    return true;
  })().catch(() => {
    ready = null;
    return false;
  });
  return ready;
}

function showRewardedAd(m: AdsModule, unitId: string): Promise<boolean> {
  return new Promise((resolve) => {
    const rewarded = m.RewardedAd.createForAdRequest(unitId, {
      requestNonPersonalizedAdsOnly: true,
    });
    let earned = false;
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      for (const unsubscribe of subscriptions) unsubscribe();
      resolve(earned);
    };
    // A slow network should fail the button, not hang it.
    const timer = setTimeout(finish, 20000);
    const subscriptions = [
      rewarded.addAdEventListener(m.RewardedAdEventType.LOADED, () => {
        rewarded.show().catch(finish);
      }),
      rewarded.addAdEventListener(m.RewardedAdEventType.EARNED_REWARD, () => {
        earned = true;
      }),
      rewarded.addAdEventListener(m.AdEventType.CLOSED, finish),
      rewarded.addAdEventListener(m.AdEventType.ERROR, finish),
    ];
    void prepareAds(m).then((allowed) => (allowed ? rewarded.load() : finish()));
  });
}

export class AdMobRewardedAdsService implements IRewardedAdsService {
  supported(): boolean {
    const m = ads();
    return m !== null && rewardedUnitId(m) !== null;
  }

  show(): Promise<boolean> {
    const m = ads();
    const unitId = m && rewardedUnitId(m);
    return m && unitId ? showRewardedAd(m, unitId) : Promise.resolve(false);
  }

  prepare(): void {
    const m = ads();
    if (m && rewardedUnitId(m)) void prepareAds(m);
  }

  async privacyOptionsRequired(): Promise<boolean> {
    const m = ads();
    if (!m) return false;
    try {
      const info = await m.AdsConsent.getConsentInfo();
      return (
        info.privacyOptionsRequirementStatus ===
        m.AdsConsentPrivacyOptionsRequirementStatus.REQUIRED
      );
    } catch {
      return false;
    }
  }

  async showPrivacyOptions(): Promise<void> {
    const m = ads();
    if (!m) return;
    try {
      await m.AdsConsent.showPrivacyOptionsForm();
    } catch {
      // Nothing to show; the form is optional outside regulated regions.
    }
  }
}
