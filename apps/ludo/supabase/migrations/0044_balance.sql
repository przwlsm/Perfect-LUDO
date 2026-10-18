-- 0044: balancing gems and coins. Gems are rare and keep their value: they
-- come from winning and from loyalty, not from grinding, and they buy the
-- premium things coins cannot.
--
-- 1. Fewer free gems. A rewarded video pays 1 gem instead of 2 (still five a
--    day, so the videos stay), and a level-up pays 2 gems instead of 5, with
--    10 more every fifth level instead of 20. Missions, the weekly streaks,
--    the season track, leagues, the tournament and cup wins are unchanged
--    (the cup gems themselves are set in 0043).
--
-- 2. The extra Lucky Spin costs 5 gems instead of 10. A spin returns about
--    350 coins of value on average, so at 10 gems paying with gems was a
--    poor deal. Free spins, video spins and Club spins are as before.
--
-- 3. The premium season pass costs 250 gems but its track paid back 432
--    (8 a tier, 40 every fifth), so after one purchase every later season
--    was free and gems only grew. The premium track now pays 100 gems a
--    season (10 at tiers 5, 10, 15, 20 and 25, and 50 for finishing at 30),
--    so each pass costs 150 gems of real value. Its coins are unchanged.
--
-- 4. Cups filled by computer players create coins: the computer players pay
--    no real entry, so a human winner takes three entries for one. The daily
--    cap of three paid brackets (cup_bot_prize_cap) stays, and the top halls
--    (King's Court, Emperor's Palace, Hall of Legends) now pay such a bracket
--    once a day, so nobody can mint millions of coins a day there. The throne
--    is always lit, as before, and brackets of four people pay in full every
--    time. Cup gems (0043) follow prize_paid, so the same cap applies to them.
--
-- The functions are copied from their latest versions (claim_ad_reward from
-- 0033, grant_xp and spin_daily from 0024, season_tier_reward from 0012,
-- cup_settle from 0037) with only these rules changed. Safe to re-run.

/** Paid brackets with computer players per day in halls 6 to 8. */
create or replace function public.cup_top_bot_prize_cap() returns int
language sql immutable set search_path = public, pg_temp as $$ select 1 $$;

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
    update public.profiles set gems = gems + 1 where uid = v_uid;
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
    v_gems := v_gems + 2 + (case when v_level % 5 = 0 then 10 else 0 end);
  end loop;
  if v_coins > 0 or v_gems > 0 then
    update public.profiles set coins = coins + v_coins, gems = gems + v_gems where uid = p_uid;
  end if;
  insert into public.season_progress (uid, season, xp) values (p_uid, public.current_season(), p_amount)
  on conflict (uid, season) do update set xp = season_progress.xp + excluded.xp;
end $$;
revoke all on function public.grant_xp(uuid, int) from public, anon, authenticated;

create or replace function public.season_tier_reward(p_tier int, p_premium boolean) returns jsonb
language sql immutable as $$
  select case when p_premium
    then jsonb_build_object('coins', 150 + 15 * p_tier,
                            'gems', case when p_tier = 30 then 50 when p_tier % 5 = 0 then 10 else 0 end)
    else jsonb_build_object('coins', 80 + 10 * p_tier, 'gems', case when p_tier % 5 = 0 then 15 else 0 end)
  end;
$$;

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
      if (select gems from public.profiles where uid = v_uid) < 5 then
        raise exception 'An extra spin costs 5 gems.' using errcode = 'P0001';
      end if;
      update public.profiles set gems = gems - 5 where uid = v_uid;
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

create or replace function public.cup_settle(p_bracket uuid) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  b public.cup_brackets;
  c public.cups;
  f public.cup_rounds;
  v_runner uuid;
  v_paid_today int := 0;
  v_pay boolean := true;
  v_pot int;
  v_seats int;
begin
  select * into b from public.cup_brackets where id = p_bracket for update;
  if not found or b.status <> 'PLAYING' then return; end if;
  select * into f from public.cup_rounds where bracket_id = p_bracket and round = 2;
  if not found or f.winner_uid is null then return; end if;
  select * into c from public.cups where id = b.cup_id;
  v_runner := case when f.winner_uid = f.a_uid then f.b_uid else f.a_uid end;
  select count(*), coalesce(sum(paid), 0) into v_seats, v_pot from public.cup_entries where bracket_id = p_bracket;

  if b.is_private then
    -- Friends: the winner takes everything that was paid in.
    update public.profiles set coins = coins + v_pot where uid = f.winner_uid and not is_bot;
  else
    if b.has_bots then
      select count(*) into v_paid_today from public.cup_brackets
       where winner_uid = f.winner_uid and has_bots and prize_paid
         and finished_at >= (public.utc_today())::timestamp at time zone 'utc';
      v_pay := v_paid_today < public.cup_bot_prize_cap();
      -- The top halls (6 to 8) pay a bracket with computer players once a day.
      if v_pay and c.sort >= 6 then
        select count(*) into v_paid_today from public.cup_brackets pb join public.cups pc on pc.id = pb.cup_id
         where pb.winner_uid = f.winner_uid and pb.has_bots and pb.prize_paid and pc.sort >= 6
           and pb.finished_at >= (public.utc_today())::timestamp at time zone 'utc';
        v_pay := v_paid_today < public.cup_top_bot_prize_cap();
      end if;
    end if;
    if v_pay then
      update public.profiles set coins = coins + c.prize where uid = f.winner_uid and not is_bot;
    end if;
    update public.profiles set coins = coins + c.runner_up where uid = v_runner and not is_bot;
  end if;

  -- The throne needs a full table, so two friends cannot farm one.
  if v_seats = 4 and not exists (select 1 from public.profiles where uid = f.winner_uid and is_bot) then
    insert into public.throne_wins (uid, cup_id, count) values (f.winner_uid, b.cup_id, 1)
    on conflict (uid, cup_id) do update set count = throne_wins.count + 1, won_at = now();
  end if;

  update public.cup_brackets
     set status = 'FINISHED', finished_at = now(), winner_uid = f.winner_uid,
         runner_up_uid = v_runner, prize_paid = v_pay
   where id = p_bracket;
end $$;
revoke all on function public.cup_settle(uuid) from public, anon, authenticated;
revoke execute on function public.cup_top_bot_prize_cap() from public, anon;
