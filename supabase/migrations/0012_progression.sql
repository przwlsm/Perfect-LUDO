-- Progression: XP and levels, gems, rebalanced match rewards (online pays
-- far more than the computer, and online results are verified from the
-- server's own match record), the daily lucky spin, daily missions, the
-- monthly season pass and the weekly tournament. Apply after 0011.
--
-- Everything here is server-owned, like the wallet in 0007: clients call
-- functions, never write these tables, and every grant is idempotent.

alter table public.profiles add column if not exists xp int not null default 0 check (xp >= 0);
alter table public.profiles add column if not exists gems int not null default 20 check (gems >= 0);
alter table public.profiles add column if not exists spin_streak int not null default 0 check (spin_streak >= 0);
alter table public.profiles add column if not exists last_spin date;

-- The new columns are server-owned like the rest of the wallet (0007 only
-- granted display_name to clients, and that still holds).

-- ---------------------------------------------------------------------------
-- Levels
-- ---------------------------------------------------------------------------

-- Level L needs 100 + 40*(L-1) XP to reach L+1.
create or replace function public.level_info(p_xp int) returns jsonb
language plpgsql immutable as $$
declare
  v_level int := 1;
  v_need int := 100;
  v_rest int := greatest(coalesce(p_xp, 0), 0);
begin
  while v_rest >= v_need loop
    v_rest := v_rest - v_need;
    v_level := v_level + 1;
    v_need := 100 + 40 * (v_level - 1);
  end loop;
  return jsonb_build_object('level', v_level, 'into', v_rest, 'need', v_need);
end $$;

-- Months since September 2026, starting at season 1.
create or replace function public.current_season() returns int
language sql stable as $$
  select ((extract(year from now() at time zone 'utc')::int * 12
          + extract(month from now() at time zone 'utc')::int)
          - (2026 * 12 + 9)) + 1;
$$;

create table if not exists public.season_progress (
  uid             uuid not null references auth.users (id) on delete cascade,
  season          int not null,
  xp              int not null default 0 check (xp >= 0),
  premium         boolean not null default false,
  free_claimed    int[] not null default '{}',
  premium_claimed int[] not null default '{}',
  primary key (uid, season)
);
alter table public.season_progress enable row level security;
drop policy if exists "read own season" on public.season_progress;
create policy "read own season" on public.season_progress for select
  using ((select auth.uid()) = uid);

-- Adds XP to the account and the current season, paying level-up rewards
-- (coins, and gems: 5 per level, 20 more every fifth level).
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
  update public.profiles set xp = xp + p_amount where uid = p_uid returning xp into v_after;
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

-- ---------------------------------------------------------------------------
-- Daily missions
-- ---------------------------------------------------------------------------

create table if not exists public.missions (
  id     text primary key,
  title  text not null,
  event  text not null,
  target int not null check (target > 0),
  coins  int not null default 0,
  xp     int not null default 0,
  gems   int not null default 0
);
alter table public.missions enable row level security;
drop policy if exists "missions are public" on public.missions;
create policy "missions are public" on public.missions for select using (true);

insert into public.missions (id, title, event, target, coins, xp, gems) values
  ('play-3',          'Play 3 games',                'game',        3, 150, 40, 0),
  ('win-online-1',    'Win an online match',         'win_online',  1, 300, 60, 5),
  ('online-2',        'Finish 2 online matches',     'online',      2, 200, 50, 0),
  ('beat-bot-2',      'Beat the computer twice',     'win_bot',     2, 120, 40, 0),
  ('sixes-5',         'Roll five sixes',             'six',         5, 100, 30, 0),
  ('capture-3',       'Capture 3 coins',             'capture',     3, 150, 40, 2),
  ('home-4',          'Bring 4 coins home',          'home',        4, 120, 30, 0),
  ('spin-1',          'Spin the lucky wheel',        'spin',        1,  50, 20, 0)
on conflict (id) do update set
  title = excluded.title, event = excluded.event, target = excluded.target,
  coins = excluded.coins, xp = excluded.xp, gems = excluded.gems;

create table if not exists public.mission_progress (
  uid        uuid not null references auth.users (id) on delete cascade,
  day        date not null,
  mission_id text not null references public.missions (id),
  progress   int not null default 0 check (progress >= 0),
  claimed    boolean not null default false,
  primary key (uid, day, mission_id)
);
alter table public.mission_progress enable row level security;
drop policy if exists "read own missions" on public.mission_progress;
create policy "read own missions" on public.mission_progress for select
  using ((select auth.uid()) = uid);

create or replace function public.utc_today() returns date
language sql stable as $$ select (now() at time zone 'utc')::date $$;

-- Three missions a day per player, the same all day, different per player.
create or replace function public.todays_missions(p_uid uuid) returns setof public.missions
language sql stable security definer set search_path = public, pg_temp as $$
  select m.* from public.missions m
   order by md5(p_uid::text || public.utc_today()::text || m.id)
   limit 3;
$$;
revoke all on function public.todays_missions(uuid) from public, anon, authenticated;

create or replace function public.bump_mission(p_uid uuid, p_event text, p_amount int) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_mission public.missions;
begin
  if coalesce(p_amount, 0) <= 0 then return; end if;
  for v_mission in select * from public.todays_missions(p_uid) where event = p_event loop
    insert into public.mission_progress (uid, day, mission_id, progress)
    values (p_uid, public.utc_today(), v_mission.id, least(v_mission.target, p_amount))
    on conflict (uid, day, mission_id) do update
      set progress = least(v_mission.target, mission_progress.progress + p_amount);
  end loop;
end $$;
revoke all on function public.bump_mission(uuid, text, int) from public, anon, authenticated;

create or replace function public.missions_json(p_uid uuid) returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', m.id, 'title', m.title, 'target', m.target,
      'progress', coalesce(mp.progress, 0), 'claimed', coalesce(mp.claimed, false),
      'coins', m.coins, 'xp', m.xp, 'gems', m.gems
    ) order by m.id), '[]'::jsonb)
  from public.todays_missions(p_uid) m
  left join public.mission_progress mp
    on mp.uid = p_uid and mp.day = public.utc_today() and mp.mission_id = m.id;
