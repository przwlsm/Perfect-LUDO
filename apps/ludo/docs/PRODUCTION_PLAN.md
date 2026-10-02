# Production readiness work plan

Scope: Expo SDK 57 app; offline AI/pass-and-play and private online friend rooms for 2-6 players. Preserve existing themes, purchases, saved games, 2D/3D dice, and accessible motion settings. No paid currency or cash prizes are introduced.

## 1. Online integrity and resilience (implemented; hosted rollout pending)

- Critical: migration 0004 accepts client-generated boards without validating moves or requiring a roll. Replace acceptance with server-computed legal transitions, validate winners, reject stale versions, and make retries safe.
- Refreshing online state can overwrite newer snapshots with older replies. Enforce monotonic versions and room/session isolation.
- Realtime has no catch-up/polling or connection status; transient errors permanently replace the board. Add recovery on foreground/reconnect, bounded retries and clear status.
- Automatic moves can repeat failed submissions; lock actions to one server version and allow deliberate retries.
- Audit lobby countdown/join/leave/abandon behavior and result rewards.

## 2. Offline, persistence and accounts

- Exercise 2-6 player games, sole-move automation, captures, bonus turns, saved-game recovery, background transitions and storage failures.
- Validate untrusted saves without crashes. Prevent abandoned online games from awarding completion rewards.
- Audit account switching and cloud merge behavior, including spending and cosmetics. Clearly distinguish local entertainment currency from verified paid entitlements.

## 3. UI and interaction quality

- Audit all screens at narrow-phone, landscape, tablet and desktop widths.
- Standardize accessible buttons, busy/disabled states, touch targets, text wrapping, loading/empty/error states and modal behavior.
- Preserve per-home dice placement and readable coin layouts. Keep online controls oriented for each player's own device.
- Make online entry/resume and connection feedback discoverable; improve unclear copy and remove stale offline-only claims.

## 4. Verification

- Unit and hook tests for game rules, transport races, retries, account isolation and malformed data.
- Execute database rules and compare legal transitions against the TypeScript engine for all seat counts.
- Browser flows and responsive screenshots; lint, typecheck, dependency diagnostics and Android/iOS/web exports.
- Report live deployment, real provider and physical-device checks separately from local/mocked checks.

## 5. Release handoff

- Update README, release instructions, migration order and validation results.
- Production requires configured provider credentials/SMTP, deployed migrations, valid application identity/signing, hosting, and successful real-device/multi-account checks. Never describe a local export as a production deployment.

## Implementation status

- Completed: authoritative database successors and winners; versioned/idempotent dice and moves; duplicate-abandon protection; monotonic client snapshots; polling/foreground recovery; bounded RPC timeout; automatic-move failure guard.
- Completed: lobby initial/reconnect recovery, started-room re-entry, countdown retries, serialized actions, failed-leave handling; search request isolation and failed-search loading recovery.
- Completed: malformed save guards, retryable offline initial load, no replacement game on missing resume, no abandoned-game rewards, serialized profile pushes, wallet/inventory consistency and account-sync copy.
- Completed: compact responsive header, accessible disabled buttons, larger coin control, greeting wrapping, landscape native configuration, CI database/export gates and release documentation.
- Verification results and remaining release gates: [PRODUCTION_VALIDATION.md](PRODUCTION_VALIDATION.md).

- Final visual regressions corrected: resumed pass-and-play tables use the saved mode for dice orientation and result UI; automatic resumed turns stay silent until browser interaction permits audio.
