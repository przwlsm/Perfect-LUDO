-- Coins, the cosmetic store, the Supporter Pass and rewarded ads. Apply after 0002.
--
-- Nothing here touches how a game is played: coins buy looks, the pass is a
-- thank-you, and every ad is a button the player chose to tap. All credits
-- happen in this file, through a ledger; a client can only ask.
--
--   * Match rewards are paid by a trigger when a match finishes, with a daily cap.
--   * Ad rewards are small and capped per day (the server cannot see the ad
--     itself), so the worst a tampered client can forge is bounded and harmless.
--   * Real-money purchases are granted only by grant_iap, which only the
--     verify-purchase Edge Function (service role) may call after the store
--     confirmed the receipt. Each store order grants exactly once.

alter table public.profiles add column if not exists supporter boolean not null default false;

-- ---------------------------------------------------------------------------
-- Catalogue
-- ---------------------------------------------------------------------------

create table if not exists public.store_items (
  id             text primary key check (id ~ '^[a-z0-9_]{1,32}$'),
  kind           text not null check (kind in ('board', 'pieces')),
  name           text not null,
  price          int not null check (price >= 0),
  -- A Supporter Pass perk: never for sale, owned by every supporter.
  supporter_only boolean not null default false,
  sort           int not null default 0
);
alter table public.store_items enable row level security;
revoke all on public.store_items from public, anon, authenticated;
grant select on public.store_items to authenticated;
drop policy if exists "catalogue is public" on public.store_items;
create policy "catalogue is public" on public.store_items for select to authenticated using (true);

-- Mirrors the looks in src/presentation/theme/cosmetics.ts.
insert into public.store_items (id, kind, name, price, supporter_only, sort) values
  ('classic_wood',  'board',  'Classic Wood',    0,   false, 0),
  ('mahogany',      'board',  'Mahogany',        400, false, 1),
  ('ancient_slate', 'board',  'Ancient Slate',   600, false, 2),
  ('cyberpunk',     'board',  'Cyberpunk Grid',  900, false, 3),
  ('golden_dawn',   'board',  'Golden Dawn',     0,   true,  4),
  ('brass_classic', 'pieces', 'Brass',           0,   false, 0),
  ('jade',          'pieces', 'Jade',            500, false, 1),
  ('ivory_ebony',   'pieces', 'Ivory & Ebony',   700, false, 2),
  ('neon',          'pieces', 'Neon',            900, false, 3)
on conflict (id) do update
  set kind = excluded.kind, name = excluded.name, price = excluded.price,
      supporter_only = excluded.supporter_only, sort = excluded.sort;

create table if not exists public.inventory (
  uid         uuid not null references auth.users (id) on delete cascade,
  item_id     text not null references public.store_items (id),
  acquired_at timestamptz not null default now(),
  primary key (uid, item_id)
);
alter table public.inventory enable row level security;
revoke all on public.inventory from public, anon, authenticated;

-- Every coin that moves, and why. `ref` makes a grant idempotent.
create table if not exists public.coin_ledger (
  id         bigserial primary key,
  uid        uuid not null references auth.users (id) on delete cascade,
  delta      int not null,
  reason     text not null check (reason in ('match', 'match_double', 'ad', 'purchase', 'store')),
  ref        text,
  created_at timestamptz not null default now()
);
create unique index if not exists coin_ledger_once on public.coin_ledger (uid, reason, ref) where ref is not null;
create index if not exists coin_ledger_uid_time on public.coin_ledger (uid, created_at);
alter table public.coin_ledger enable row level security;
revoke all on public.coin_ledger from public, anon, authenticated;

create table if not exists public.ad_rewards (
  uid   uuid not null references auth.users (id) on delete cascade,
  day   date not null,
  kind  text not null check (kind in ('coins', 'double')),
  count int not null default 0 check (count >= 0),
  primary key (uid, day, kind)
);
alter table public.ad_rewards enable row level security;
revoke all on public.ad_rewards from public, anon, authenticated;

