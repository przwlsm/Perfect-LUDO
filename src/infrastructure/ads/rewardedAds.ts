import type { IRewardedAdsService } from '@/domain';

/**
 * Opt-in rewarded video ads (AdMob). The native module only exists in a
 * development or store build, never in Expo Go, so it is loaded lazily and
 * every caller must handle `supported() === false` by hiding the button.
 *
 * Ships with Google's test ad unit in development; set
 * EXPO_PUBLIC_ADMOB_REWARDED_ID (and the real App IDs in app.json) before a
 * store release.
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

let initialized: Promise<unknown> | null = null;

function showRewardedAd(): Promise<boolean> {
  const m = ads();
  if (!m) return Promise.resolve(false);
  initialized ??= m
    .default()
    .initialize()
    .catch(() => (initialized = null));

  return new Promise((resolve) => {
    const unitId = __DEV__
      ? m.TestIds.REWARDED
      : (process.env.EXPO_PUBLIC_ADMOB_REWARDED_ID ?? m.TestIds.REWARDED);
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
    Promise.resolve(initialized).then(
      () => rewarded.load(),
      () => finish(),
    );
  });
}

export class AdMobRewardedAdsService implements IRewardedAdsService {
  supported(): boolean {
    return ads() !== null;
  }
  show(): Promise<boolean> {
    return showRewardedAd();
  }
}
