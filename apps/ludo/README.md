# Ludo Club

A mobile-first Ludo app with offline tables and private online friend rooms for Android, iOS, and web, built with Expo SDK 57 and React Native.

- Sign in with email/password or configured Google/Facebook providers, add friends and open private online rooms with server-validated turns.
- Play against the computer (easy or smart) or pass one device between 2–6 players.
- Switch a live match between a classic 2D board and a real Three.js 3D board.
- Shop three collections: 13 boards, 19 dice finishes, and 13 complete theme packs. Existing themes remain available.
- Heritage Wood uses forest green, mustard yellow, brick red and deep blue on warm ivory: board 250 coins, matching dice 150 coins, complete pack 350 coins. Packs unlock matching boards, dice, player cards and app styling together; included boards and dice can also be equipped separately.
- Tap gently bouncing, glowing legal pieces directly on the board. Pieces hop along the track, and each player has a six-faced cube dice at their seat, with shaded sides and a full tumble animation.
- Original synthesized sound effects cover rolls, steps, yard exits, captures, home arrivals, and wins. Settings include sound and reduced-motion controls; system reduced-motion preferences are respected.
- Five- and six-player offline tables use separate radial boards with equally spaced arms (65/78 track cells), purple/orange seats, and four pieces per player. The familiar square board remains for two to four players. Responsive portrait and landscape layouts keep each player's dice beside their home.
- A sole legal move happens automatically after rolling; multiple legal moves remain a player choice, including a six that can release another yard piece. Stacked playable coins open a selection sheet.
- Resume saved matches, claim daily gifts, and track completed games.
- Shared semantic theme tokens style the app, board, and player pieces together.

## Run

Requires Node 22.13+.

```sh
npm ci
npm run web
# or start a native development client:
npm start
```

No backend configuration is required for offline play. Use `npm.cmd` / `npx.cmd` in Windows PowerShell if script execution policy blocks the `.ps1` wrappers.

After pulling the audio update, rebuild an existing native development client to include `expo-audio`. The audio plugin disables microphone permissions and background audio. Sound sources and the CC0 dedication are documented in [assets/audio/README.md](assets/audio/README.md); regenerate the bundled effects with `node scripts/generate-sounds.mjs`.

## Verify

```sh
npm run verify
npx expo-doctor
npm run export:all
```

The verification command runs lint (including architectural dependency rules), TypeScript, Jest, and executable PostgreSQL migration/rule tests. Tests cover legal moves, captures, safe squares, six streaks, full matches, AI, purchase concurrency, save failures, idempotent rewards, match recovery, and manual dice control.

## Structure

```text
src/domain/          Immutable game rules, entities, catalog and ports
src/application/     AI, turn use cases, profile transactions and match persistence
src/infrastructure/  Supabase, secure random and AsyncStorage adapters
src/config/          Composition root wiring implementations to interfaces
src/presentation/    Screens, hooks, components, theme tokens, 2D/3D renderers
src/app/             Expo Router routes only
```

Domain code has no React, native, storage, or network dependency. ESLint enforces the layer boundaries. `IProfileService`, `IMatchRepository`, `IRandomProvider`, and `IKeyValueStore` provide substitution points. Both board renderers use the same game state and legal moves; cosmetics never affect dice probabilities.

Coins, inventory, the daily gift and rewards belong to a signed-in account and are changed only by server functions that are atomic and idempotent per item and per match; the device keeps a mirror and queues results finished offline. Guests and signed-out players are asked to sign in before spending or earning. Profile transactions on the device are serialized, so rapid taps cannot race. The next game state becomes visible only after it is saved. Invalid saved data is reported rather than overwritten with a fresh balance.

## Release and future expansion

See [the release guide](docs/RELEASE.md) for EAS preview/production builds, store submission, OTA updates, adding cosmetics, online database rollout and the boundaries for future paid purchases.

Offline games need no backend. Accounts, friends, invitations, private online rooms and the coin wallet use Supabase. Deploy all migrations before enabling online play; `0007_account_wallet.sql` moves coins to the server and must ship together with this client. Migration 0005 validates every move against the server board and roll; it also requires the updated versioned roll API, so old clients must be upgraded together with the database.

Coins and cosmetics are account-held entertainment rewards: they follow a signed-in player across devices and are isolated by account on shared devices. They are not a competitive leaderboard or a real-money ledger. There are no real-money purchases, cash prizes or public matchmaking. Clearing app data removes local settings and saved matches, not an account's coins.

App-store publication requires the publisher's Expo project, app identifiers, signing credentials, listings, and physical-device testing. No signed build or public deployment has been made in this workspace.

## Account login

Email/password, Google, Facebook, email verification, password recovery and guest play are implemented. Provider credentials and email delivery require project-owner configuration: see [Authentication setup](docs/AUTH_SETUP.md). Run `npm run auth:check` for a read-only check of enabled providers.

## Readiness audit

See [the implementation plan](docs/PRODUCTION_PLAN.md) and [validation results](docs/PRODUCTION_VALIDATION.md). Local tests and exports do not establish live multiplayer or app-store readiness; release gates are listed explicitly.
