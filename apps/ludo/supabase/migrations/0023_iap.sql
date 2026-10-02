-- 0023: real-money purchases. Apply after 0022.
--
-- The stores (Google Play / App Store) take the payment; this side only
-- grants what a VERIFIED receipt says was bought. The client never calls
-- grant_iap: it sends the store's purchase token to the verify-purchase
-- Edge Function, which checks it with the store and then calls grant_iap
-- with the service role. Each store order grants exactly once, so replays,
-- retries and restored purchases are all safe.
--
-- Money only ever flows in: coins and gems bought here are the same virtual
-- balances as everywhere else and are never redeemable.
-- Mirrors IAP_PRODUCTS in src/domain/entities/Iap.ts.

create table if not exists public.iap_products (
  id    text primary key check (id ~ '^[a-z0-9._]{1,64}$'),
  kind  text not null check (kind in ('gems', 'coins', 'starter', 'pass')),
  gems  int not null default 0 check (gems >= 0),
  coins int not null default 0 check (coins >= 0)
);
alter table public.iap_products enable row level security;
revoke all on public.iap_products from public, anon, authenticated;

insert into public.iap_products (id, kind, gems, coins) values
  ('ludo.gems.small',  'gems',    160,     0),
  ('ludo.gems.medium', 'gems',    900,     0),
  ('ludo.gems.large',  'gems',   4200,     0),
  ('ludo.coins.small', 'coins',     0, 12000),
  ('ludo.coins.large', 'coins',     0, 75000),
  -- One per account: a taste of both currencies at a friendly price.
  ('ludo.starter',     'starter', 120,  5000),
  -- The premium season pass, paid with money instead of 250 gems.
  ('ludo.pass',        'pass',      0,     0)
on conflict (id) do update set kind = excluded.kind, gems = excluded.gems, coins = excluded.coins;

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

create or replace function public.grant_iap(
  p_uid uuid, p_product_id text, p_platform text, p_order_id text
) returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_product public.iap_products;
  v_inserted int;
begin
  select * into v_product from public.iap_products where id = p_product_id;
  if not found then
    raise exception 'Unknown product %.', p_product_id using errcode = 'P0002';
  end if;
  if not exists (select 1 from public.profiles where uid = p_uid) then
    raise exception 'No profile for that account.' using errcode = 'P0002';
  end if;
  -- The row lock all wallet writes take.
  perform 1 from public.profiles where uid = p_uid for update;

  if v_product.kind = 'starter'
     and exists (select 1 from public.iap_receipts where uid = p_uid and product_id = p_product_id) then
    return public.wallet_json(p_uid);
  end if;

  insert into public.iap_receipts (platform, order_id, uid, product_id)
  values (p_platform, p_order_id, p_uid, p_product_id)
  on conflict (platform, order_id) do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then
    -- A replay of an order already granted (to whoever sent it first).
    return public.wallet_json(p_uid);
  end if;

  if v_product.coins > 0 or v_product.gems > 0 then
    update public.profiles
       set coins = coins + v_product.coins, gems = gems + v_product.gems
     where uid = p_uid;
  end if;
  if v_product.kind = 'pass' then
    insert into public.season_progress (uid, season, premium)
    values (p_uid, public.current_season(), true)
    on conflict (uid, season) do update set premium = true;
  end if;
  return public.wallet_json(p_uid);
end $$;
-- Only the verify-purchase Edge Function (service role) may grant.
revoke all on function public.grant_iap(uuid, text, text, text) from public, anon, authenticated;
