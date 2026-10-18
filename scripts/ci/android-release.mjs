// Prepares an app's generated Android project for a release build, after
// `expo prebuild`. Run from the app folder:
//
//   node ../../scripts/ci/android-release.mjs
//
// Environment:
//   ANDROID_VERSION_CODE      sets versionCode (the GitHub run number in CI),
//                             so every build is newer than the last for Play
//   ANDROID_KEYSTORE_PATH     a .jks file to sign release builds with, plus
//   ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_ALIAS, ANDROID_KEY_PASSWORD
//
// Without a keystore the release build keeps Expo's default: signed with the
// debug key. That installs and runs fine for testing but Google Play rejects
// it, so the summary says which key was used.
import fs from 'node:fs';
import path from 'node:path';

const gradleFile = path.resolve('android/app/build.gradle');
if (!fs.existsSync(gradleFile)) {
  console.error('android/app/build.gradle not found. Run `npx expo prebuild -p android` first.');
  process.exit(1);
}
let gradle = fs.readFileSync(gradleFile, 'utf8');
const notes = [];

const versionCode = Number(process.env.ANDROID_VERSION_CODE);
if (Number.isInteger(versionCode) && versionCode > 0) {
  const before = gradle;
  gradle = gradle.replace(/^(\s*)versionCode\s+\d+\s*$/m, `$1versionCode ${versionCode}`);
  if (gradle === before) {
    console.error('Could not find the versionCode line in build.gradle.');
    process.exit(1);
  }
  notes.push(`versionCode ${versionCode}`);
}

const keystore = process.env.ANDROID_KEYSTORE_PATH;
const storePassword = process.env.ANDROID_KEYSTORE_PASSWORD;
const keyAlias = process.env.ANDROID_KEY_ALIAS;
const keyPassword = process.env.ANDROID_KEY_PASSWORD;
if (keystore && storePassword && keyAlias && keyPassword) {
  if (!fs.existsSync(keystore)) {
    console.error(`Keystore not found at ${keystore}`);
    process.exit(1);
  }
  const storeFile = path.resolve(keystore).replace(/\\/g, '/');
  const releaseConfig = `
        release {
            storeFile file(${JSON.stringify(storeFile)})
            storePassword ${JSON.stringify(storePassword)}
            keyAlias ${JSON.stringify(keyAlias)}
            keyPassword ${JSON.stringify(keyPassword)}
        }`;
  const withConfig = gradle.replace(
    /(signingConfigs\s*\{\s*debug\s*\{[^}]*\})/,
    `$1${releaseConfig}`,
  );
  const signed = withConfig.replace(
    /(release\s*\{[^}]*?)signingConfig\s*=?\s*signingConfigs\.debug/,
    '$1signingConfig = signingConfigs.release',
  );
  if (withConfig === gradle || signed === withConfig) {
    console.error('build.gradle did not have the expected signingConfigs/release blocks.');
    process.exit(1);
  }
  gradle = signed;
  notes.push('signed with the release keystore');
} else {
  notes.push('signed with the DEBUG key (testing only; Google Play will reject it)');
}

fs.writeFileSync(gradleFile, gradle);
console.log(`android-release: ${notes.join('; ')}`);
