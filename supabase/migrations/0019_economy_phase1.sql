-- 0019: economy phase 1. Apply after 0018.
--
-- Cosmetics become long-term goals (prices ~10x, mirroring catalog.ts), gems
-- get scarcer (missions and wheel odds), the flat 250 daily gift becomes a
-- 7-day streak calendar, and a broke player can claim a once-a-day comeback
-- rescue so running out of coins is never a dead end.

-- ---------------------------------------------------------------------------
-- Store reprice (mirrors src/domain/cosmetics/catalog.ts)
-- ---------------------------------------------------------------------------

update public.store_items s set price = v.price
from (values
  -- Rare boards
  ('heritage', 2500), ('forest', 2500), ('ocean', 2500), ('candy', 3000),
  ('rose', 3500), ('sunset', 3500),
  -- Epic boards
  ('neon', 7500), ('arctic', 7500), ('jade', 7500),
  -- Legendary boards (gem-priced from phase 2; high coin prices until then)
  ('royal', 15000), ('cosmic', 15000), ('obsidian', 25000),
  -- Individual dice
  ('ruby', 2000), ('mint', 2000), ('gold', 2400), ('galaxy', 5000), ('midnight', 8000),
  -- Signature dice
  ('heritage-dice', 1200), ('royal-dice', 1200), ('neon-dice', 1200),
  ('forest-dice', 1200), ('ocean-dice', 1200), ('rose-dice', 1200),
  ('sunset-dice', 1200), ('arctic-dice', 1200), ('cosmic-dice', 1200),
  ('jade-dice', 1200), ('candy-dice', 1200), ('obsidian-dice', 1200),
  -- Table style
  ('round-homes', 2000),
  -- Packs: board price + 25%
  ('heritage-pack', 3125), ('forest-pack', 3125), ('ocean-pack', 3125),
  ('candy-pack', 3750), ('rose-pack', 4375), ('sunset-pack', 4375),
  ('neon-pack', 9375), ('arctic-pack', 9375), ('jade-pack', 9375),
  ('royal-pack', 18750), ('cosmic-pack', 18750), ('obsidian-pack', 31250)
) as v(id, price)
where s.id = v.id;

-- ---------------------------------------------------------------------------
-- Scarcer gems
-- ---------------------------------------------------------------------------

update public.missions set gems = 2 where id = 'win-online-1';
update public.missions set gems = 0 where id = 'capture-3';

-- Same wheel, leaner gem odds: 7% pay gems (was 17%), coins take the rest.
create or replace function public.spin_daily() returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := public.lock_wallet();
  v_today date := public.utc_today();
  v_spins int;
  v_roll int;
  v_kind text;
  v_amount int;
  v_slot int;
  v_streak int;
  v_last date;
  v_bonus int := 0;
begin
  select coalesce(spins, 0) into v_spins from public.daily_spins where uid = v_uid and day = v_today;
  v_spins := coalesce(v_spins, 0);
  if v_spins >= 4 then
    raise exception 'That is all the spins for today. Come back tomorrow!' using errcode = 'P0001';
  end if;
  if v_spins >= 1 then
    if (select gems from public.profiles where uid = v_uid) < 10 then
      raise exception 'An extra spin costs 10 gems.' using errcode = 'P0001';
    end if;
    update public.profiles set gems = gems - 10 where uid = v_uid;
  else
    select last_spin, spin_streak into v_last, v_streak from public.profiles where uid = v_uid;
    v_streak := case when v_last = v_today - 1 then coalesce(v_streak, 0) + 1 else 1 end;
    if v_streak % 7 = 0 then v_bonus := 25; end if;
    update public.profiles set last_spin = v_today, spin_streak = v_streak, gems = gems + v_bonus
     where uid = v_uid;
  end if;

  loop
    v_roll := get_byte(uuid_send(gen_random_uuid()), 0);
    exit when v_roll < 200;
  end loop;
  v_roll := v_roll % 100;
  -- slot: index on the wheel the client animates to.
  if v_roll < 35 then v_kind := 'coins'; v_amount := 100; v_slot := 0;
  elsif v_roll < 63 then v_kind := 'coins'; v_amount := 250; v_slot := 1;
  elsif v_roll < 80 then v_kind := 'coins'; v_amount := 500; v_slot := 2;
  elsif v_roll < 85 then v_kind := 'coins'; v_amount := 1000; v_slot := 3;
  elsif v_roll < 90 then v_kind := 'gems'; v_amount := 5; v_slot := 4;
  elsif v_roll < 92 then v_kind := 'gems'; v_amount := 15; v_slot := 5;
  else v_kind := 'xp'; v_amount := 80; v_slot := 6;
  end if;

  if v_kind = 'coins' then update public.profiles set coins = coins + v_amount where uid = v_uid;
  elsif v_kind = 'gems' then update public.profiles set gems = gems + v_amount where uid = v_uid;
  else perform public.grant_xp(v_uid, v_amount);
  end if;
  insert into public.daily_spins (uid, day, spins) values (v_uid, v_today, 1)
  on conflict (uid, day) do update set spins = daily_spins.spins + 1;
  perform public.bump_mission(v_uid, 'spin', 1);
  return jsonb_build_object(
    'reward', jsonb_build_object('kind', v_kind, 'amount', v_amount, 'slot', v_slot, 'streakBonus', v_bonus),
    'spinsToday', v_spins + 1,
    'wallet', public.wallet_json(v_uid)
  );
