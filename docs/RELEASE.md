# Release guide

## What is ready

This release is an offline Ludo app: 2–4 players, two AI difficulties, pass-and-play,
2D and interactive 3D boards, 12 board themes, 6 dice finishes, local coin purchases,
daily gifts, saved matches, and player statistics. The UI works on phones, tablets,
and web. The 3D scene loads separately on web and renders on demand to limit battery use.

No accounts, cloud sync, online matchmaking, real-money payments, cash prizes, ads,
or remote leaderboards are implemented. Saved data is device-local. Deleting app data
removes progress. Coins are entertainment currency; local storage is not a secure
financial ledger. The old authentication ports remain extension points, not connected services.

## Before the first native release

1. Use Node 22.13+ and install with `npm ci`.
2. Run `npm run verify` and `npx expo-doctor`.
3. Sign into the publisher's account with `npx eas-cli@latest login`.
4. Link a real Expo project with `npx eas-cli@latest init`. For dynamic config,
   put its project ID in `EAS_PROJECT_ID` or `extra.eas.projectId` in app.json.
5. Set `APP_ANDROID_PACKAGE` and/or `APP_IOS_BUNDLE_IDENTIFIER` to identifiers owned
   by the publisher. Set `EXPO_OWNER` and optionally `APP_DISPLAY_NAME`.
   Add the same values to the matching EAS environments and local `.env`.
   These identity values are public configuration, not credentials.
6. Check resolved values with `npx expo config --type public`.
7. Build a preview: `npm run build:preview -- --platform android`.
   For iOS use `--platform ios` and register test devices when EAS requests it.
8. Test the installed binary on physical devices, including a lower-end Android phone:
   both board modes, touch selection, 3D rotation, background/foreground, interrupted
   sessions, cold-start restoration, low storage, screen readers, text scaling, and offline play.
9. Finalize the store listing, screenshots, support contact, privacy information, age rating,
   and signing credentials in the publisher's App Store / Play Console accounts.
10. Build with `npm run build:production -- --platform android` or `--platform ios`.
    Submit the reviewed binary with `npm run submit:production -- --platform android`
    or `--platform ios`. These commands can incur publisher account/build charges.

The repository has not been submitted to either store. Bundling JavaScript for all
platforms is not a substitute for native device testing or signed EAS builds.

## OTA updates

`npm run update:preview -- --message "Description"` targets preview; production has
a separate command. The fingerprint runtime policy prevents updates reaching a
native build with incompatible dependencies. A native configuration/dependency change
requires a new build. Test updates in preview before publishing to production.

## Web

`npm run export:web` produces `dist/`. Deploy those files to a static HTTPS host with
all unknown paths rewritten to `/index.html` for Expo Router deep links. Browser data
is local to that site's origin. Changing domain does not migrate a player's collection.

## Extending the catalog

1. Add the cosmetic, stable ID, category, and coin price to
   `src/domain/cosmetics/catalog.ts`. Never reuse an existing product ID for another item.
2. For a board, add semantic surface/accent/frame/tile/player tokens to
   `src/presentation/theme/themes.ts`. Both renderers consume the same theme.
3. For dice, add its face/pip palette to `DICE_FINISHES`.
4. Add a migration before removing IDs that might exist in saved player inventories.
5. Verify selection, readability, and contrast in both board modes.

## Real-money cosmetics later

The `Cosmetic.productId` field reserves store identity, and the local service refuses
to grant items with a product ID through a coin transaction. It does not implement billing.
Replace `IProfileService` at the composition root with an authenticated backend adapter
and integrate the platform billing flow. The backend must verify purchases, own balances
and entitlements, handle idempotency/refunds, and support restore purchases. Do not trust
device coin balances, dates, match results, or entitlement flags for paid goods.

## Online multiplayer later

Reuse the pure domain engine on an authoritative server. Add identity, room lifecycle,
server dice, turn deadlines, reconnect/resume, result validation, and abuse controls.
Clients should submit intentions; the server computes captures and validates all moves.
The existing local AI/session controllers do not provide networking.

## Validation completed during implementation

- ESLint and TypeScript checks.
- Domain/application tests and UI hook tests for manual rolling and save failures.
- Android, iOS, and web production bundle export.
- Isolated Chrome checks for local coin purchases, persisted cosmetics, dice control,
  match restoration, and 3D rendering. See the [validation report](VALIDATION.md) for final results.

Physical-device behavior, actual billing, and store publication need separate validation.
