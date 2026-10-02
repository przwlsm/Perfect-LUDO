-- 0020: rewarded ads. Apply after 0019.
--
-- Every placement is opt-in: the player taps "watch an ad" and the client
-- reports the finished view. The server cannot verify the view itself (no
-- SSV callback yet), so like bot-game rewards each grant is small and capped
-- per day: 5 single gems, 2 free extra spins, and one +300 top-up of an
-- already-claimed rescue. Worst-case daily forgery is bounded and harmless.
-- Caps mirror AD_REWARD_CAPS in src/domain/entities/Progression.ts.

create table if not exists public.ad_rewards (
  uid   uuid not null references auth.users (id) on delete cascade,
  day   date not null,
  kind  text not null check (kind in ('gem', 'spin', 'rescue-boost')),
  count int  not null default 0 check (count >= 0),
  primary key (uid, day, kind)
);
alter table public.ad_rewards enable row level security;
revoke all on public.ad_rewards from public, anon, authenticated;

alter table public.daily_spins add column if not exists ad_spins int not null default 0 check (ad_spins >= 0);

create or replace function public.claim_ad_reward(p_kind text) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := public.lock_wallet();
  v_today date := public.utc_today();
  v_count int;
  v_cap int;
  v_rescued date;
begin
  v_cap := case p_kind when 'gem' then 5 when 'spin' then 2 when 'rescue-boost' then 1 else null end;
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
    update public.profiles set coins = coins + 300 where uid = v_uid;
  end if;
  -- 'spin' grants a credit that spin_daily consumes instead of gems.
  return public.wallet_json(v_uid);
end $$;
revoke execute on function public.claim_ad_reward(text) from public, anon;
grant execute on function public.claim_ad_reward(text) to authenticated;

-- Same wheel as 0019, but an extra spin consumes an unused ad credit before
-- it charges gems.
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
  if v_spins >= 1 then
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

-- The rewards snapshot now says how many ad rewards were used today, so the
-- client can show what is left of each cap.
create or replace function public.get_rewards() returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := public.require_member_uid();
  v_season int := public.current_season();
  v_sp public.season_progress;
  v_spins int;
begin
  if not exists (select 1 from public.profiles where uid = v_uid) then
    perform public.ensure_social_identity();
  end if;
  select * into v_sp from public.season_progress where uid = v_uid and season = v_season;
  select spins into v_spins from public.daily_spins where uid = v_uid and day = public.utc_today();
  return jsonb_build_object(
    'missions', public.missions_json(v_uid),
    'missionsResetAt', ((public.utc_today() + 1)::timestamp at time zone 'utc'),
    'spinsToday', coalesce(v_spins, 0),
    'ads', coalesce(
      (select jsonb_object_agg(r.kind, r.count) from public.ad_rewards r
        where r.uid = v_uid and r.day = public.utc_today()),
      '{}'::jsonb),
    'season', jsonb_build_object(
      'number', v_season,
      'endsAt', (date_trunc('month', now() at time zone 'utc') + interval '1 month') at time zone 'utc',
      'xp', coalesce(v_sp.xp, 0),
      'premium', coalesce(v_sp.premium, false),
      'freeClaimed', to_jsonb(coalesce(v_sp.free_claimed, '{}')),
      'premiumClaimed', to_jsonb(coalesce(v_sp.premium_claimed, '{}'))
    ),
    'wallet', public.wallet_json(v_uid)
  );
end $$;
revoke execute on function public.get_rewards() from public, anon;
grant execute on function public.get_rewards() to authenticated;
