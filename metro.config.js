// Learn more: https://docs.expo.dev/guides/customizing-metro/
const path = require('path');
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

// Expo's default config plus debug IDs, so crash reports map to source lines.
const config = getSentryExpoConfig(__dirname);

/**
 * three.js ships two builds. Its CommonJS entry (`three.cjs`, which the
 * `require` export condition selects on Android/iOS) now opens with a
 * `process.emitWarning(...)` deprecation call — an API Hermes does not have,
 * so on a phone the module throws "undefined is not a function" before a
 * single line of ours runs, and the 3D board dies on load. The ES-module
 * build is what web already resolves to and what three itself says to use,
 * so every platform is pointed at it here. react-three-fiber's own
 * `require('three')` goes through this resolver too, keeping one copy.
 */
const threeModule = path.join(__dirname, 'node_modules/three/build/three.module.js');
const upstreamResolve = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'three') return { type: 'sourceFile', filePath: threeModule };
  return upstreamResolve
    ? upstreamResolve(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
