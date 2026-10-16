# Bagh-Chal Arena: engineering plan

The product blueprint (Flutter, Supabase, daily puzzles, ranked play, fair
monetization) is the goal. This is how it is built in this repo, and where
the blueprint was changed and why.

## Decisions that differ from the blueprint

| Blueprint                                        | Here                                                                                       | Why                                                                                                                                       |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Flutter / Dart                                   | Expo SDK 57 / TypeScript, same as Ludo                                                     | One toolchain and one React Native version per repo; Ludo's auth, ads, IAP, crash reporting, i18n and deploy pipeline can be reused.      |
| Rules only in the client                         | Rules in `packages/baghchal-engine` (pure TS) **and** a PL/pgSQL twin on the server        | The client can never be trusted with the result. Ludo does the same (`ludo_successors` + a parity script); Bagh-Chal's rules are smaller. |
| Clients `update` the `matches` row directly      | Clients call `submit_move(match_id, version, move)`; no direct UPDATE on matches           | The blueprint's RLS let a player write any board, winner or capture count.                                                                |
| Clients update their own `profiles` row          | Only username and equipped cosmetics are client-writable; coins and ratings change in RPCs | Otherwise anyone can give themselves coins and rating.                                                                                    |
| `puzzles` readable by everyone, solutions inside | Solutions stay server-side; only puzzles dated today or earlier are served                 | Future puzzles and answers must not leak.                                                                                                 |
| `board` as a JSON array of `0`/`"T"`/`"G"`       | A 25-character string of `T`, `G`, `.`                                                     | One typed encoding, cheap to compare and index.                                                                                           |
| No moves table                                   | `match_moves` (one row per ply); `matches.board` is a derived snapshot                     | Replays, dispute audit, repetition detection, resuming.                                                                                   |
| Crashlytics                                      | Sentry                                                                                     | Already set up and proven in Ludo.                                                                                                        |
| Postgres Changes on a public `matches` table     | Realtime Broadcast per match, database as source of truth                                  | Scales, and does not leak every match to every listener.                                                                                  |
| Ranked matchmaking at launch                     | AI, pass-and-play, puzzles and friend invites first; ranked once there is traffic          | An empty ranked queue kills retention.                                                                                                    |
| "Zero forced ads" and a pass that removes them   | No interstitials at all; the Supporter Pass is cosmetics plus a thank-you                  | The two statements contradicted each other.                                                                                               |

## Rules the engine commits to

The blueprint left these open; the engine (`packages/baghchal-engine`) fixes them:

- Goats move first. Twenty goats are placed one per turn before any goat may move.
- Tigers move or jump from the first turn. A jump takes one adjacent goat along a line onto the empty point beyond; diagonal jumps only along diagonal lines.
- Tigers win at **5** captures. Goats win when no tiger can move. A side with no legal move on its turn loses.
- **Draw** when a position (board + side to move) occurs a third time, or after 60 consecutive plain moves (no placement, no capture). Bagh-Chal is a solved draw with best play, so without this AI games never end.

Changing any of these is a constant in `state.ts` plus the server twin.

## Architecture

```
packages/baghchal-engine   pure rules: board graph, legal moves, applyMove, results. No deps.
                           Later: ai/ (minimax, alpha-beta, iterative deepening) and puzzle generation.
apps/baghchal/src
  app/              Expo Router routes only (thin re-exports of screens)
  domain/           app-specific entities and ports (IHaptics, later IMatchRepository, …)
  application/      use cases and pure interaction logic (BoardInteraction, PieceTracker)
  infrastructure/   adapters: expo-haptics, Supabase, AdMob, …
  config/           composition root; the only importer of infrastructure classes
  presentation/     screens, components, hooks, theme
```

ESLint `boundaries` enforces the dependency rule, exactly as in Ludo. The
engine is an ordinary dependency any layer may import.

Pieces are animated by identity: `PieceTracker` gives every goat and tiger a
stable id so `Board` slides the right view with Reanimated on the UI thread.

## Roadmap

