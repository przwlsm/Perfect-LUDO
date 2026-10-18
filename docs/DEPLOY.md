# Testing and shipping updates

Two GitHub Actions workflows cover every app in `apps/`.

## CI: tests every change (`.github/workflows/ci.yml`)

Runs on every pull request into `main` (or an `app-dev*` branch) and on every
push to those branches:

1. **verify**: lint, typecheck and tests for every app and package
   (Turborepo skips what did not change), Ludo's and Bagh-Chal's database rule
   tests, and `npm audit`.
2. **bundle**: each app the change touched is bundled for Android exactly as a
   release would be. This catches code that passes tests but would crash on a
   phone at start (for example a web-only import).

Make it required, so nothing reaches `main` unchecked: GitHub → Settings →
Branches → Add rule for `main` → _Require status checks to pass_ → select
**verify** and **bundle**, and _Require a pull request before merging_.

## Deploy: updates installed phones (`.github/workflows/deploy.yml`)

Runs when a pull request is merged into `main` (and on pushes to `app-dev*`).

1. **plan** works out which apps the merge changed
   (`scripts/ci/changed-apps.mjs`): files under `apps/<name>/` select that app,
   files under `packages/<pkg>/` select every app that uses the package, and
   root `package.json` / `package-lock.json` select every app.
2. **check** runs typecheck, lint and tests for exactly those apps.
3. **deploy**, per app, publishes an **over-the-air update** with `eas update`
   (never an EAS build, so no Expo build quota is spent):
   - **Only JavaScript or assets changed** → the next time someone opens the
     app, it waits up to 3 seconds (`updates.fallbackToCacheTimeout` in each
     `app.json`) for the update and starts with it, so closing and reopening
     the app is enough. On a slow network it opens as before and shows the
     update on the following launch.
   - **Native code changed** (a new native library, `app.json` plugins, an SDK
     upgrade) → the update's fingerprint matches no installed app, so phones
     keep running the old version unchanged. Run **Build APK** with the
     _store_ option and upload the new `.aab` to Google Play; once people
     install it, later merges reach them over the air again.

Every app's `app.json` names its update channel
(`updates.requestHeaders["expo-channel-name"]: "production"`), which is what
lets GitHub-built binaries (download-link and Play installs alike) receive
these updates. Builds made before that line was added do not get them.

| Branch     | EAS profile / channel | Who gets it                        |
| ---------- | --------------------- | ---------------------------------- |
| `main`     | `production`          | Everyone who installed from Play   |
| `app-dev*` | `preview`             | Testers with a preview (APK) build |

Deploy one app by hand: GitHub → Actions → Deploy → _Run workflow_ → type the
app folder (e.g. `diya`) or `all`.

**Which apps may ship** is a switch you control in GitHub: Settings → Secrets
and variables → Actions → **Variables** → `DEPLOY_APPS`, for example
`diya,kolam`, or `all`. An app not in that list, not linked to EAS yet, or a
run without the `EXPO_TOKEN` secret is **checked and skipped with a notice**,
never failed. Empty (the default) ships nothing, so merging never starts a
store build for an app whose first release is not set up.

## One-time setup

1. **Log in to Expo** on your computer: `npx eas-cli@latest login`
2. **Link every app** to its own EAS project and turn on updates, from the
   repo root:

   ```bash
   node scripts/eas-link-apps.mjs          # all apps not linked yet
   node scripts/eas-link-apps.mjs diya     # or just some
   ```

   It writes `extra.eas.projectId` and `updates.url` into each `app.json`.
   Commit and push those changes.

3. **Access token for GitHub:** Expo dashboard → Account settings → Access
   tokens → create one. GitHub → Settings → Secrets and variables → Actions →
   New secret `EXPO_TOKEN`.