$$;
revoke all on function public.missions_json(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Weekly tournament
-- ---------------------------------------------------------------------------

create or replace function public.current_week() returns date
language sql stable as $$ select date_trunc('week', now() at time zone 'utc')::date $$;

create table if not exists public.tournament_scores (
  uid    uuid not null references auth.users (id) on delete cascade,
  week   date not null,
  points int not null default 0 check (points >= 0),
  wins   int not null default 0 check (wins >= 0),
  games  int not null default 0 check (games >= 0),
  updated_at timestamptz not null default now(),
  primary key (uid, week)
);
create index if not exists tournament_scores_rank on public.tournament_scores (week, points desc, updated_at);
alter table public.tournament_scores enable row level security;
-- No policies: the leaderboard is read through get_tournament, which only
-- exposes public profile fields.

create table if not exists public.tournament_claims (
  uid  uuid not null references auth.users (id) on delete cascade,
  week date not null,
  primary key (uid, week)
);
alter table public.tournament_claims enable row level security;

-- ---------------------------------------------------------------------------
-- Wallet snapshot, now with gems, level and XP
-- ---------------------------------------------------------------------------

create or replace function public.wallet_json(p_uid uuid) returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'coins', p.coins,
    'gems', p.gems,
    'xp', p.xp,
    'level', public.level_info(p.xp),
    'lastGift', p.last_gift,
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

-- ---------------------------------------------------------------------------
-- Match rewards
-- ---------------------------------------------------------------------------

-- Games against the computer (and pass & play). The result is the client's
-- word, so the pay is small and capped: at most 25 paid games a day.
drop function if exists public.award_match(text, boolean, boolean);
create or replace function public.award_match(
  p_match_id text,
  p_won boolean,
  p_eligible boolean,
  p_sixes int default 0,
  p_captures int default 0,
  p_home int default 0
) returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid;
  v_reward int := 0;
  v_paid_today int;
begin
  if p_match_id is null or char_length(p_match_id) not between 1 and 64 or p_match_id like 'online:%' then
    raise exception 'Invalid match id.' using errcode = '22023';
  end if;
  v_uid := public.lock_wallet();
  if exists (select 1 from public.profile_rewards where uid = v_uid and match_id = p_match_id) then
    return public.wallet_json(v_uid);
  end if;
  select count(*) into v_paid_today from public.profile_rewards
   where uid = v_uid and coins > 0 and match_id not like 'online:%'
     and created_at >= (public.utc_today())::timestamp at time zone 'utc';
  if coalesce(p_eligible, false) and v_paid_today < 25 then
    v_reward := case when p_won then 50 else 15 end;
  end if;
  update public.profiles
     set games_played = games_played + 1,
         games_won    = games_won + (case when p_won then 1 else 0 end),
         streak       = case when p_won then streak + 1 else 0 end,
         best_streak  = greatest(best_streak, case when p_won then streak + 1 else 0 end),
         coins        = coins + v_reward
   where uid = v_uid;
  insert into public.profile_rewards (uid, match_id, coins, won)
    values (v_uid, p_match_id, v_reward, coalesce(p_won, false));
  perform public.grant_xp(v_uid, case when coalesce(p_eligible, false)
                                      then (case when p_won then 40 else 15 end) else 10 end);
  perform public.bump_mission(v_uid, 'game', 1);
  if p_won and coalesce(p_eligible, false) then perform public.bump_mission(v_uid, 'win_bot', 1); end if;
  -- Per-match counts come from the client; bounded so one game cannot finish a mission alone.
  perform public.bump_mission(v_uid, 'six', least(greatest(coalesce(p_sixes, 0), 0), 8));
  perform public.bump_mission(v_uid, 'capture', least(greatest(coalesce(p_captures, 0), 0), 6));
  perform public.bump_mission(v_uid, 'home', least(greatest(coalesce(p_home, 0), 0), 4));
  return public.wallet_json(v_uid);
end $$;
revoke execute on function public.award_match(text, boolean, boolean, int, int, int) from public, anon;
grant execute on function public.award_match(text, boolean, boolean, int, int, int) to authenticated;

-- Online matches: the server reads its own record of the match. A win pays
-- 250 coins and 120 XP, finishing 60 and 50; a player who walked out of an
-- abandoned match gets nothing, the rest are paid as finishers. Also scores
-- the weekly tournament (3 points a win, 1 a game).
create or replace function public.award_online_for(p_uid uuid, p_match_id uuid) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_match public.matches;
  v_seat int;
  v_key text := 'online:' || p_match_id::text;
  v_won boolean;
  v_coins int;
  v_xp int;
begin
  select * into v_match from public.matches where id = p_match_id;
  if not found or v_match.status not in ('FINISHED', 'ABANDONED') then return; end if;
  select seat_index into v_seat from public.match_players where match_id = p_match_id and user_id = p_uid;
  if v_seat is null then return; end if;
  if exists (select 1 from public.profile_rewards where uid = p_uid and match_id = v_key) then return; end if;
  if v_match.status = 'ABANDONED' and v_match.abandoned_by = p_uid then
    insert into public.profile_rewards (uid, match_id, coins, won) values (p_uid, v_key, 0, false);
    return;
  end if;
  v_won := v_match.status = 'FINISHED' and v_match.winner_seat = v_seat;
  v_coins := case when v_won then 250 else 60 end;
  v_xp := case when v_won then 120 else 50 end;
  update public.profiles
     set games_played = games_played + 1,
         games_won    = games_won + (case when v_won then 1 else 0 end),
         streak       = case when v_won then streak + 1 else 0 end,
         best_streak  = greatest(best_streak, case when v_won then streak + 1 else 0 end),
         coins        = coins + v_coins
   where uid = p_uid;
  insert into public.profile_rewards (uid, match_id, coins, won) values (p_uid, v_key, v_coins, v_won);
  perform public.grant_xp(p_uid, v_xp);
  perform public.bump_mission(p_uid, 'game', 1);
  perform public.bump_mission(p_uid, 'online', 1);
  if v_won then perform public.bump_mission(p_uid, 'win_online', 1); end if;
  insert into public.tournament_scores (uid, week, points, wins, games)
  values (p_uid, public.current_week(), case when v_won then 3 else 1 end, case when v_won then 1 else 0 end, 1)
  on conflict (uid, week) do update set
    points = tournament_scores.points + excluded.points,
    wins = tournament_scores.wins + excluded.wins,
    games = tournament_scores.games + 1,
    updated_at = now();
end $$;
revoke all on function public.award_online_for(uuid, uuid) from public, anon, authenticated;

-- Who walked out, so an abandoned match can be settled fairly.
alter table public.matches add column if not exists abandoned_by uuid references auth.users (id) on delete set null;
create or replace function public.abandon_match(p_match_id uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := public.require_uid(); changed int;
begin
  if not public.is_match_member(p_match_id) then raise exception 'You are not in that match.' using errcode='42501'; end if;
  update public.matches set status='ABANDONED',finished_at=now(),version=version+1,abandoned_by=uid
    where id=p_match_id and status='IN_PROGRESS';
  get diagnostics changed = row_count;
  if changed>0 then
    insert into public.notifications(user_id,type,title,message,related_lobby_id)
    select mp.user_id,'CHALLENGE_CANCELLED','Game ended',public.display_of(uid)||' left the game.',m.lobby_id
      from public.match_players mp join public.matches m on m.id=mp.match_id
      where mp.match_id=p_match_id and mp.user_id<>uid;
  end if;
  return public.match_snapshot(p_match_id);
end $$;
revoke execute on function public.abandon_match(uuid) from public,anon;
grant execute on function public.abandon_match(uuid) to authenticated;

create or replace function public.award_online_match(p_match_id uuid, p_sixes int default 0, p_captures int default 0, p_home int default 0)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := public.lock_wallet();
  v_new boolean;
begin
  if not exists (select 1 from public.match_players where match_id = p_match_id and user_id = v_uid) then
    raise exception 'You are not in that match.' using errcode = '42501';
  end if;
  v_new := not exists (select 1 from public.profile_rewards where uid = v_uid and match_id = 'online:' || p_match_id::text);
  perform public.award_online_for(v_uid, p_match_id);
  if v_new and exists (select 1 from public.profile_rewards where uid = v_uid and match_id = 'online:' || p_match_id::text) then
    perform public.bump_mission(v_uid, 'six', least(greatest(coalesce(p_sixes, 0), 0), 8));
    perform public.bump_mission(v_uid, 'capture', least(greatest(coalesce(p_captures, 0), 0), 6));
    perform public.bump_mission(v_uid, 'home', least(greatest(coalesce(p_home, 0), 0), 4));
  end if;
  return public.wallet_json(v_uid);
end $$;
revoke execute on function public.award_online_match(uuid, int, int, int) from public, anon;
grant execute on function public.award_online_match(uuid, int, int, int) to authenticated;

-- Loading the wallet also pays any online match the player finished but
-- never collected (the app was closed on the results screen, say).
create or replace function public.get_wallet() returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := public.require_member_uid();
  v_match uuid;
begin
  if not exists (select 1 from public.profiles where uid = v_uid) then
    perform public.ensure_social_identity();
  end if;
  for v_match in
    select m.id from public.matches m
      join public.match_players mp on mp.match_id = m.id and mp.user_id = v_uid
     where m.status in ('FINISHED', 'ABANDONED') and m.finished_at > now() - interval '7 days'
       and not exists (select 1 from public.profile_rewards r
                        where r.uid = v_uid and r.match_id = 'online:' || m.id::text)
  loop
    perform public.award_online_for(v_uid, v_match);
  end loop;
  return public.wallet_json(v_uid);
end $$;
revoke execute on function public.get_wallet() from public, anon;
grant execute on function public.get_wallet() to authenticated;

-- ---------------------------------------------------------------------------
-- Daily lucky spin
-- ---------------------------------------------------------------------------

create table if not exists public.daily_spins (
  uid   uuid not null references auth.users (id) on delete cascade,
  day   date not null,
  spins int not null default 0 check (spins >= 0),
  primary key (uid, day)
);
alter table public.daily_spins enable row level security;
drop policy if exists "read own spins" on public.daily_spins;
create policy "read own spins" on public.daily_spins for select using ((select auth.uid()) = uid);

-- One free spin a day; up to three more for 10 gems each. The seventh day
-- in a row adds a 25-gem streak bonus. The wheel's odds live here.
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
  if v_roll < 30 then v_kind := 'coins'; v_amount := 100; v_slot := 0;
  elsif v_roll < 55 then v_kind := 'coins'; v_amount := 250; v_slot := 1;
  elsif v_roll < 70 then v_kind := 'coins'; v_amount := 500; v_slot := 2;
  elsif v_roll < 75 then v_kind := 'coins'; v_amount := 1000; v_slot := 3;
  elsif v_roll < 87 then v_kind := 'gems'; v_amount := 5; v_slot := 4;
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
-- Missions, season pass and tournament: read and claim
-- ---------------------------------------------------------------------------

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

create or replace function public.claim_mission(p_mission_id text) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := public.lock_wallet();
  v_mission public.missions;
  v_progress public.mission_progress;
begin
  select m.* into v_mission from public.todays_missions(v_uid) m where m.id = p_mission_id;
  if not found then raise exception 'That mission is not one of today''s.' using errcode = 'P0002'; end if;
  select * into v_progress from public.mission_progress
   where uid = v_uid and day = public.utc_today() and mission_id = p_mission_id for update;
  if not found or v_progress.progress < v_mission.target then
    raise exception 'Finish the mission first.' using errcode = 'P0001';
  end if;
  if v_progress.claimed then return public.get_rewards(); end if;
  update public.mission_progress set claimed = true
   where uid = v_uid and day = public.utc_today() and mission_id = p_mission_id;
  update public.profiles set coins = coins + v_mission.coins, gems = gems + v_mission.gems where uid = v_uid;
  perform public.grant_xp(v_uid, v_mission.xp);
  return public.get_rewards();
end $$;
revoke execute on function public.claim_mission(text) from public, anon;
grant execute on function public.claim_mission(text) to authenticated;

-- 30 tiers, 150 season XP each. Free: coins every tier, gems every fifth.
-- Premium: more coins and gems on every tier.
create or replace function public.season_tier_reward(p_tier int, p_premium boolean) returns jsonb
language sql immutable as $$
  select case when p_premium
    then jsonb_build_object('coins', 150 + 15 * p_tier, 'gems', case when p_tier % 5 = 0 then 40 else 8 end)
    else jsonb_build_object('coins', 80 + 10 * p_tier, 'gems', case when p_tier % 5 = 0 then 15 else 0 end)
  end;
$$;

create or replace function public.buy_season_premium() returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := public.lock_wallet();
  v_season int := public.current_season();
begin
  if exists (select 1 from public.season_progress where uid = v_uid and season = v_season and premium) then
    return public.get_rewards();
  end if;
  if (select gems from public.profiles where uid = v_uid) < 250 then
    raise exception 'The premium pass costs 250 gems.' using errcode = 'P0001';
  end if;
  update public.profiles set gems = gems - 250 where uid = v_uid;
  insert into public.season_progress (uid, season, premium) values (v_uid, v_season, true)
  on conflict (uid, season) do update set premium = true;
  return public.get_rewards();
end $$;
revoke execute on function public.buy_season_premium() from public, anon;
grant execute on function public.buy_season_premium() to authenticated;

create or replace function public.claim_season_tier(p_tier int, p_premium boolean) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := public.lock_wallet();
  v_season int := public.current_season();
  v_sp public.season_progress;
  v_reward jsonb;
begin
  if p_tier is null or p_tier not between 1 and 30 then
    raise exception 'There is no such tier.' using errcode = '22023';
  end if;
  insert into public.season_progress (uid, season) values (v_uid, v_season) on conflict do nothing;
  select * into v_sp from public.season_progress where uid = v_uid and season = v_season for update;
  if v_sp.xp < p_tier * 150 then
    raise exception 'Earn more season XP to reach that tier.' using errcode = 'P0001';
  end if;
  if p_premium and not v_sp.premium then
    raise exception 'That reward is on the premium pass.' using errcode = 'P0001';
  end if;
  if (p_premium and p_tier = any(v_sp.premium_claimed)) or (not p_premium and p_tier = any(v_sp.free_claimed)) then
    return public.get_rewards();
  end if;
  v_reward := public.season_tier_reward(p_tier, p_premium);
  if p_premium then
    update public.season_progress set premium_claimed = premium_claimed || p_tier where uid = v_uid and season = v_season;
  else
    update public.season_progress set free_claimed = free_claimed || p_tier where uid = v_uid and season = v_season;
  end if;
  update public.profiles
     set coins = coins + (v_reward ->> 'coins')::int, gems = gems + (v_reward ->> 'gems')::int
   where uid = v_uid;
  return public.get_rewards();
end $$;
revoke execute on function public.claim_season_tier(int, boolean) from public, anon;
grant execute on function public.claim_season_tier(int, boolean) to authenticated;

-- Prize for a finishing rank: 1st, 2nd-3rd, 4th-10th, 11th-50th, anyone who played.
create or replace function public.tournament_prize(p_rank int) returns jsonb
language sql immutable as $$
  select case
    when p_rank = 1 then jsonb_build_object('coins', 3000, 'gems', 60)
    when p_rank <= 3 then jsonb_build_object('coins', 1500, 'gems', 30)
    when p_rank <= 10 then jsonb_build_object('coins', 800, 'gems', 15)
    when p_rank <= 50 then jsonb_build_object('coins', 300, 'gems', 5)
    else jsonb_build_object('coins', 100, 'gems', 0)
  end;
$$;

create or replace function public.tournament_rank(p_uid uuid, p_week date) returns int
language sql stable security definer set search_path = public, pg_temp as $$
  select r.rank::int from (
    select uid, rank() over (order by points desc, updated_at asc) as rank
      from public.tournament_scores where week = p_week and points > 0
  ) r where r.uid = p_uid;
$$;
revoke all on function public.tournament_rank(uuid, date) from public, anon, authenticated;

create or replace function public.get_tournament() returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := public.require_uid();
  v_week date := public.current_week();
  v_last date := public.current_week() - 7;
  v_mine public.tournament_scores;
  v_last_rank int;
begin
  select * into v_mine from public.tournament_scores where uid = v_uid and week = v_week;
  v_last_rank := public.tournament_rank(v_uid, v_last);
  return jsonb_build_object(
    'week', v_week,
    'endsAt', (v_week + 7)::timestamp at time zone 'utc',
    'top', coalesce((
      select jsonb_agg(jsonb_build_object(
          'rank', t.rank, 'userId', t.uid, 'points', t.points, 'wins', t.wins,
          'username', p.username, 'displayName', p.display_name, 'avatar', p.avatar
        ) order by t.rank)
      from (
        select uid, points, wins, rank() over (order by points desc, updated_at asc) as rank
          from public.tournament_scores where week = v_week and points > 0
         order by points desc, updated_at asc limit 50
      ) t join public.profiles p on p.uid = t.uid
    ), '[]'::jsonb),
    'me', jsonb_build_object(
      'points', coalesce(v_mine.points, 0), 'wins', coalesce(v_mine.wins, 0),
      'games', coalesce(v_mine.games, 0), 'rank', public.tournament_rank(v_uid, v_week)
    ),
    'lastWeek', case when v_last_rank is null then null else jsonb_build_object(
      'week', v_last, 'rank', v_last_rank, 'prize', public.tournament_prize(v_last_rank),
      'claimed', exists (select 1 from public.tournament_claims where uid = v_uid and week = v_last)
    ) end
  );
end $$;
revoke execute on function public.get_tournament() from public, anon;
grant execute on function public.get_tournament() to authenticated;

create or replace function public.claim_tournament_prize() returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := public.lock_wallet();
  v_last date := public.current_week() - 7;
  v_rank int := public.tournament_rank(v_uid, v_last);
  v_prize jsonb;
begin
  if v_rank is null then
    raise exception 'You did not play in last week''s tournament.' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.tournament_claims where uid = v_uid and week = v_last) then
    return public.get_tournament();
  end if;
  v_prize := public.tournament_prize(v_rank);
  insert into public.tournament_claims (uid, week) values (v_uid, v_last);
  update public.profiles
     set coins = coins + (v_prize ->> 'coins')::int, gems = gems + (v_prize ->> 'gems')::int
   where uid = v_uid;
  return public.get_tournament();
end $$;
revoke execute on function public.claim_tournament_prize() from public, anon;
grant execute on function public.claim_tournament_prize() to authenticated;
