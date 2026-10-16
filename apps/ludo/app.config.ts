import type { ConfigContext, ExpoConfig } from 'expo/config';

const ADS_PLUGIN = 'react-native-google-mobile-ads';
/** Google's sample AdMob account: serves test ads only and never pays out. */
const TEST_ADMOB_PUBLISHER = 'ca-app-pub-3940256099942544';

type PluginEntry = NonNullable<ExpoConfig['plugins']>[number];

/**
 * Real AdMob app IDs come from the environment (EAS secrets for store builds),
 * so the repository never has to hold them. app.json keeps Google's test IDs
 * for development, and a production build refuses to ship with them.
 */
function withAdMobIds(plugins: PluginEntry[]): PluginEntry[] {
  const androidAppId = process.env.ADMOB_ANDROID_APP_ID;
  const iosAppId = process.env.ADMOB_IOS_APP_ID;
  const result = plugins.map((entry) => {
    if (!Array.isArray(entry) || entry[0] !== ADS_PLUGIN) return entry;
    const options = { ...(entry[1] as Record<string, unknown>) };
    if (androidAppId) options.androidAppId = androidAppId;
    if (iosAppId) options.iosAppId = iosAppId;
    return [ADS_PLUGIN, options] as PluginEntry;
  });
  if (process.env.EAS_BUILD_PROFILE === 'production') {
    const ads = result.find((entry) => Array.isArray(entry) && entry[0] === ADS_PLUGIN);
    const ids = Object.values((Array.isArray(ads) ? ads[1] : {}) as Record<string, unknown>);
    if (ids.some((id) => typeof id === 'string' && id.startsWith(TEST_ADMOB_PUBLISHER))) {
      throw new Error(
        'Production build uses Google test AdMob IDs. Set ADMOB_ANDROID_APP_ID and ADMOB_IOS_APP_ID.',
      );
    }
  }
  return result;
}

/**
 * Crash reports are sent whenever EXPO_PUBLIC_SENTRY_DSN is set. The build
 * plugin only adds source-map upload (readable stack traces), which needs a
 * Sentry organization and project, plus SENTRY_AUTH_TOKEN at build time.
 */
function withSentry(plugins: PluginEntry[]): PluginEntry[] {
  const organization = process.env.SENTRY_ORG;
  const project = process.env.SENTRY_PROJECT;
  if (!organization || !project) return plugins;
  return [
    ...plugins,
    ['@sentry/react-native/expo', { url: 'https://sentry.io/', organization, project }],
  ];
}

/** App identity belongs to the publisher. Leave it unset until a real project is linked. */
export default function appConfig({ config }: ConfigContext): ExpoConfig {
  const projectId = process.env.EAS_PROJECT_ID || config.extra?.eas?.projectId;
  const androidPackage = process.env.APP_ANDROID_PACKAGE || config.android?.package;
  const iosBundleIdentifier = process.env.APP_IOS_BUNDLE_IDENTIFIER || config.ios?.bundleIdentifier;
  return {
    ...config,
    plugins: withSentry(withAdMobIds(config.plugins ?? [])),
    name: process.env.APP_DISPLAY_NAME || config.name || 'Ludo Rumble',
    slug: config.slug || 'Ludo',
    ...(process.env.EXPO_OWNER ? { owner: process.env.EXPO_OWNER } : {}),
    android: { ...config.android, ...(androidPackage ? { package: androidPackage } : {}) },
    ios: {
      ...config.ios,
      ...(iosBundleIdentifier ? { bundleIdentifier: iosBundleIdentifier } : {}),
    },
    ...(projectId
      ? {
          extra: { ...config.extra, eas: { ...config.extra?.eas, projectId } },
          updates: { ...config.updates, url: `https://u.expo.dev/${projectId}` },
        }
      : {}),
  };
}