4. **Per-app values as GitHub secrets** (both workflows read them; nothing
   needs to be set in the Expo dashboard): `ADMOB_ANDROID_APP_ID_<app>` and
   `ADMOB_REWARDED_ID_<app>` (store builds refuse Google's test IDs), and for
   Ludo and Bagh-Chal `SUPABASE_URL_<app>` and `SUPABASE_ANON_KEY_<app>`.
   Builds and updates are made in CI, not from your `.env`, so the values
   must be there.
5. **Turn an app on**, once per app, when it is ready for the store:
   1. Add its AdMob secrets in GitHub (`ADMOB_ANDROID_APP_ID_<app>`,
      `ADMOB_REWARDED_ID_<app>`).
   2. Make its store build: GitHub → Actions → **Build APK** → _Run
      workflow_ → the app, with **store** ticked. The run's release holds the
      `.aab`, signed with the shared upload key.
   3. Upload that `.aab` in Google Play Console (Play requires the very first
      upload by hand), for example to the internal testing track.
   4. Add the app to `DEPLOY_APPS` in GitHub. From then on a merge into `main`
      sends small changes over the air (close and reopen the app); when
      native code changes, repeat steps 2–3.

## Free builds and download links (`.github/workflows/build-apk.yml`)

GitHub builds the apps on its own runners (free for this public repository;
no EAS builds are used) and publishes each APK behind a link that never
changes:

```
https://github.com/przwlsm/Perfect-LUDO/releases/download/<app>-latest/<app>.apk
```

Send that link to anyone with an Android phone: they open it, tap the file,
allow installing from the browser once, and the app installs. Every build is
also kept as a numbered release (`<app>-b<run>`) under GitHub → Releases.

Each build makes one APK per CPU type rather than one fat file, so the
download is about half the size: `<app>.apk` is for today's 64-bit ARM
phones, and `<app>-arm32.apk` (in the same release) is for 32-bit phones
from before about 2016. Google Play does the same split on its own from the
`.aab`, so store downloads are small too.

How to run it:

- **By hand:** GitHub → Actions → **Build APK** → _Run workflow_ → app folder
  (e.g. `diya`) or `all`. Tick **store** for a Google Play build: it then
  refuses Google's test ad ids and also produces the `.aab` to upload.
- **On merge to `main`:** the changed apps that are listed in the
  `BUILD_APPS` repository variable (`diya,kolam` or `all`; empty = none).

A build takes about 20–30 minutes. The run's **Summary** page shows the link
and which key signed it.

### Signing key (once)

Without it, APKs are signed with Android's debug key: fine for testing,
rejected by Google Play. One upload key is shared by every app. It was
created on 2026-10-18 with `keytool` and lives **outside the repo** in
`C:\Users\Prajwal.S\.android-keys\` (keystore `devmindslabs-upload.jks`,
alias `upload`, passwords in `secrets.txt`). **Back that folder up**
somewhere safe (a password manager, an encrypted drive): once an app is on
Play, its updates must be signed with this key forever.

Add four secrets in GitHub → Settings → Secrets and variables → Actions:

| Secret                      | Value                                 |
| --------------------------- | ------------------------------------- |
| `ANDROID_KEYSTORE_BASE64`   | the contents of `keystore.base64.txt` |
| `ANDROID_KEYSTORE_PASSWORD` | from `secrets.txt`                    |
| `ANDROID_KEY_ALIAS`         | `upload`                              |
| `ANDROID_KEY_PASSWORD`      | from `secrets.txt`                    |

Per-app secrets, when an app needs them (names are case-insensitive):
`ADMOB_ANDROID_APP_ID_<app>`, `ADMOB_REWARDED_ID_<app>` (required for a store
build), and for Ludo and Bagh-Chal `SUPABASE_URL_<app>`,
`SUPABASE_ANON_KEY_<app>`.

The keystore is PKCS12, where the key password is always the same as the
keystore password, so `ANDROID_KEY_PASSWORD` and `ANDROID_KEYSTORE_PASSWORD`
get the same value (`secrets.txt` lists both). Verified 2026-10-18: a local
release build of Quiet Atlas signed with it carries the certificate
SHA-1 `81:9F:F8:3B:97:54:C3:A4:47:F6:BD:E4:65:B1:1E:92:02:BA:BF:35`.

If you ever build with EAS instead, upload the same keystore there
(`npx eas-cli@latest credentials` in the app folder) so both routes sign alike.

### Testers and the Play Store

An APK from the link and the Play Store version are signed by different
keys (Play re-signs with its own), so a tester who installed the link version
must uninstall it before installing from Play. Updates **within** one route
install over each other normally.

## Over-the-air updates: Expo today, your own server if ever needed

Small fixes reach phones through Expo's update service (free up to 1,000
monthly active users across all apps; past that, those phones simply wait
for the next Play release). If the apps outgrow the free tier, there are two
quick switches, neither touching app code:

1. **Expo Starter plan**: USD 19/month, 3,000 users included, then
   USD 0.005 per extra user.
2. **Self-host the update server** with the open-source **xprem** (formerly
   Expo Open OTA), which speaks the same Expo Updates protocol:
   - run it on any small host (Docker image; it stores updates in S3-compatible
     storage such as Cloudflare R2's free tier);
   - point each app at it by changing `updates.url` in its `app.json` to the
     server's URL, and publish updates with its CLI instead of `eas update`;
   - because `updates.url` is native config, that change needs one new store
     build per app, after which updates flow from your server.

## Good to know

- Updates only reach builds made by EAS for that channel. A debug build from
  `npx expo run:android` never receives them.
- Every app uses `"runtimeVersion": { "policy": "fingerprint" }`, so an update
  is only ever offered to installs whose native code matches. A mismatched
  update can't crash an old install.
- Google Play allows over-the-air JavaScript updates for fixes and content;
  changing an app's core purpose still goes through store review.
- Ludo also has its own in-app "Update ready" prompt and store-version policy
  (`apps/ludo/docs/DEPLOY.md`, `apps/ludo/docs/RELEASE.md`).
