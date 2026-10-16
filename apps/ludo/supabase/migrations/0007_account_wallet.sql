-- Account wallet: coins, cosmetic inventory, daily gift and match rewards
-- become server-owned for signed-in members. Apply after 0006.
--
-- Before this migration the device was the source of truth and the cloud
-- row was a snapshot any client could overwrite (including its own coins).
-- From here on:
--   * coins and stats columns can only change through the functions below;
--   * every function runs as one transaction, so a purchase either completes
--     or leaves nothing behind -- a client that quits half-way, double-taps,
--     or loses its connection can never be charged twice or charged without
--     receiving the item;
--   * rewards are keyed by match id, so a client retrying after a crash or
--     replaying a queued offline result is paid exactly once;
--   * guests (anonymous sessions) are refused: coins are an account feature.
-- Prices are checked server-side against the catalog table, seeded from the
-- app's catalog; `npm run test:online` fails if the two ever drift.

-- ---------------------------------------------------------------------------
-- Catalog and inventory
-- ---------------------------------------------------------------------------

create table if not exists public.store_items (
  id    text primary key check (id ~ '^[a-z0-9-]{1,40}$'),
  kind  text not null check (kind in ('board', 'dice', 'pack')),
  price integer not null check (price >= 0),
  -- A pack unlocks its board and dice together.
  board text references public.store_items (id),
  dice  text references public.store_items (id),
  constraint pack_contents check ((kind = 'pack') = (board is not null and dice is not null))
);
alter table public.store_items enable row level security;
drop policy if exists "catalog is public" on public.store_items;
create policy "catalog is public" on public.store_items for select using (true);

-- Mirrors src/domain/cosmetics/catalog.ts. Individual items first so packs
-- can reference them.
insert into public.store_items (id, kind, price) values
  ('classic', 'board', 0), ('heritage', 'board', 250), ('royal', 'board', 600),
  ('neon', 'board', 450), ('forest', 'board', 250), ('ocean', 'board', 250),
  ('rose', 'board', 350), ('sunset', 'board', 350), ('arctic', 'board', 450),
  ('cosmic', 'board', 600), ('jade', 'board', 450), ('candy', 'board', 300),
  ('obsidian', 'board', 750),
  ('ivory', 'dice', 0), ('gold', 'dice', 300), ('ruby', 'dice', 250),
  ('mint', 'dice', 250), ('galaxy', 'dice', 450), ('midnight', 'dice', 500),
  ('classic-dice', 'dice', 0), ('heritage-dice', 'dice', 150), ('royal-dice', 'dice', 150),
  ('neon-dice', 'dice', 150), ('forest-dice', 'dice', 150), ('ocean-dice', 'dice', 150),
  ('rose-dice', 'dice', 150), ('sunset-dice', 'dice', 150), ('arctic-dice', 'dice', 150),
  ('cosmic-dice', 'dice', 150), ('jade-dice', 'dice', 150), ('candy-dice', 'dice', 150),
  ('obsidian-dice', 'dice', 150)
on conflict (id) do update set kind = excluded.kind, price = excluded.price;

insert into public.store_items (id, kind, price, board, dice) values
  ('classic-pack', 'pack', 0, 'classic', 'classic-dice'),
  ('heritage-pack', 'pack', 350, 'heritage', 'heritage-dice'),
  ('royal-pack', 'pack', 700, 'royal', 'royal-dice'),
  ('neon-pack', 'pack', 550, 'neon', 'neon-dice'),
  ('forest-pack', 'pack', 350, 'forest', 'forest-dice'),
  ('ocean-pack', 'pack', 350, 'ocean', 'ocean-dice'),
  ('rose-pack', 'pack', 450, 'rose', 'rose-dice'),
  ('sunset-pack', 'pack', 450, 'sunset', 'sunset-dice'),
  ('arctic-pack', 'pack', 550, 'arctic', 'arctic-dice'),
  ('cosmic-pack', 'pack', 700, 'cosmic', 'cosmic-dice'),
  ('jade-pack', 'pack', 550, 'jade', 'jade-dice'),
  ('candy-pack', 'pack', 400, 'candy', 'candy-dice'),
  ('obsidian-pack', 'pack', 850, 'obsidian', 'obsidian-dice')
on conflict (id) do update
  set kind = excluded.kind, price = excluded.price, board = excluded.board, dice = excluded.dice;

create table if not exists public.profile_items (
  uid         uuid not null references auth.users (id) on delete cascade,
  item_id     text not null references public.store_items (id),
  acquired_at timestamptz not null default now(),
  primary key (uid, item_id)
);
alter table public.profile_items enable row level security;
drop policy if exists "read own items" on public.profile_items;
create policy "read own items" on public.profile_items for select
  using ((select auth.uid()) = uid);
-- No insert/update/delete policies: inventory changes only through purchase_item.

-- One row per rewarded match, which is what makes a reward idempotent.
create table if not exists public.profile_rewards (
  uid        uuid not null references auth.users (id) on delete cascade,
  match_id   text not null check (char_length(match_id) between 1 and 64),
  coins      integer not null check (coins >= 0),
  won        boolean not null,
  created_at timestamptz not null default now(),
  primary key (uid, match_id)
);
alter table public.profile_rewards enable row level security;
drop policy if exists "read own rewards" on public.profile_rewards;
create policy "read own rewards" on public.profile_rewards for select
  using ((select auth.uid()) = uid);

alter table public.profiles add column if not exists last_gift date;

