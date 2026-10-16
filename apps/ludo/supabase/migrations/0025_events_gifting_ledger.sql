-- 0025: event cosmetics, gifting, and the economy ledger. Apply after 0024.
--
-- Events: a store item can carry `available_until`. While the window is
-- open it sells like anything else; afterwards it can no longer be bought,
-- but everyone who got it keeps it — a collection with stories in it. The
-- first event is the Festival of Lights board, on sale until Nov 15 2026.
--
-- Gifting: a member can buy a look FOR a friend, paying the item's own
-- price from their own balance. The friend keeps it forever and gets a
-- notification. Friends only, so the store cannot be used to spam
-- strangers.
--
-- Ledger: one trigger on the profiles wallet columns aggregates every coin
-- and gem created or destroyed into a per-day row — the numbers that tell
-- whether the economy holds, without touching a single grant function.

-- ---------------------------------------------------------------------------
-- Limited-time items
-- ---------------------------------------------------------------------------

alter table public.store_items add column if not exists available_until timestamptz;

-- Festival of Lights (mirrors the `diwali` entries in catalog.ts/themes.ts).
insert into public.store_items (id, kind, price, currency, board, dice, available_until) values
  ('diwali',      'board', 300,  'gems',  null,     null,          '2026-11-15 23:59:59+00'),
  ('diwali-dice', 'dice',  1200, 'coins', null,     null,          '2026-11-15 23:59:59+00'),
  ('diwali-pack', 'pack',  375,  'gems',  'diwali', 'diwali-dice', '2026-11-15 23:59:59+00')
on conflict (id) do update set
  kind = excluded.kind, price = excluded.price, currency = excluded.currency,
  board = excluded.board, dice = excluded.dice, available_until = excluded.available_until;

-- Same as 0021, plus the event window.
create or replace function public.purchase_item(p_item_id text, p_expected_price integer)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid;
  v_item public.store_items;
  v_balance integer;
begin
  select * into v_item from public.store_items where id = p_item_id;
  if not found then
    raise exception 'This item is not in the store.' using errcode = 'P0002';
  end if;
  v_uid := public.lock_wallet();
  if exists (select 1 from public.profile_items where uid = v_uid and item_id = p_item_id) then
    return public.wallet_json(v_uid);
  end if;
  if v_item.available_until is not null and now() > v_item.available_until then
    raise exception 'That look was part of a past event and is no longer for sale.' using errcode = 'P0001';
  end if;
  if p_expected_price is distinct from v_item.price then
    raise exception 'The price of this item has changed. Please reopen the store.' using errcode = '22023';
  end if;
  select case when v_item.currency = 'gems' then gems else coins end
    into v_balance from public.profiles where uid = v_uid;
  if v_balance < v_item.price then
    if v_item.currency = 'gems' then
      raise exception 'Not enough gems. Missions, the season pass and rewarded ads earn them.' using errcode = 'P0001';
    end if;
    raise exception 'Not enough coins. Finish matches or claim your daily gift.' using errcode = 'P0001';
  end if;
  if v_item.currency = 'gems' then
    update public.profiles set gems = gems - v_item.price where uid = v_uid;
  else
    update public.profiles set coins = coins - v_item.price where uid = v_uid;
  end if;
  insert into public.profile_items (uid, item_id)
    select v_uid, x from unnest(array[p_item_id, v_item.board, v_item.dice]) as x
    where x is not null
  on conflict do nothing;
  return public.wallet_json(v_uid);
end $$;
revoke execute on function public.purchase_item(text, integer) from public, anon;
grant execute on function public.purchase_item(text, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Gifting
-- ---------------------------------------------------------------------------

do $$ begin
  alter type public.notification_type add value if not exists 'GIFT';
exception when duplicate_object then null; end $$;

create or replace function public.gift_item(p_to uuid, p_item_id text, p_expected_price integer)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid;
  v_item public.store_items;
  v_balance integer;
begin
  select * into v_item from public.store_items where id = p_item_id;
  if not found then
    raise exception 'This item is not in the store.' using errcode = 'P0002';
  end if;
  v_uid := public.lock_wallet();
  if p_to is null or p_to = v_uid then
    raise exception 'Pick a friend to send this to.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.friendships where user_id = v_uid and friend_id = p_to) then
    raise exception 'Gifts go to friends. Add them first!' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles where uid = p_to) then
    raise exception 'That player is no longer around.' using errcode = 'P0002';
  end if;
  if v_item.price = 0 then
    raise exception 'Free looks are already everyone''s.' using errcode = '22023';
  end if;
  if exists (select 1 from public.profile_items where uid = p_to and item_id = p_item_id) then
    raise exception 'Your friend already owns that one. Pick another!' using errcode = 'P0001';
  end if;
  if v_item.available_until is not null and now() > v_item.available_until then
    raise exception 'That look was part of a past event and is no longer for sale.' using errcode = 'P0001';
  end if;
  if p_expected_price is distinct from v_item.price then
    raise exception 'The price of this item has changed. Please reopen the store.' using errcode = '22023';
  end if;
  select case when v_item.currency = 'gems' then gems else coins end
    into v_balance from public.profiles where uid = v_uid;
  if v_balance < v_item.price then
    if v_item.currency = 'gems' then
      raise exception 'Not enough gems. Missions, the season pass and rewarded ads earn them.' using errcode = 'P0001';
    end if;
    raise exception 'Not enough coins. Finish matches or claim your daily gift.' using errcode = 'P0001';
  end if;
  if v_item.currency = 'gems' then
    update public.profiles set gems = gems - v_item.price where uid = v_uid;
  else
    update public.profiles set coins = coins - v_item.price where uid = v_uid;
  end if;
  insert into public.profile_items (uid, item_id)
    select p_to, x from unnest(array[p_item_id, v_item.board, v_item.dice]) as x
    where x is not null
  on conflict do nothing;
  perform public.notify(
    p_to, 'GIFT', 'A gift for you!',
    public.display_of(v_uid) || ' sent you a look from the store. It is already yours — equip it!'
  );
  return public.wallet_json(v_uid);
end $$;
revoke execute on function public.gift_item(uuid, text, integer) from public, anon;
grant execute on function public.gift_item(uuid, text, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- The economy ledger
-- ---------------------------------------------------------------------------

create table if not exists public.economy_ledger (
  day       date primary key,
  coins_in  bigint not null default 0,
  coins_out bigint not null default 0,
  gems_in   bigint not null default 0,
  gems_out  bigint not null default 0
);
alter table public.economy_ledger enable row level security;
revoke all on public.economy_ledger from public, anon, authenticated;

create or replace function public.record_economy() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.economy_ledger (day, coins_in, coins_out, gems_in, gems_out)
  values (
    public.utc_today(),
    greatest(new.coins - old.coins, 0), greatest(old.coins - new.coins, 0),
    greatest(new.gems - old.gems, 0), greatest(old.gems - new.gems, 0)
  )
  on conflict (day) do update set
    coins_in  = economy_ledger.coins_in  + excluded.coins_in,
    coins_out = economy_ledger.coins_out + excluded.coins_out,
    gems_in   = economy_ledger.gems_in   + excluded.gems_in,
    gems_out  = economy_ledger.gems_out  + excluded.gems_out;
  return new;
end $$;

drop trigger if exists economy_ledger_trigger on public.profiles;
create trigger economy_ledger_trigger
  after update of coins, gems on public.profiles
  for each row
  when (old.coins is distinct from new.coins or old.gems is distinct from new.gems)
  execute function public.record_economy();