1. **Done:** engine with tests, app skeleton, pass-and-play on an animated board, haptics port.
2. **Done (AI):** negamax with alpha-beta, a transposition table, iterative deepening under a time budget, jumps-first ordering; three tiers (`AI_LEVELS`) by depth, time and evaluation noise, so Novice errs rather than merely searching less. The search runs on the JS thread while Reanimated keeps animating on the UI thread; it never exceeds its budget (1.2 s for Grandmaster), so the board stays responsive. Moving it to a worklet runtime is an option if a deeper Grandmaster is wanted. Polish: six original synthesized sound effects (`npm run sounds` regenerates them; `expo-audio` players are created on first use so launch loads no audio), a Hint from the Grandmaster tier with a 0.5 s budget drawn on the board, a move list in players' notation (`A1-B2`, `A1xC1`), undo that steps back over the computer's reply, and sound/haptics settings persisted on the device.
3. **Online (built, awaiting migration apply):** own Supabase project (`ceaxmdyoomnrdzdrvggx`), anonymous sign-ins enabled. `supabase/migrations/0001` profiles (read-own RLS, writes only via `ensure_profile`/`update_profile`) and `0002` matches: the rules twin in PL/pgSQL on the engine's own JSON `GameState`, `create_match`/`join_match` by 6-character code, `submit_move` (seat, turn, version, legality, idempotent retry, move log), `claim_timeout`, `resign_match`, `match_snapshot`; Realtime on `matches` behind RLS. `npm run test:online` (pglite, in CI) proves SQL = engine over ~18k transitions and exercises every function including a tampered client. Client: Supabase adapters behind `IAuthProvider`/`IProfileRepository`/`IOnlineMatchRepository`, guest sign-in on launch, Online screen (create or join by code) and the match screen with a server-clock-corrected timer. Live moves use Postgres Changes gated by RLS (simpler than Broadcast and private, since the table is not public); revisit only if load demands. Migrations are applied to the live project and verified: an RPC-level run (seats, turns, illegal moves, a direct `PATCH` of `goats_captured` refused by RLS, resignation) and a two-browser Playwright run of the web build (create, join by code, moves delivered to the other side in under a second, resign confirm, both result cards). **Next:** Google/Apple sign-in upgrade for guests, ratings after each match, then Phase 4.
4. **Daily puzzles:** generated by the AI, verified forced wins, served without solutions, streaks and rewards granted server-side.
5. **Economy, store, purchases, ads (built):** `0003_economy.sql` adds coins in a ledger, the catalogue (4 boards, 4 piece sets; Golden Dawn is the Supporter perk), inventory, `buy_item`/`equip_item`, match rewards paid by a trigger (+30 win, +15 draw, +10 loss, 0 for walking out, 20 rewarded games a day), rewarded-ad grants (`claim_ad_reward`: +25 coins ×5/day, double a match reward ×3/day) and `grant_iap` (service role only, once per store order, Supporter Pass restorable across profiles). `functions/verify-purchase` checks receipts with Google/Apple first. Client: `IWalletRepository`, `IRewardedAdsService` (AdMob, UMP consent at launch, test unit in dev, hidden without a real unit), `IIapService` (expo-iap, server-verified, restore), `WalletProvider` drives the board's look, Store screen, "Double it" after an online game, "Ad privacy choices" on Home where required. Guests can buy: coins stay with the install, the pass follows the store account. Rule kept: nothing bought or watched changes gameplay, and no ad ever appears without a tap. **Needs from outside:** AdMob app + rewarded unit ids, store products with the ids in `supabase/README.md`, Edge Function secrets. **Still to do:** account linking (Google/Apple) so a guest's coins survive a reinstall, extract Ludo's shared infra into `packages/`, 14 languages, PWA service worker, store assets, beta.

## Open questions

- Two free Supabase projects per organization: Ludo and this app use both, leaving no staging project.
- Puzzle rollover: UTC or the player's local midnight.
- Name: "Bagh-Chal Arena" vs "Bagh-Chal: Apex Tactics".
