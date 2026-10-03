# Release guide

## What is ready

The app supports 2-6 player pass-and-play, 2-4 player AI games, 2D/3D boards, themed dice and packs and saved matches. Accounts, friend requests, invitations, private online rooms and the coin wallet (coins, cosmetics, daily gift, rewards) use Supabase. See the catalog for current collections and [authentication setup](AUTH_SETUP.md) for provider configuration.

Online moves are validated on the database against the stored board and server roll. The app recovers through realtime events, periodic refresh and foreground refresh. Private rooms wait for the player whose turn it is; there is no automatic turn deadline/forfeit or public matchmaking. Leaving ends the room for everyone, without completion rewards.

Coins and inventory are account-held entertainment rewards changed only by server functions (`purchase_item`, `claim_daily_gift`, `award_match`), not paid entitlements. Do not use these counters for prizes or leaderboards.

## Online database rollout

1. Back up the target database and apply migrations `0001` through `0012` in order, first in a staging project. Never embed a service-role key in the client.
2. Deploy the updated client and `0005_authoritative_matches.sql` together. The legacy one-argument roll RPC is revoked deliberately. Earlier clients cannot roll after this migration. End pre-migration test rooms and start fresh rooms for verification; historical client-generated states were not authoritative.
3. Enable Realtime for the tables specified by the migrations and configure Auth redirects, email delivery, Google and Facebook as described in `AUTH_SETUP.md`.
4. Run `npm run test:online` locally. This executes all migrations in isolated PostgreSQL and verifies legal state transitions, membership, turn ownership, idempotency, RPC grants and that the wallet catalog matches the app. It does not test the hosted Realtime service.
5. Migration `0007` closes the coin and statistics columns to clients and moves the wallet to the server. Deploy it together with this client: older clients will fail to sync progress after it. Items bought on a device before `0007` are not carried over; every account starts from the server's default wallet. Run `npm run store:check` against the hosted project afterwards (see the script header for the test-account variables).
6. `0008` adds in-app feedback (anyone may submit through `submit_feedback`; nobody can read it from a client, so review it in the Supabase table editor). Replace `FEEDBACK_SUPPORT_EMAIL` in `src/presentation/screens/FeedbackScreen.tsx` with a monitored inbox before release. `0009` adds self-service account deletion (`delete_own_account`) and fixes the `matches.last_submit_user` foreign key so deletion is never blocked by online match history.
7. `0010` adds table styles (triangle homes free, round homes for sale). `0011` adds invite-link rooms (`create_link_room`, `join_link_room`). `0012` adds progression: XP and levels, gems, the daily spin, daily missions, the monthly season pass and the weekly tournament. It also changes `award_match` to take match stats and pay the new bot rates (50 coins per win, 15 per finish, 25 paid games a day), and moves online payouts to the server (`award_online_match`, verified from `matches.winner_seat`; 250 per win, 60 per finish). Deploy `0012` together with this client: the client calls the new `award_match` signature, so rewards fail against an older database, and older clients cannot collect rewards once it is applied.
8. `0013` adds entry stakes and turn timers. Quick-play and invite-link tables can cost 100, 500 or 2,000 coins. Seats pay when the match is created; the winner collects 90% of the pool, and if someone walks out the players who stayed split it. Each roll and move has a 20-second clock; once it runs out anyone else at the table can call `claim_turn_timeout` and the server plays the first legal move, and three missed turns in a row count as walking out. Abandoned matches under 40 board versions no longer pay game rewards (stakes are still settled). The client sends `p_stake` only for paid tables, so free play keeps working before `0013` is applied.
9. `0014` adds game modes: Classic, Quick 1 and Quick 2 (the first player with one or two coins home wins) and Kill & Go (a player's coins cannot enter the home path until that player has captured). The rules live in the board (`goal`, `killToEnter`, `hunters`), `ludo_successors` enforces them, and the harness compares SQL and the TypeScript engine for every mode. Quick play queues and invite rooms carry the mode; the client sends `p_variant` only for non-classic tables.
10. `0015` adds lifelines: every online player has 5, one is lost each time the turn clock runs out (they are not restored by playing), and on the fifth the player is out. Two players: a walk-over for the other. Three or four: the game continues with the out seat skipped (`skip_out_seats`), and the out player forfeits their stake to those who stayed. Snapshots now carry `missed`/`out` per player and `lifelines` per match.
11. `0016` brings 2 v 2 teams online. Four seats, opposite seats partners; `ludo_successors` enforces the team rules (partners never capture or block each other, a player whose coins are home moves their partner's, the pair wins together) and the harness compares it with the TypeScript engine. 2 v 2 queues separately (`join_quick_match(..., p_teams)`, `create_link_room(..., p_teams)`); both winners are paid as winners and split the prize; a partner walking out or running out of lifelines loses the match for the pair.
12. `0017` adds team parties. In a 2 v 2 invite room the host and first friend sit opposite as partners (seats 0 and 2); `move_lobby_seat` lets anyone move to an empty seat while waiting. With their pair seated the host can `seek_opponents`: 2 v 2 quick-play seekers at the same stake and mode fill the other side, or another searching pair is seated against them at the older table (`moved_to` redirects the newer room).
13. `0018` makes teams of friends meet teams of friends first: a searching pair is matched with another searching pair at once, and 2 v 2 quick-play strangers may only fill a pair's open side after `pair_wait_seconds` (20 s). The app offers two 2 v 2 choices: Random 2 v 2 (quick play) and Team up with a friend (a 2 v 2 invite room that then searches).
14. On a dedicated staging project with three dedicated test accounts, run the social-flow script according to its header. It mutates those accounts' relationships/invitations. Do not use normal player accounts. The RLS probe script attempts writes and belongs on staging too.
15. Play real 2-, 5- and 6-account rooms across at least two physical devices and a browser. Test a lost response immediately after a roll/move, airplane mode, app backgrounding, expired tokens, reconnect, sole-move automation, capture/home/third-six turns, abandon and completed results.
16. Confirm browser/native OAuth redirects, email verification and password recovery on the actual release domain and native scheme. Provider secrets, SMTP, publisher identity and signing need project-owner configuration.
17. `0030` adds "Buy me a coffee" tips: consumable products that grant nothing in the game (the purchase is only recorded): the three coffees `ludo.tip.coffee`, `ludo.tip.big`, `ludo.tip.feast`, and the "Gift more" tiers `ludo.tip.lunch`, `ludo.tip.dinner`, `ludo.tip.party`, `ludo.tip.patron` (store billing has no free amount, so this ladder stands in for one). Create the same seven ids in Play Console under **Monetize > Products > In-app products** as consumables (suggested prices: ₹49, ₹149, ₹299, ₹499, ₹999, ₹1,999, ₹4,999); turning on multi-quantity for a product also lets buyers pick a quantity in Play's own dialog, activate them, and deploy `verify-purchase` as for the other products. The "Buy me a coffee" card on Profile and Settings shows prices only once the store lists them. Tips must stay inside store billing: an outside payment link (UPI, PayPal, buymeacoffee.com) for in-app tipping breaks Play and App Store payment rules.

No hosted migration or signed production release was performed by this audit.

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

OTA needs the app linked to an EAS project: run `npx eas-cli@latest init` once (it
writes `extra.eas.projectId`), or set `EAS_PROJECT_ID`, then make a new build. Until
then no build has an update URL and published updates reach nobody.

Players get an update in the background at launch or when returning to the app (at most
every 30 minutes). Once it has downloaded, an "Update ready — Restart" toast appears,
except during a match, and the update applies on its own at the next launch anyway.
Settings → App version shows the running update and can check on demand.

## Ads and crash reporting

Set these as EAS environment variables for the production profile (see `.env.example`):

- `ADMOB_ANDROID_APP_ID`, `ADMOB_IOS_APP_ID`, `EXPO_PUBLIC_ADMOB_REWARDED_ID` from
  AdMob. A production build fails while the app IDs are Google's test IDs, and a release
  build without a rewarded unit hides the ad buttons instead of showing test ads.
- In AdMob → Privacy & messaging, create and publish a GDPR message (and a US states
  message if you serve the US). The app shows it at launch where it is required, and
  Settings shows "Ad privacy choices" for players who must be able to change it.
- `EXPO_PUBLIC_SENTRY_DSN` turns crash reporting on. `SENTRY_ORG`, `SENTRY_PROJECT`
  and the secret `SENTRY_AUTH_TOKEN` add source-map upload for readable stack traces.

## Store version policy

`0029_app_version_policy.sql` adds `app_versions`, one row per platform, which you edit in
the Supabase table editor:

- `latest_version`: players below it see a dismissible "New version available" dialog.
  Set it after each store release is live.
- `min_version`: players below it see a blocking "Update required" screen. Raise it only
  when old builds can no longer work, for example after a breaking migration like `0005`.
  Deploy the new store build first and wait for review to finish before raising it.
- `store_url`: leave empty on Android (the Play listing is derived from the package).
  On iOS, set it to the App Store link once the app has an App Store id.
- `message`: optional short note shown on the update screen.

Versions are compared against the installed binary's version name (`version` in
`app.json`), so bump it for every store release. If the policy cannot be fetched, nobody
is blocked.

## Web

`npm run export:web` produces `dist/`. Deploy those files to a static HTTPS host with
all unknown paths rewritten to `/index.html` for Expo Router deep links. Browser data
is local to that site's origin. Changing domain does not migrate a player's collection.

## Extending the catalog

1. Add the cosmetic, stable ID, category, and coin price to
   `src/domain/cosmetics/catalog.ts`. Never reuse an existing product ID for another item.
   Add the same row to `public.store_items` in a new migration (see `0007` for the
   seed shape); the server charges the catalog price, and `npm run test:online` fails
   while the two disagree.
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

## Expanding online play

Before adding public matchmaking, add turn deadlines, reconnection grace/forfeit policy, moderation, rate limits and load tests. Prize eligibility and paid entitlements require a server-owned ledger independent of local rewards. Keep the TypeScript/PostgreSQL parity test whenever game rules change.

## Validation completed during implementation

- ESLint and TypeScript checks.
- Domain/application tests and UI hook tests for manual rolling and save failures.
- Android, iOS, and web production bundle export.
- Isolated Chrome checks for local coin purchases, persisted cosmetics, dice control,
  match restoration, and 3D rendering. See the [validation report](VALIDATION.md) for final results.

Physical-device behavior, actual billing, and store publication need separate validation.
