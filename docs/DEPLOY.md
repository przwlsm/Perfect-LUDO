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
3. **deploy**, per app, with Expo's fingerprint action:
   - **Only JavaScript or assets changed** → an **over-the-air update** is
     published. The next time someone opens the app, it waits up to 3 seconds
     (`updates.fallbackToCacheTimeout` in each `app.json`) for the update and
     starts with it, so closing and reopening the app is enough. On a slow
     network it opens as before and shows the update on the following launch.
   - **Native code changed** (a new native library, `app.json` plugins, an SDK
     upgrade) → an update cannot run on old installs, so a new **EAS build**
     starts instead. Upload it to Google Play; once people install it, later
     merges reach them over the air again.

| Branch     | EAS profile / channel | Who gets it                        |
| ---------- | --------------------- | ---------------------------------- |
| `main`     | `production`          | Everyone who installed from Play   |
| `app-dev*` | `preview`             | Testers with a preview (APK) build |

Deploy one app by hand: GitHub → Actions → Deploy → _Run workflow_ → type the
app folder (e.g. `diya`) or `all`.

An app that is not linked to EAS yet, or a run without the `EXPO_TOKEN`
secret, is **checked and skipped with a notice**, never failed.

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
4. **Environment variables per app** in the Expo dashboard → Project →
   Environment variables, for `preview` and `production`: the AdMob IDs
   (`ADMOB_ANDROID_APP_ID`, `ADMOB_IOS_APP_ID`, `EXPO_PUBLIC_ADMOB_REWARDED_ID`;
   production builds refuse Google's test IDs), and for Ludo and Bagh-Chal
   their Supabase URL and anon key. Updates are built in CI, not from your
   `.env`, so they must be set there.
5. **First build per app:** the first deploy of each app starts a build,
   because there is nothing to update yet. Submit it to Google Play (internal
   testing is enough to start). From then on, merges arrive over the air.

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