-- Mirrors IAP_PRODUCTS in src/domain/entities/Economy.ts; the same ids are
-- created in Play Console and App Store Connect.
create table if not exists public.iap_products (
  id    text primary key check (id ~ '^[a-z0-9._]{1,64}$'),
  kind  text not null check (kind in ('coins', 'pass')),
  coins int not null default 0 check (coins >= 0)
);
alter table public.iap_products enable row level security;
revoke all on public.iap_products from public, anon, authenticated;
insert into public.iap_products (id, kind, coins) values
  ('baghchal.coins.small',  'coins', 300),
  ('baghchal.coins.medium', 'coins', 1000),
  ('baghchal.coins.large',  'coins', 2500),
  ('baghchal.supporter',    'pass',  0)
on conflict (id) do update set kind = excluded.kind, coins = excluded.coins;

-- One row per store order: what makes every grant idempotent.
create table if not exists public.iap_receipts (
  platform   text not null check (platform in ('android', 'ios')),
  order_id   text not null check (char_length(order_id) between 1 and 200),
  uid        uuid not null references auth.users (id) on delete cascade,
  product_id text not null references public.iap_products (id),
  granted_at timestamptz not null default now(),
  primary key (platform, order_id)
);
alter table public.iap_receipts enable row level security;
revoke all on public.iap_receipts from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.utc_today() returns date
language sql stable set search_path = public, pg_temp as $$
  select (now() at time zone 'utc')::date;
$$;
revoke all on function public.utc_today() from public, anon, authenticated;

-- The caller, with a profile, and their row locked for this transaction.
create or replace function public.lock_wallet() returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := public.require_uid();
begin
  perform public.ensure_profile();
  perform 1 from public.profiles where uid = v_uid for update;
  return v_uid;
end $$;
revoke all on function public.lock_wallet() from public, anon, authenticated;

create or replace function public.wallet_json(p_uid uuid) returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'coins', p.coins,
    'supporter', p.supporter,
    'equippedBoard', p.equipped_board,
    'equippedPieces', p.equipped_pieces,
    'owned', coalesce((select jsonb_agg(i.item_id order by i.item_id)
                       from public.inventory i where i.uid = p.uid), '[]'::jsonb),
    'adRewardsToday', jsonb_build_object(
      'coins', coalesce((select a.count from public.ad_rewards a
                         where a.uid = p.uid and a.day = public.utc_today() and a.kind = 'coins'), 0),
      'double', coalesce((select a.count from public.ad_rewards a
                          where a.uid = p.uid and a.day = public.utc_today() and a.kind = 'double'), 0)),
    'caps', jsonb_build_object('coins', 5, 'double', 3, 'adCoins', 25))
  from public.profiles p where p.uid = p_uid;
$$;
revoke all on function public.wallet_json(uuid) from public, anon, authenticated;

-- Whether p_uid may equip the item: free, bought, or a perk of a pass they hold.
create or replace function public.owns_item(p_uid uuid, p_item public.store_items) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select (p_item.price = 0 and not p_item.supporter_only)
      or exists (select 1 from public.inventory i where i.uid = p_uid and i.item_id = p_item.id)
      or (p_item.supporter_only
          and exists (select 1 from public.profiles pr where pr.uid = p_uid and pr.supporter));
$$;
revoke all on function public.owns_item(uuid, public.store_items) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- What clients may call
-- ---------------------------------------------------------------------------

create or replace function public.get_wallet() returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := public.require_uid();
begin
  perform public.ensure_profile();
  return public.wallet_json(v_uid);
end $$;
revoke all on function public.get_wallet() from public, anon;
grant execute on function public.get_wallet() to authenticated;

create or replace function public.get_store() returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := public.require_uid();
begin
  perform public.ensure_profile();
  return jsonb_build_object(
    'items', (select jsonb_agg(jsonb_build_object(
                'id', s.id, 'kind', s.kind, 'name', s.name, 'price', s.price,
                'supporterOnly', s.supporter_only) order by s.kind, s.sort)
              from public.store_items s),
    'products', (select jsonb_agg(jsonb_build_object('id', p.id, 'kind', p.kind, 'coins', p.coins)
                        order by p.coins, p.id)
                 from public.iap_products p),
    'wallet', public.wallet_json(v_uid));
end $$;
revoke all on function public.get_store() from public, anon;
grant execute on function public.get_store() to authenticated;

