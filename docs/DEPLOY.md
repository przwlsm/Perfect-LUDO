# Continuous deployment

`.github/workflows/deploy.yml` runs on every push to `main` or an `app-dev*`
branch:

1. **Checks:** typecheck, lint, all tests, and the database rules. A failure
   stops the deploy.
2. **Deploy** with Expo's fingerprint action:
   - Only JavaScript or assets changed → an **over-the-air update** is published.
     Players download it in the background when they open the game and get an
     **"Update ready"** popup with _Restart_ / _Later_ (never during a match; it
     waits until they leave the table). "Later" applies it on the next launch.
   - Native code changed (a new library with native code, `app.json` plugins,
     an SDK upgrade) → the update cannot run on installed builds, so a new
     **EAS build** is started. Upload it to the store; once players install
     it, later pushes update it over the air again.

| Branch     | EAS profile / channel | Who gets it                                 |
| ---------- | --------------------- | ------------------------------------------- |
| `main`     | `production`          | Store players                               |
| `app-dev*` | `preview`             | Testers with a preview build (internal APK) |

For changes that need everyone on a new store version (e.g. a breaking server
migration), use the store-version policy in `docs/RELEASE.md`: it shows the
blocking "Update required" screen.

## One-time setup

1. **Link the app to EAS** (needs your Expo account):

   ```bash
   npx eas-cli@latest login
   npx eas-cli@latest init        # writes extra.eas.projectId into app.json
   ```

   Commit the `app.json` change.

2. **Environment variables** in the Expo dashboard → Project → Environment
   variables, for both `preview` and `production`:
   - `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - `ADMOB_ANDROID_APP_ID`, `ADMOB_IOS_APP_ID`, `EXPO_PUBLIC_ADMOB_REWARDED_ID`
     (production builds refuse to use Google's test IDs)
   - optional: `EXPO_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, and the
     secret `SENTRY_AUTH_TOKEN`

   Updates are built in CI, not from your `.env`, so these must be set there.

3. **Access token:** Expo dashboard → Account settings → Access tokens → create
   one, then in GitHub → Settings → Secrets and variables → Actions add it as
   `EXPO_TOKEN`. Until it exists, pushes still run the checks and skip the
   deploy with a notice.

4. **First builds:** the first deploy on each branch starts a build (there is
   nothing to update yet). Install the `preview` APK on test phones; submit the
   `production` build to Google Play. From then on, JavaScript changes arrive
   over the air.

## Good to know

- Over-the-air updates only reach builds made by EAS for that channel. A debug
  build from `npx expo run:android` never receives them.
- The app checks for updates at launch and when it returns to the foreground
  (at most every 30 minutes); Settings → App version → _Check for updates_
  checks on demand.
- Google Play allows over-the-air JavaScript updates for bug fixes and content;
  changes to an app's core purpose still go through store review.
