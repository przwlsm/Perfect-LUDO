// Learn more: https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

/**
 * Ads and purchases are native-only. Their packages reach into React
 * Native's native bridge at import time, which does not exist in a browser,
 * so on the web they resolve to an empty module and the adapters that load
 * them lazily report `supported() === false`. Everything else is shared.
 */
const NATIVE_ONLY = new Set(['react-native-google-mobile-ads', 'expo-iap']);
const upstreamResolve = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && NATIVE_ONLY.has(moduleName)) return { type: 'empty' };
  return upstreamResolve
    ? upstreamResolve(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