create or replace function public.buy_item(p_item_id text) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := public.lock_wallet(); v_item public.store_items; v_coins int;
begin
  select * into v_item from public.store_items where id = p_item_id;
  if not found then raise exception 'That item is not for sale.' using errcode = 'P0001'; end if;
  if v_item.supporter_only then
    raise exception 'That look comes with the Supporter Pass.' using errcode = 'P0001';
  end if;
  if public.owns_item(v_uid, v_item) then return public.wallet_json(v_uid); end if;
  select coins into v_coins from public.profiles where uid = v_uid;
  if v_coins < v_item.price then
    raise exception 'You need % more coins.', v_item.price - v_coins using errcode = 'P0001';
  end if;
  update public.profiles set coins = coins - v_item.price where uid = v_uid;
  insert into public.inventory (uid, item_id) values (v_uid, v_item.id);
  insert into public.coin_ledger (uid, delta, reason, ref) values (v_uid, -v_item.price, 'store', v_item.id);
  return public.wallet_json(v_uid);
end $$;
revoke all on function public.buy_item(text) from public, anon;
grant execute on function public.buy_item(text) to authenticated;

create or replace function public.equip_item(p_item_id text) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := public.lock_wallet(); v_item public.store_items;
begin
  select * into v_item from public.store_items where id = p_item_id;
  if not found then raise exception 'No such item.' using errcode = 'P0001'; end if;
  if not public.owns_item(v_uid, v_item) then
    raise exception 'You do not own that yet.' using errcode = 'P0001';
  end if;
  if v_item.kind = 'board' then
    update public.profiles set equipped_board = v_item.id where uid = v_uid;
  else
    update public.profiles set equipped_pieces = v_item.id where uid = v_uid;
  end if;
  return public.wallet_json(v_uid);
end $$;
revoke all on function public.equip_item(text) from public, anon;
grant execute on function public.equip_item(text) to authenticated;

-- Pays both seats when a match finishes. Fires once, on the transition.
create or replace function public.settle_match() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_kind text; v_winner text; v_reason text; v_side text; v_uid uuid; v_delta int; v_won boolean; v_count int;
begin
  if new.status <> 'FINISHED' or old.status = 'FINISHED' or new.result is null then return new; end if;
  v_kind := new.result ->> 'kind';
  v_winner := new.result ->> 'winner';
  v_reason := new.result ->> 'reason';
  foreach v_side in array array['tiger', 'goat'] loop
    v_uid := case v_side when 'tiger' then new.tiger_id else new.goat_id end;
    continue when v_uid is null;
    v_won := v_kind = 'win' and v_winner = v_side;
    -- A win pays most, a draw splits, a loss pays a little, walking away nothing.
    v_delta := case
      when v_kind = 'draw' then 15
      when v_won then 30
      when v_reason in ('resigned', 'timeout') then 0
      else 10 end;
    update public.profiles
       set games_played = games_played + 1, games_won = games_won + (case when v_won then 1 else 0 end)
     where uid = v_uid;
    continue when v_delta = 0;
    -- At most 20 rewarded games a day, so two accounts cannot farm coins.
    select count(*) into v_count from public.coin_ledger l
     where l.uid = v_uid and l.reason = 'match' and l.created_at >= public.utc_today();
    continue when v_count >= 20;
    insert into public.coin_ledger (uid, delta, reason, ref) values (v_uid, v_delta, 'match', new.id::text)
    on conflict do nothing;
    update public.profiles set coins = coins + v_delta where uid = v_uid;
  end loop;
  return new;
end $$;
drop trigger if exists matches_settle on public.matches;
create trigger matches_settle after update on public.matches
  for each row execute function public.settle_match();

-- The snapshot now carries what this seat earned, for the result card.
create or replace function public.match_snapshot(p_match_id uuid) returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'serverNow', now(),
    'mySide', public.bc_side_of(m, (select auth.uid())),
    'match', jsonb_build_object(
      'id', m.id, 'code', m.code, 'status', m.status, 'hostId', m.host_id,
      'tigerId', m.tiger_id, 'goatId', m.goat_id,
      'state', public.bc_state_of(m), 'version', m.version,
      'turnSeconds', m.turn_seconds, 'turnDeadline', m.turn_deadline,
      'lastMove', (select mv.move from public.match_moves mv
                   where mv.match_id = m.id order by mv.ply desc limit 1),
      'myReward', (select l.delta from public.coin_ledger l
                   where l.uid = (select auth.uid()) and l.reason = 'match' and l.ref = m.id::text),
      'myRewardDoubled', exists (select 1 from public.coin_ledger l
                   where l.uid = (select auth.uid()) and l.reason = 'match_double' and l.ref = m.id::text)),
    'players', jsonb_build_object(
      'tiger', public.bc_player(m.tiger_id), 'goat', public.bc_player(m.goat_id)))
  from public.matches m where m.id = p_match_id;