end $$;
revoke execute on function public.spin_daily() from public, anon;
grant execute on function public.spin_daily() to authenticated;

-- ---------------------------------------------------------------------------
-- The daily gift becomes a 7-day streak calendar
-- ---------------------------------------------------------------------------

alter table public.profiles add column if not exists gift_streak int not null default 0 check (gift_streak >= 0);
alter table public.profiles add column if not exists last_rescue date;

-- Day 1..7 pays 100, 150, 200, 300, 400, 500, 750 coins; day 7 adds 25 gems.
-- Missing a day restarts the calendar at day 1. Mirrors GIFT_CYCLE_COINS and
-- GIFT_STREAK_GEMS in src/domain/entities/Wallet.ts.
create or replace function public.claim_daily_gift() returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := public.lock_wallet();
  v_today date := public.utc_today();
  v_last date;
  v_streak int;
  v_day int;
  v_coins int;
  v_gems int;
begin
  select last_gift, gift_streak into v_last, v_streak from public.profiles where uid = v_uid;
  if v_last is not null and v_last >= v_today then
    raise exception 'Today''s gift is claimed. Come back tomorrow!' using errcode = 'P0001';
  end if;
  v_streak := case when v_last = v_today - 1 then coalesce(v_streak, 0) + 1 else 1 end;
  v_day := ((v_streak - 1) % 7) + 1;
  v_coins := (array[100, 150, 200, 300, 400, 500, 750])[v_day];
  v_gems := case when v_day = 7 then 25 else 0 end;
  update public.profiles
     set coins = coins + v_coins, gems = gems + v_gems,
         last_gift = v_today, gift_streak = v_streak
   where uid = v_uid;
  return public.wallet_json(v_uid);
end $$;
revoke all on function public.claim_daily_gift() from public, anon;
grant execute on function public.claim_daily_gift() to authenticated;

-- ---------------------------------------------------------------------------
-- Comeback rescue: running out of coins is never a dead end
-- ---------------------------------------------------------------------------

-- Mirrors RESCUE_COINS and RESCUE_THRESHOLD in src/domain/entities/Wallet.ts.
create or replace function public.claim_rescue() returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := public.lock_wallet();
  v_today date := public.utc_today();
  v_coins int;
  v_last date;
begin
  select coins, last_rescue into v_coins, v_last from public.profiles where uid = v_uid;
  if v_coins >= 100 then
    raise exception 'The rescue is for when you are nearly out of coins.' using errcode = 'P0001';
  end if;
  if v_last is not null and v_last >= v_today then
    raise exception 'Today''s rescue is used. Win a free game to rebuild!' using errcode = 'P0001';
  end if;
  update public.profiles set coins = coins + 300, last_rescue = v_today where uid = v_uid;
  return public.wallet_json(v_uid);
end $$;
revoke all on function public.claim_rescue() from public, anon;
grant execute on function public.claim_rescue() to authenticated;

-- ---------------------------------------------------------------------------
-- Wallet snapshot carries the new state
-- ---------------------------------------------------------------------------

create or replace function public.wallet_json(p_uid uuid) returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'coins', p.coins,
    'gems', p.gems,
    'xp', p.xp,
    'level', public.level_info(p.xp),
    'lastGift', p.last_gift,
    'giftStreak', p.gift_streak,
    'lastRescue', p.last_rescue,
    'lastSpin', p.last_spin,
    'spinStreak', p.spin_streak,
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
