# Bagh-Chal's Supabase project

This app has its own Supabase project, separate from Ludo's. The schema and
every server function live in `migrations/`, applied in file order.

## Applying migrations

Either paste each file, in order, into the dashboard's **SQL Editor** and run
it, or use the CLI with the project's database URL (Project Settings →
Database → Connection string, session pooler, port 5432):

```sh
npx supabase db push --db-url "$SUPABASE_DB_URL"
```

Never put the database URL or the `service_role` key in `.env`: the app
bundles every `EXPO_PUBLIC_*` variable.

## Before every release

```sh
npm run test:online
```

runs the migrations in an in-process PostgreSQL and proves the SQL rules
match the TypeScript engine, then exercises every match function the way a
client would, including a tampered one. CI runs it on every push.

## Trust model

- A client never writes a board. It sends a move; `submit_move` checks the
  seat, the turn, the version the client saw and the move's legality, then
  decides the result. Timeouts and resignations are server functions too.
- Profiles are readable only by their owner and writable only through
  `update_profile`, which touches display name and cosmetics. Coins and
  ratings change only in server code.
- Realtime is on `matches`, gated by the same Row Level Security as reads.

## Purchases and ads

- `functions/verify-purchase` checks a store receipt with Google Play or the
  App Store and only then calls `grant_iap` with the service role. Deploy it
  with `npx supabase functions deploy verify-purchase` and set its secrets:
  `GOOGLE_PLAY_SERVICE_ACCOUNT`, `ANDROID_PACKAGE_NAME`,
  `APP_STORE_SHARED_SECRET`. Until they are set, purchases fail safely with
  "not configured yet" and nothing is granted.
- Products to create in Play Console and App Store Connect, with these exact
  ids: `baghchal.supporter` (non-consumable), `baghchal.coins.small`,
  `baghchal.coins.medium`, `baghchal.coins.large` (consumable).
- Rewarded ads are client-reported and capped per day in `claim_ad_reward`;
  the worst a tampered client can forge is 125 coins a day, which buy looks
  and nothing else.
