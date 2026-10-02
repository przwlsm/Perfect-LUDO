-- 0024: the piggy bank and the Ludo Club. Apply after 0023.
--
-- Piggy bank: every bit of play feeds it — it fills 1:1 with the XP the
-- server grants, up to 15,000 coins. The player watches it fill for free
-- and can crack it open with the `ludo.piggy` store purchase, which pays
-- out whatever is inside and starts it again.
--
-- Ludo Club: the `ludo.club` store SUBSCRIPTION. Each verified purchase or
-- renewal (every store renewal carries a fresh order id) extends membership
-- by 31 days. Members' extra wheel spins are free and their daily gift
-- brings 10 gems on top of the calendar.
--
-- Both stay opt-in: nothing here changes the game for players who never
-- open the shop. Mirrors PIGGY_CAP / CLUB_* in src/domain/entities/Wallet.ts.

alter table public.profiles add column if not exists piggy_coins int not null default 0
  check (piggy_coins >= 0);
alter table public.profiles add column if not exists club_until timestamptz;

create or replace function public.is_club(p_uid uuid) returns boolean
language sql stable set search_path = public, pg_temp as $$
  select coalesce((select club_until > now() from public.profiles where uid = p_uid), false);
$$;

-- Same level-ups as 0012, plus the piggy fill.
create or replace function public.grant_xp(p_uid uuid, p_amount int) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_before int;
  v_after int;
  v_level int;
  v_coins int := 0;
  v_gems int := 0;
begin
  if coalesce(p_amount, 0) <= 0 then return; end if;
  select xp into v_before from public.profiles where uid = p_uid for update;
  if not found then return; end if;
  v_before := (public.level_info(v_before) ->> 'level')::int;
  update public.profiles
     set xp = xp + p_amount,
         piggy_coins = least(piggy_coins + p_amount, 15000)
   where uid = p_uid returning xp into v_after;
  v_after := (public.level_info(v_after) ->> 'level')::int;
  for v_level in (v_before + 1)..v_after loop
    v_coins := v_coins + 100 + 20 * v_level;
    v_gems := v_gems + 5 + (case when v_level % 5 = 0 then 20 else 0 end);
  end loop;
  if v_coins > 0 or v_gems > 0 then
    update public.profiles set coins = coins + v_coins, gems = gems + v_gems where uid = p_uid;
  end if;
  insert into public.season_progress (uid, season, xp) values (p_uid, public.current_season(), p_amount)
  on conflict (uid, season) do update set xp = season_progress.xp + excluded.xp;
end $$;
revoke all on function public.grant_xp(uuid, int) from public, anon, authenticated;

-- Same calendar as 0019, plus the Club's daily gems.
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
  v_gems := case when v_day = 7 then 25 else 0 end
          + case when public.is_club(v_uid) then 10 else 0 end;
  update public.profiles
     set coins = coins + v_coins, gems = gems + v_gems,
         last_gift = v_today, gift_streak = v_streak
   where uid = v_uid;
  return public.wallet_json(v_uid);
end $$;
revoke all on function public.claim_daily_gift() from public, anon;
grant execute on function public.claim_daily_gift() to authenticated;

-- Same wheel as 0020, but a Club member's extra spins cost nothing.
create or replace function public.spin_daily() returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := public.lock_wallet();
  v_today date := public.utc_today();
  v_spins int;
  v_ad_used int;
  v_ad_credits int;
  v_ad_paid boolean := false;
  v_roll int;
  v_kind text;
  v_amount int;
  v_slot int;
  v_streak int;
  v_last date;
  v_bonus int := 0;
begin
  select spins, ad_spins into v_spins, v_ad_used from public.daily_spins
   where uid = v_uid and day = v_today;
  v_spins := coalesce(v_spins, 0);
  v_ad_used := coalesce(v_ad_used, 0);
  if v_spins >= 4 then
    raise exception 'That is all the spins for today. Come back tomorrow!' using errcode = 'P0001';
  end if;
  if v_spins >= 1 and not public.is_club(v_uid) then
    select count into v_ad_credits from public.ad_rewards
     where uid = v_uid and day = v_today and kind = 'spin';
    if v_ad_used < coalesce(v_ad_credits, 0) then
      v_ad_paid := true;
    else
      if (select gems from public.profiles where uid = v_uid) < 10 then
        raise exception 'An extra spin costs 10 gems.' using errcode = 'P0001';
      end if;
      update public.profiles set gems = gems - 10 where uid = v_uid;
    end if;
  elsif v_spins = 0 then
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
  insert into public.daily_spins (uid, day, spins, ad_spins)
  values (v_uid, v_today, 1, case when v_ad_paid then 1 else 0 end)
  on conflict (uid, day) do update
    set spins = daily_spins.spins + 1,
        ad_spins = daily_spins.ad_spins + (case when v_ad_paid then 1 else 0 end);
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
-- The two new products
-- ---------------------------------------------------------------------------

alter table public.iap_products drop constraint if exists iap_products_kind_check;
alter table public.iap_products
  add constraint iap_products_kind_check
  check (kind in ('gems', 'coins', 'starter', 'pass', 'piggy', 'club'));

insert into public.iap_products (id, kind, gems, coins) values
  ('ludo.piggy', 'piggy', 0, 0),
  ('ludo.club',  'club',  0, 0)
on conflict (id) do update set kind = excluded.kind, gems = excluded.gems, coins = excluded.coins;

-- Same as 0023, plus the piggy payout and the Club extension.
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
  elsif v_product.kind = 'piggy' then
    update public.profiles set coins = coins + piggy_coins, piggy_coins = 0 where uid = p_uid;
  elsif v_product.kind = 'club' then
    -- Each verified order (a renewal has its own id) adds a month.
    update public.profiles
       set club_until = greatest(coalesce(club_until, now()), now()) + interval '31 days'
     where uid = p_uid;
  end if;
  return public.wallet_json(p_uid);
end $$;
revoke all on function public.grant_iap(uuid, text, text, text) from public, anon, authenticated;

-- The wallet says what the piggy holds and how long the Club runs.
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
    'piggyCoins', p.piggy_coins,
    'clubUntil', p.club_until,
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
