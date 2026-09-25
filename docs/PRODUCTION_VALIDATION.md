# Production validation — 24 September 2026

This is a local implementation and verification report, not a production deployment certificate.

## Completed checks

- Full verification: ESLint, TypeScript and 243 tests across 37 suites passed.
- PostgreSQL: all five migrations executed in isolated PGlite. 6,026 legal transitions matched the TypeScript engine across 2-6 players. RPC checks rejected forged boards, missing rolls, outsiders, wrong turns and stale versions; retries and abandonment were idempotent; legacy/anonymous mutation permissions were checked.
- Expo Doctor: 21/21 checks passed after updating Expo to 57.0.25, expo-linking to 57.0.11 and expo-router to 57.0.23.
- Production JavaScript/assets exported for Android, iOS and web. These are not signed installable app-store binaries.
- Browser layout checks: 24 combinations of 2/4/5/6 players and phone/landscape/tablet/desktop dimensions. All dice remained visible with 44px minimum targets and only the active die enabled; resizing preserved the saved game.
- Browser screen review: home, store, profile, settings, friends and login at 320, 390, 768, 844 and 1440px widths. Narrow-header and greeting issues were corrected.
- Offline browser flow: 5/6-player piece counts, sole legal move, final-seat turn wrap, resume with correct pass-and-play labeling/orientation, portrait/landscape and 3D rendering exercised. An autoplay error during an automatic resumed turn led to a browser interaction gate for sound; final rerun recorded below.
- Online hook regression coverage: stale-response races, first-load recovery, duplicate roll taps, failed auto-move retry suppression, lobby reconnection and failed-leave navigation. Friend-search stale responses and failure spinners are covered.

## Remaining release gates

- Apply migration 0005 on staging and then the intended hosted database, coordinated with the updated client. Old unversioned roll clients intentionally stop working. No hosted migration was applied in this audit.
- Verify multiple real accounts across native devices and browsers, including hosted Realtime, dropped networks, token expiry and concurrent requests. PGlite and mocked hook tests do not cover hosted infrastructure or real network concurrency.
- Complete Google/Facebook provider setup, email delivery, redirect allowlists and real native/provider login verification as needed. No provider credentials were changed.
- Supply publisher app identifiers, Expo/EAS ownership, signing, store listings and support/privacy information. Build and test installed release binaries on real Android/iOS devices, including low-end performance, sound, accessibility and large text.
- Private online rooms wait for their current player; leaving ends the game for everyone. Turn deadlines, forfeits and public matchmaking are not implemented.
- Coins and inventory remain device-local, account-isolated entertainment rewards. Cloud counters are best-effort snapshots, not verified rankings or a multi-device financial ledger. Paid cosmetics/prizes need server entitlements, receipt verification and transactional balances.

## Dependency findings

`npm audit --audit-level=high` passed with no high/critical findings but reported 13 moderate transitive findings rooted in `decode-uri-component` (through Expo Router) and `uuid` (through Expo build tooling). The suggested forced fixes downgrade Expo/Router across SDK generations; they were not applied. Track compatible upstream fixes and review the decoding advisory before an unrestricted public web release. A development-only test-renderer/react-reconciler peer warning remains; the full hook suite passes.

The package install completed despite Husky being unable to write sandbox-protected `.git/config`. Git metadata was not changed to bypass that boundary.

## References used

- [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/) and its [app configuration](https://docs.expo.dev/versions/v57.0.0/config/app/) and [audio API](https://docs.expo.dev/versions/v57.0.0/sdk/audio/).
- [Supabase Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes).
- [PGlite documentation](https://pglite.dev/docs/).
