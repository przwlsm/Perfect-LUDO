import type { ConfigContext, ExpoConfig } from 'expo/config';

/** App identity belongs to the publisher. Leave it unset until a real project is linked. */
export default function appConfig({ config }: ConfigContext): ExpoConfig {
  const projectId = process.env.EAS_PROJECT_ID || config.extra?.eas?.projectId;
  const androidPackage = process.env.APP_ANDROID_PACKAGE || config.android?.package;
  const iosBundleIdentifier = process.env.APP_IOS_BUNDLE_IDENTIFIER || config.ios?.bundleIdentifier;
  return {
    ...config,
    name: process.env.APP_DISPLAY_NAME || config.name || 'Ludo Club',
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