$$;
revoke all on function public.match_snapshot(uuid) from public, anon, authenticated;

-- A finished rewarded ad. 'coins' pays 25 (5 a day); 'double' pays the
-- match reward in p_ref again (3 a day, once per match).
create or replace function public.claim_ad_reward(p_kind text, p_ref text default null) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := public.lock_wallet(); v_today date := public.utc_today(); v_count int; v_cap int; v_delta int;
begin
  v_cap := case p_kind when 'coins' then 5 when 'double' then 3 else null end;
  if v_cap is null then raise exception 'That reward is not available.' using errcode = '22023'; end if;
  select count into v_count from public.ad_rewards
   where uid = v_uid and day = v_today and kind = p_kind for update;
  if coalesce(v_count, 0) >= v_cap then
    raise exception 'That is all the ad rewards for today. Come back tomorrow!' using errcode = 'P0001';
  end if;
  if p_kind = 'coins' then
    v_delta := 25;
    insert into public.coin_ledger (uid, delta, reason) values (v_uid, v_delta, 'ad');
  else
    select l.delta into v_delta from public.coin_ledger l
     where l.uid = v_uid and l.reason = 'match' and l.ref = p_ref;
    if v_delta is null then raise exception 'There is no game reward to double.' using errcode = 'P0001'; end if;
    if exists (select 1 from public.coin_ledger l where l.uid = v_uid and l.reason = 'match_double' and l.ref = p_ref) then
      raise exception 'That reward was already doubled.' using errcode = 'P0001';
    end if;
    insert into public.coin_ledger (uid, delta, reason, ref) values (v_uid, v_delta, 'match_double', p_ref);
  end if;
  insert into public.ad_rewards (uid, day, kind, count) values (v_uid, v_today, p_kind, 1)
  on conflict (uid, day, kind) do update set count = ad_rewards.count + 1;
  update public.profiles set coins = coins + v_delta where uid = v_uid;
  return public.wallet_json(v_uid) || jsonb_build_object('granted', v_delta);
end $$;
revoke all on function public.claim_ad_reward(text, text) from public, anon;
grant execute on function public.claim_ad_reward(text, text) to authenticated;

-- Grants a VERIFIED store purchase. Only the verify-purchase Edge Function
-- (service role) may call this; a replayed order grants nothing more. A
-- Supporter Pass restored on another profile (a guest who reinstalled)
-- follows the store account that proved it.
create or replace function public.grant_iap(p_uid uuid, p_product_id text, p_platform text, p_order_id text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_product public.iap_products; v_existing public.iap_receipts;
begin
  select * into v_product from public.iap_products where id = p_product_id;
  if not found then raise exception 'Unknown product %.', p_product_id using errcode = 'P0001'; end if;
  if not exists (select 1 from public.profiles where uid = p_uid) then
    raise exception 'No profile for that account.' using errcode = 'P0001';
  end if;
  perform 1 from public.profiles where uid = p_uid for update;
  select * into v_existing from public.iap_receipts where platform = p_platform and order_id = p_order_id;
  if found then
    if v_product.kind = 'pass' and v_existing.uid <> p_uid then
      update public.profiles set supporter = false where uid = v_existing.uid;
      update public.profiles set supporter = true where uid = p_uid;
      update public.iap_receipts set uid = p_uid where platform = p_platform and order_id = p_order_id;
    end if;
    return public.wallet_json(p_uid);
  end if;
  insert into public.iap_receipts (platform, order_id, uid, product_id)
  values (p_platform, p_order_id, p_uid, p_product_id);
  if v_product.kind = 'coins' then
    update public.profiles set coins = coins + v_product.coins where uid = p_uid;
    insert into public.coin_ledger (uid, delta, reason, ref)
    values (p_uid, v_product.coins, 'purchase', p_platform || ':' || p_order_id);
  else
    update public.profiles set supporter = true where uid = p_uid;
  end if;
  return public.wallet_json(p_uid);
end $$;
revoke all on function public.grant_iap(uuid, text, text, text) from public, anon, authenticated;