-- ---------------------------------------------------------------------------
-- Lock the wallet columns
-- ---------------------------------------------------------------------------
-- Row Level Security decides WHICH rows a client may touch; column privileges
-- decide WHICH columns. The client keeps its own display name; everything
-- with a number on it now changes only through the functions below, which
-- run as the table owner.

revoke insert, update, delete on public.profiles from anon, authenticated;
grant insert (uid, display_name) on public.profiles to authenticated;
grant update (uid, display_name) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Wallet functions
-- ---------------------------------------------------------------------------

create or replace function public.wallet_json(p_uid uuid) returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'coins', p.coins,
    'lastGift', p.last_gift,
    'games', p.games_played,
    'wins', p.games_won,
    'streak', p.streak,
    'bestStreak', p.best_streak,
    'owned', coalesce(
      (select jsonb_agg(i.item_id order by i.acquired_at, i.item_id)
         from public.profile_items i where i.uid = p.uid),
      '[]'::jsonb)
  )
  from public.profiles p where p.uid = p_uid;
$$;
revoke all on function public.wallet_json(uuid) from public, anon, authenticated;

-- Members only; makes sure the profile row exists and takes a row lock so two
-- requests for the same account run one after the other.
create or replace function public.lock_wallet() returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := public.require_member_uid();
begin
  if not exists (select 1 from public.profiles where uid = v_uid) then
    perform public.ensure_social_identity();
  end if;
  perform 1 from public.profiles where uid = v_uid for update;
  return v_uid;
end $$;
revoke all on function public.lock_wallet() from public, anon, authenticated;

create or replace function public.get_wallet() returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := public.require_member_uid();
begin
  if not exists (select 1 from public.profiles where uid = v_uid) then
    perform public.ensure_social_identity();
  end if;
  return public.wallet_json(v_uid);
end $$;
revoke all on function public.get_wallet() from public, anon;
grant execute on function public.get_wallet() to authenticated;

-- The price the player agreed to travels with the request: if the catalog
-- changed under them the purchase is refused instead of silently charging a
-- different amount. Buying something already owned is a no-op, never a
-- second charge, so a retry after a lost response is always safe.
create or replace function public.purchase_item(p_item_id text, p_expected_price integer)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid;
  v_item public.store_items;
  v_coins integer;
begin
  select * into v_item from public.store_items where id = p_item_id;
  if not found then
    raise exception 'This item is not in the store.' using errcode = 'P0002';
  end if;
  v_uid := public.lock_wallet();
  if exists (select 1 from public.profile_items where uid = v_uid and item_id = p_item_id) then
    return public.wallet_json(v_uid);
  end if;
  if p_expected_price is distinct from v_item.price then
    raise exception 'The price of this item has changed. Please reopen the store.' using errcode = '22023';
  end if;
  select coins into v_coins from public.profiles where uid = v_uid;
  if v_coins < v_item.price then
    raise exception 'Not enough coins. Finish matches or claim your daily gift.' using errcode = 'P0001';
  end if;
  update public.profiles set coins = coins - v_item.price where uid = v_uid;
  insert into public.profile_items (uid, item_id)
    select v_uid, x from unnest(array[p_item_id, v_item.board, v_item.dice]) as x
    where x is not null
  on conflict do nothing;
  return public.wallet_json(v_uid);
end $$;
revoke all on function public.purchase_item(text, integer) from public, anon;
grant execute on function public.purchase_item(text, integer) to authenticated;

create or replace function public.claim_daily_gift() returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := public.lock_wallet();
  v_last date;
begin
  select last_gift into v_last from public.profiles where uid = v_uid;
  if v_last is not null and v_last >= current_date then
    raise exception 'Today''s gift is claimed. Come back tomorrow!' using errcode = 'P0001';
  end if;
  update public.profiles set coins = coins + 250, last_gift = current_date where uid = v_uid;
  return public.wallet_json(v_uid);
end $$;
revoke all on function public.claim_daily_gift() from public, anon;
grant execute on function public.claim_daily_gift() to authenticated;

-- Stats and reward in one statement, recorded once per match id. Reward
-- eligibility is the client's claim about the match kind; the amount is not.
create or replace function public.award_match(p_match_id text, p_won boolean, p_eligible boolean)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid;
  v_reward integer;
begin
  if p_match_id is null or char_length(p_match_id) not between 1 and 64 then
    raise exception 'Invalid match id.' using errcode = '22023';
  end if;
  v_uid := public.lock_wallet();
  if exists (select 1 from public.profile_rewards where uid = v_uid and match_id = p_match_id) then
    return public.wallet_json(v_uid);
  end if;
  v_reward := case when coalesce(p_eligible, false) then (case when p_won then 150 else 40 end) else 0 end;
  update public.profiles
     set games_played = games_played + 1,
         games_won    = games_won + (case when p_won then 1 else 0 end),
         streak       = case when p_won then streak + 1 else 0 end,
         best_streak  = greatest(best_streak, case when p_won then streak + 1 else 0 end),
         coins        = coins + v_reward
   where uid = v_uid;
  insert into public.profile_rewards (uid, match_id, coins, won)
    values (v_uid, p_match_id, v_reward, coalesce(p_won, false));
  return public.wallet_json(v_uid);
end $$;
revoke all on function public.award_match(text, boolean, boolean) from public, anon;
grant execute on function public.award_match(text, boolean, boolean) to authenticated;
