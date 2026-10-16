-- 0033: economy tuning. Apply after 0032.
--
-- The anchor is the coin pack: 100,000 coins for Rs 100, so 1,000 coins per
-- rupee. Everything here is set against it:
--   * rewarded ads pay more and there are two new ones: a plain coin ad
--     (500 coins, four a day) and "double it" after a free online win
--     (the match pay again, three a day). Gem ad 2 gems, rescue boost 500,
--     extra spins three a day. Caps mirror AD_REWARD_CAPS in
--     src/domain/entities/Progression.ts.
--   * gems convert to coins one way at 200 coins a gem, in fixed bundles.
--     Below the coin ad (a gem ad = 2 gems = 400) so no ad is worth farming
--     over another, and far below a coin pack so nobody buys gems for coins.
--   * five coin packs replace the old two (the old product rows stay for
--     their receipts; the client no longer lists them).
-- Coins still never leave the game.

alter table public.ad_rewards drop constraint if exists ad_rewards_kind_check;
alter table public.ad_rewards
  add constraint ad_rewards_kind_check
  check (kind in ('gem', 'spin', 'rescue-boost', 'coin', 'double'));

-- A free online win may be doubled once, by watching an ad.
alter table public.profile_rewards add column if not exists doubled boolean not null default false;

create or replace function public.gem_coin_rate() returns int
language sql immutable set search_path = public, pg_temp as $$ select 200 $$;

create or replace function public.claim_ad_reward(p_kind text) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := public.lock_wallet();
  v_today date := public.utc_today();
  v_count int;
  v_cap int;
  v_rescued date;
begin
  v_cap := case p_kind
    when 'gem' then 5 when 'spin' then 3 when 'rescue-boost' then 1 when 'coin' then 4
    else null end;
  if v_cap is null then
    raise exception 'That reward is not available.' using errcode = '22023';
  end if;
  select count into v_count from public.ad_rewards
   where uid = v_uid and day = v_today and kind = p_kind for update;
  if coalesce(v_count, 0) >= v_cap then
    raise exception 'That is all the ad rewards for today. Come back tomorrow!' using errcode = 'P0001';
  end if;
  if p_kind = 'rescue-boost' then
    select last_rescue into v_rescued from public.profiles where uid = v_uid;
    if v_rescued is distinct from v_today then
      raise exception 'Claim today''s rescue first.' using errcode = 'P0001';
    end if;
  end if;

  insert into public.ad_rewards (uid, day, kind, count) values (v_uid, v_today, p_kind, 1)
  on conflict (uid, day, kind) do update set count = ad_rewards.count + 1;

  if p_kind = 'gem' then
    update public.profiles set gems = gems + 2 where uid = v_uid;
  elsif p_kind = 'rescue-boost' then
    update public.profiles set coins = coins + 500 where uid = v_uid;
  elsif p_kind = 'coin' then
    update public.profiles set coins = coins + 500 where uid = v_uid;
  end if;
  -- 'spin' grants a credit that spin_daily consumes instead of gems.
  return public.wallet_json(v_uid);
end $$;
revoke execute on function public.claim_ad_reward(text) from public, anon;
grant execute on function public.claim_ad_reward(text) to authenticated;

-- "Double it": after a free online win, an ad pays the match's coins again.
-- Only free tables (a staked pot is never doubled), only within an hour of
-- the result, once per match, three times a day.
create or replace function public.claim_double_up(p_match_id uuid) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := public.lock_wallet();
  v_today date := public.utc_today();
  v_key text := 'online:' || p_match_id::text;
  v_reward public.profile_rewards;
  v_stake int;
  v_count int;
begin
  select * into v_reward from public.profile_rewards
   where uid = v_uid and match_id = v_key for update;
  if not found or not v_reward.won or v_reward.coins <= 0 then
    raise exception 'There is no win to double here.' using errcode = 'P0002';
  end if;
  if v_reward.doubled then
    raise exception 'That win was already doubled.' using errcode = 'P0001';
  end if;
  if v_reward.created_at < now() - interval '1 hour' then
    raise exception 'That win is too old to double.' using errcode = 'P0001';
  end if;
  select stake into v_stake from public.matches where id = p_match_id;
  if coalesce(v_stake, 0) > 0 then
    raise exception 'Only free-table wins can be doubled.' using errcode = '22023';
  end if;
  select count into v_count from public.ad_rewards
   where uid = v_uid and day = v_today and kind = 'double' for update;
  if coalesce(v_count, 0) >= 3 then
    raise exception 'That is all the ad rewards for today. Come back tomorrow!' using errcode = 'P0001';
  end if;

  insert into public.ad_rewards (uid, day, kind, count) values (v_uid, v_today, 'double', 1)
  on conflict (uid, day, kind) do update set count = ad_rewards.count + 1;
  update public.profile_rewards set doubled = true where uid = v_uid and match_id = v_key;
  update public.profiles set coins = coins + v_reward.coins where uid = v_uid;
  return public.wallet_json(v_uid);
end $$;
revoke execute on function public.claim_double_up(uuid) from public, anon;
grant execute on function public.claim_double_up(uuid) to authenticated;

-- Gems to coins, one way, in fixed bundles.
create or replace function public.convert_gems(p_gems int) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := public.lock_wallet();
begin
  if p_gems is null or p_gems not in (10, 50, 250) then
    raise exception 'Gems exchange in bundles of 10, 50 or 250.' using errcode = '22023';
  end if;
  if (select gems from public.profiles where uid = v_uid) < p_gems then
    raise exception 'Not enough gems for that bundle.' using errcode = 'P0001';
  end if;
  update public.profiles
     set gems = gems - p_gems, coins = coins + p_gems * public.gem_coin_rate()
   where uid = v_uid;
  return public.wallet_json(v_uid);
end $$;
revoke execute on function public.convert_gems(int) from public, anon;
grant execute on function public.convert_gems(int) to authenticated;

-- The coin packs: 1,000 coins a rupee, a little more in the bigger packs.
insert into public.iap_products (id, kind, gems, coins) values
  ('ludo.coins.40k',   'coins', 0,   40000),
  ('ludo.coins.100k',  'coins', 0,  100000),
  ('ludo.coins.275k',  'coins', 0,  275000),
  ('ludo.coins.600k',  'coins', 0,  600000),
  ('ludo.coins.1300k', 'coins', 0, 1300000)
on conflict (id) do update set kind = excluded.kind, gems = excluded.gems, coins = excluded.coins;

-- The guest vault now holds up to 10,000 (five 250-coin ads a day fill it
-- faster than before); the one-time claim onto an account is capped to match.
create or replace function public.claim_vault(p_coins integer) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := public.lock_wallet();
  v_amount int := least(greatest(coalesce(p_coins, 0), 0), 10000);
begin
  if exists (select 1 from public.profile_rewards where uid = v_uid and match_id = 'vault:once') then
    return public.wallet_json(v_uid);
  end if;
  insert into public.profile_rewards (uid, match_id, coins, won)
  values (v_uid, 'vault:once', v_amount, false);
  if v_amount > 0 then
    update public.profiles set coins = coins + v_amount where uid = v_uid;
  end if;
  return public.wallet_json(v_uid);
end $$;
revoke execute on function public.claim_vault(integer) from public, anon;
grant execute on function public.claim_vault(integer) to authenticated;
